import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  buildCookie,
  decodeJson,
  setStoredTokenCookie,
  type RemoteOAuthState,
  type RemoteStoredToken,
} from '@/lib/remoteMcpAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const state = url.searchParams.get('state') || '';
  const code = url.searchParams.get('code') || '';
  const error = url.searchParams.get('error');
  const stateCookie = req.cookies.get(OAUTH_STATE_COOKIE)?.value || '';
  const saved = decodeJson<RemoteOAuthState>(stateCookie);

  const complete = (params: Record<string, string>, token?: RemoteStoredToken) => {
    const payload = JSON.stringify({ type: 'sameer-remote-mcp-connected', ...params }).replace(/</g, '\\u003c');
    const html = '<!doctype html><html><body><script>' +
      'const message=' + JSON.stringify(payload) + ';' +
      'try{if(window.opener)window.opener.postMessage(JSON.parse(message),window.location.origin);}catch(e){}' +
      'window.close();setTimeout(()=>{document.body.textContent="Authentication complete. You can close this window.";},150);' +
      '</script></body></html>';
    const response = new NextResponse(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
    });
    if (token) setStoredTokenCookie(response, params.connectorId, saved!.serverUrl, token);
    response.headers.append('Set-Cookie', `${OAUTH_STATE_COOKIE}=; ${buildCookie(0)}`);
    return response;
  };

  if (!saved || !state || state !== saved.state) return complete({ status: 'error', message: 'OAuth state validation failed.' });
  if (error) return complete({ status: 'error', connectorId: saved.connectorId, error: url.searchParams.get('error_description') || error });
  if (!code) return complete({ status: 'error', connectorId: saved.connectorId, error: 'OAuth authorization code was not returned.' });
  try {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: saved.redirectUri,
      client_id: String(saved.clientId || ''),
      code_verifier: saved.codeVerifier,
    });
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    if (saved.clientSecret) {
      form.delete('client_id');
      headers.Authorization = 'Basic ' + Buffer.from(String(saved.clientId) + ':' + saved.clientSecret).toString('base64');
    }
    const response = await fetch(String(saved.tokenEndpoint || ''), {
      method: 'POST',
      headers,
      body: form.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
    const data: any = await response.json().catch(() => ({}));
    if (!response.ok || !data?.access_token) throw new Error(data?.error_description || data?.error || `OAuth token exchange failed (${response.status}).`);

    const token: RemoteStoredToken = {
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
      tokenType: data.token_type || 'Bearer',
      expiresAt: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : undefined,
      scope: data.scope || undefined,
      clientId: saved.clientId,
      clientSecret: saved.clientSecret,
      tokenEndpoint: saved.tokenEndpoint,
      resource: saved.resource,
    };

    return complete({ status: 'success', connectorId: saved.connectorId, connectorName: saved.name }, token);
  } catch (err: any) {
    return complete({ status: 'error', connectorId: saved.connectorId, error: String(err?.message || 'OAuth token exchange failed.') });
  }
}