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

    const response = redirectToApp(req, connectorId, 'connected', getProviderAccountLabel(stored));
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
