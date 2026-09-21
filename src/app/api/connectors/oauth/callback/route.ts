import { NextRequest, NextResponse } from 'next/server';
import {
  connectionCookieOptions,
  exchangeOAuthCode,
  fetchConnectorAccount,
  getDirectOAuthConfig,
  getProviderAccountLabel,
  parseOAuthStateCookie,
  sealConnection,
} from '@/lib/connectorAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function redirectToApp(req: NextRequest, connectorId: string, connection: string, reason?: string) {
  const url = new URL('/', req.url);
  url.searchParams.set('connector', connectorId);
  url.searchParams.set('connection', connection);
  if (reason) url.searchParams.set('reason', reason.slice(0, 180));
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const params = url.searchParams;
  const state = String(params.get('state') || '');
  const code = String(params.get('code') || '');
  const oauthError = String(params.get('error') || '');
  const cookies = req.cookies;

  const stateCookie = parseOAuthStateCookie(cookies.get('sameer_connector_oauth_state')?.value);
  const connectorId = stateCookie?.connectorId || String(params.get('connector') || '');

  if (!connectorId) return redirectToApp(req, 'unknown', 'error', 'Missing connector state.');
  if (oauthError) return redirectToApp(req, connectorId, 'cancelled', params.get('error_description') || oauthError);
  if (!state || !code) return redirectToApp(req, connectorId, 'error', 'Missing OAuth authorization code.');

  if (!stateCookie || stateCookie.state !== state || stateCookie.connectorId !== connectorId) {
    return redirectToApp(req, connectorId, 'error', 'OAuth state validation failed.');
  }

  const config = getDirectOAuthConfig(connectorId);
  if (!config) return redirectToApp(req, connectorId, 'error', 'This connector does not have a direct OAuth adapter yet.');

  try {
    const redirectUri = new URL('/api/connectors/oauth/callback', url.origin).toString();
    const connection = await exchangeOAuthCode(connectorId, code, redirectUri);
    if (!connection.accessToken) throw new Error('OAuth provider returned no access token.');

    const account = await fetchConnectorAccount(connectorId, connection.accessToken, connection.account);
    const stored = {
      ...connection,
      account,
    };

    const label = getProviderAccountLabel(stored);
    const displayLabel = label
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
    const safeMessage = JSON.stringify({
      type: 'sameer-connector-connected',
      connector: connectorId,
      account: displayLabel,
    });
    const safeOrigin = JSON.stringify(url.origin);
    const safeHome = JSON.stringify(new URL('/', url.origin).toString());
    const html =
      '<!doctype html><html><head><meta charset="utf-8"><title>Connector connected</title></head>' +
      '<body style="font-family:system-ui,sans-serif;background:#181714;color:#f2eee6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
      '<div style="text-align:center"><h2>Connector connected</h2><p>' +
      (displayLabel ? 'Account: ' + displayLabel : 'Authentication completed successfully.') +
      '</p><p>This window can close automatically.</p></div>' +
      '<script>' +
      '(function(){var message=' + safeMessage + ';var origin=' + safeOrigin + ';try{if(window.opener){window.opener.postMessage(message,origin);}}catch(_){}' +
      'setTimeout(function(){try{window.close();}catch(_){}setTimeout(function(){if(!window.opener||!window.closed){window.location.replace(' + safeHome + ');}},250);},400);})();' +
      '</script></body></html>';

    const response = new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'no-store',
      },
    });
    response.cookies.set(
      'sameer_connector_oauth_state',
      '',
      { ...connectionCookieOptions(), maxAge: 0 }
    );
    response.cookies.set(
      'sameer_connector_' + connectorId.replace(/[^a-zA-Z0-9_-]/g, '_'),
      sealConnection(stored),
      connectionCookieOptions()
    );
    return response;
  } catch (error: any) {
    return redirectToApp(req, connectorId, 'error', error?.message || 'OAuth connection failed.');
  }
}
