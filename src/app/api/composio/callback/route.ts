import { NextRequest, NextResponse } from 'next/server';
import { exchangeMcpCode } from '@/lib/composioMcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string): string {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get('code');
  const callbackState = String(url.searchParams.get('state') || '');
  const expectedState = req.cookies.get('composio_pkce_state')?.value || '';
  const sessionUri = String(url.searchParams.get('session_uri') || '');
  const callbackAccountId = String(url.searchParams.get('connected_account_id') || '');
  const callbackUserId = String(url.searchParams.get('user_id') || '');
  const statusParam = String(url.searchParams.get('status') || '').toLowerCase();
  const errorText = String(
    url.searchParams.get('error') ||
    url.searchParams.get('error_description') ||
    ''
  );

  const origin = JSON.stringify(url.origin);
  const home = JSON.stringify(new URL('/', url.origin).toString());

  // 1. Handle Composio "For You" MCP OAuth 2.0 PKCE Callback
  if (code) {
    // Bind the callback to the browser that started the OAuth flow.
    if (!callbackState || !expectedState || callbackState !== expectedState) {
      return new NextResponse('Invalid OAuth state.', {
        status: 400,
        headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
      });
    }
    const verifier = req.cookies.get('composio_pkce_verifier')?.value || '';
    const exchange = await exchangeMcpCode(code, verifier, url.origin);

    if (exchange.success && exchange.tokens?.access_token) {
      const message = JSON.stringify({
        type: 'sameer-composio-mcp-connected',
        status: 'success',
        provider: 'composio_for_you',
        message: 'Successfully authenticated with Composio For You MCP!',
      });

      const html =
        '<!doctype html><html><head><meta charset="utf-8"><title>Composio Connected</title></head>' +
        '<body style="font-family:system-ui,-apple-system,sans-serif;background:#181714;color:#f2eee6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
        '<div style="text-align:center;padding:32px;max-width:560px">' +
        '<div style="width:48px;height:48px;margin:0 auto 16px;border-radius:12px;background:#2a2722;border:1px solid #38352d;display:flex;align-items:center;justify-content:center;color:#cc785c;font-size:24px">⚡</div>' +
        '<h2 style="margin:0 0 12px;font-size:20px;font-weight:600">Composio "For You" Connected</h2>' +
        '<p style="color:#aaa49a;line-height:1.6;font-size:14px">Your personal Composio MCP account is now connected and ready for actions.</p>' +
        '</div>' +
        '<script>' +
        '(function(){var message=' + message + ';try{if(window.opener){window.opener.postMessage(message,' + origin + ');}}catch(e){}' +
        'setTimeout(function(){try{window.close();}catch(e){}setTimeout(function(){if(!window.opener||!window.closed){window.location.replace(' + home + ');}},250);},600);})();' +
        '</script></body></html>';

      const response = new NextResponse(html, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      });

      // Store AuthKit JWT in HttpOnly cookie
      response.cookies.set('composio_mcp_token', exchange.tokens.access_token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 3600,
      });

      // Access/refresh tokens remain server-side in HttpOnly cookies. The browser
      // only receives a non-secret connection status signal.
      response.cookies.set('composio_mcp_access_token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 0,
      });

      if (exchange.tokens.refresh_token) {
        response.cookies.set('composio_mcp_refresh_token', exchange.tokens.refresh_token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 90 * 24 * 3600,
        });
      }

      // Public status cookie for immediate UI awareness
      response.cookies.set('composio_mcp_connected', 'true', {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 30 * 24 * 3600,
      });

      // Clear PKCE cookies
      response.cookies.set('composio_pkce_verifier', '', { path: '/', maxAge: 0 });
      response.cookies.set('composio_pkce_state', '', { path: '/', maxAge: 0 });

      return response;
    } else {
      const errMsg = exchange.error || 'Failed to exchange authorization code for Composio access token.';
      const failMessage = JSON.stringify({
        type: 'sameer-composio-mcp-connected',
        status: 'failed',
        error: errMsg,
      });

      const html =
        '<!doctype html><html><head><meta charset="utf-8"><title>Connection Failed</title></head>' +
        '<body style="font-family:system-ui,-apple-system,sans-serif;background:#181714;color:#f2eee6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0">' +
        '<div style="text-align:center;padding:32px;max-width:560px">' +
        '<h2 style="margin:0 0 12px;color:#ef4444">Connection Failed</h2>' +
        '<p style="color:#aaa49a;line-height:1.6">' + escapeHtml(errMsg) + '</p>' +
        '</div>' +
        '<script>' +
        '(function(){var message=' + failMessage + ';try{if(window.opener){window.opener.postMessage(message,' + origin + ');}}catch(e){}' +
        'setTimeout(function(){try{window.close();}catch(e){}},3000);})();' +
        '</script></body></html>';

      return new NextResponse(html, {
        status: 400,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
      });
    }
  }

  // 2. Reject non-MCP callbacks - Composio "For You" MCP is the sole connection protocol
  return new NextResponse('Invalid callback request: authorization code missing.', {
    status: 400,
    headers: { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store' },
  });
}

