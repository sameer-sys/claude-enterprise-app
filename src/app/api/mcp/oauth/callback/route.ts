import { NextRequest, NextResponse } from 'next/server';
import {
  OAUTH_STATE_COOKIE,
  MAX_COOKIE_AGE,
  buildCookie,
  decodeJson,
  encodeJson,
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

  const redirectBack = (params: Record<string, string>) => {
    const target = new URL('/', req.url);
    target.searchParams.set('mcp_oauth', '1');
    for (const [key, value] of Object.entries(params)) target.searchParams.set(key, value);
    return NextResponse.redirect(target);
  };

  if (!saved || !state || state !== url.searchParams.get('state')) return redirectBack({ status: 'error', message: 'OAuth state validation failed.' });
  if (error) return redirectBack({ status: 'error', connectorId: saved.connectorId, message: url.searchParams.get('error_description') || error });
  if (!code) return redirectBack({ status: 'error', connectorId: saved.connectorId, message: 'OAuth authorization code was not returned.' });

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

    const responseOut = redirectBack({ status: 'success', connectorId: saved.connectorId, connectorName: saved.name });
    setStoredTokenCookie(responseOut, saved.connectorId, saved.serverUrl, token);
    responseOut.headers.append('Set-Cookie', `${OAUTH_STATE_COOKIE}=; ${buildCookie(0)}`);
    responseOut.headers.append('Set-Cookie', `remote_mcp_oauth_result=${encodeURIComponent(encodeJson({ connectorId: saved.connectorId, status: 'success' }))}; ${buildCookie(60)}`);
    return responseOut;
  } catch (err: any) {
    return redirectBack({ status: 'error', connectorId: saved.connectorId, message: String(err?.message || 'OAuth token exchange failed.') });
  }
}