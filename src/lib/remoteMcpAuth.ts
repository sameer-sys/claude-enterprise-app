import crypto from 'crypto';

export interface RemoteOAuthMetadata {
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint?: string;
  revocation_endpoint?: string;
  issuer?: string;
  scopes_supported?: string[];
  token_endpoint_auth_methods_supported?: string[];
  client_id_metadata_document_supported?: boolean;
}

export interface RemoteProtectedResourceMetadata {
  authorization_servers?: string[];
  scopes_supported?: string[];
  resource?: string;
}

export interface RemoteOAuthState {
  state: string;
  connectorId: string;
  name: string;
  serverUrl: string;
  redirectUri: string;
  codeVerifier: string;
  clientId?: string;
  clientSecret?: string;
  resource?: string;
  tokenEndpoint?: string;
  authorizationEndpoint?: string;
}

export interface RemoteStoredToken {
  accessToken?: string;
  refreshToken?: string;
  tokenType?: string;
  expiresAt?: number;
  scope?: string;
  clientId?: string;
  clientSecret?: string;
  tokenEndpoint?: string;
  resource?: string;
}

const COOKIE_PREFIX = 'remote_mcp_';
const OAUTH_STATE_COOKIE = 'remote_mcp_oauth_state';
const MAX_COOKIE_AGE = 60 * 60 * 24 * 90;

export function connectorKey(connectorId: string, serverUrl: string): string {
  return crypto.createHash('sha256').update(`${connectorId}|${serverUrl}`).digest('hex').slice(0, 24);
}

export function tokenCookieName(connectorId: string, serverUrl: string): string {
  return `${COOKIE_PREFIX}${connectorKey(connectorId, serverUrl)}`;
}

export function credentialCookieName(connectorId: string, serverUrl: string): string {
  return `${COOKIE_PREFIX}cred_${connectorKey(connectorId, serverUrl)}`;
}

export { OAUTH_STATE_COOKIE, MAX_COOKIE_AGE };

export function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), 'utf8').toString('base64url');
}

export function decodeJson<T>(value?: string | null): T | undefined {
  if (!value) return undefined;
  try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as T; } catch { return undefined; }
}

function originWellKnown(serverUrl: string, path: string): URL {
  const url = new URL(serverUrl);
  return new URL(path, `${url.origin}/`);
}

async function fetchJson(url: URL, signal?: AbortSignal): Promise<any | undefined> {
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store',
      signal,
    });
    if (!res.ok) return undefined;
    const text = await res.text();
    if (text.length > 200000) return undefined;
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export async function discoverRemoteOAuth(serverUrl: string, resourceUrl?: string): Promise<{
  protectedResource?: RemoteProtectedResourceMetadata;
  authorizationServer?: string;
  oauth?: RemoteOAuthMetadata;
}> {
  const signal = AbortSignal.timeout(7000);
  const candidates: URL[] = [];
  try { candidates.push(originWellKnown(serverUrl, '/.well-known/oauth-protected-resource')); } catch {}
  const protectedResource = (await Promise.all(candidates.map((u) => fetchJson(u, signal)))).find(Boolean);

  let authorizationServer = Array.isArray(protectedResource?.authorization_servers)
    ? String(protectedResource.authorization_servers[0] || '').trim()
    : '';
  if (!authorizationServer && resourceUrl) authorizationServer = '';

  let oauth: RemoteOAuthMetadata | undefined;
  if (authorizationServer) {
    const authBase = new URL(authorizationServer);
    oauth = await fetchJson(new URL('/.well-known/oauth-authorization-server', `${authBase.origin}/`), signal);
    if (!oauth) oauth = await fetchJson(new URL('/.well-known/openid-configuration', `${authBase.origin}/`), signal);
  }

  if (!oauth) {
    try {
      oauth = await fetchJson(originWellKnown(serverUrl, '/.well-known/oauth-authorization-server'), signal);
      if (!oauth) oauth = await fetchJson(originWellKnown(serverUrl, '/.well-known/openid-configuration'), signal);
      authorizationServer = String(oauth?.issuer || new URL(serverUrl).origin);
    } catch {}
  }

  return { protectedResource, authorizationServer: authorizationServer || undefined, oauth };
}

export function codeVerifier(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function pkceChallenge(verifier: string): string {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

export function buildCookie(maxAge = MAX_COOKIE_AGE): string {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  return `Path=/; HttpOnly; SameSite=Lax${secure}; Max-Age=${maxAge}`;
}

export function parseStoredToken(value?: string): RemoteStoredToken | undefined {
  return decodeJson<RemoteStoredToken>(value);
}

export function getStoredTokenFromRequest(req: { cookies: { get(name: string): { value: string } | undefined } }, connectorId: string, serverUrl: string): RemoteStoredToken | undefined {
  return parseStoredToken(req.cookies.get(tokenCookieName(connectorId, serverUrl))?.value);
}

export function getCredentialFromRequest(req: { cookies: { get(name: string): { value: string } | undefined } }, connectorId: string, serverUrl: string): RemoteStoredToken | undefined {
  return parseStoredToken(req.cookies.get(credentialCookieName(connectorId, serverUrl))?.value);
}

export function setStoredTokenCookie(response: Response, connectorId: string, serverUrl: string, token: RemoteStoredToken): void {
  const encoded = encodeJson(token);
  response.headers.append('Set-Cookie', `${tokenCookieName(connectorId, serverUrl)}=${encodeURIComponent(encoded)}; ${buildCookie(MAX_COOKIE_AGE)}`);
}

export function clearTokenCookie(response: Response, connectorId: string, serverUrl: string): void {
  response.headers.append('Set-Cookie', `${tokenCookieName(connectorId, serverUrl)}=; ${buildCookie(0)}`);
  response.headers.append('Set-Cookie', `${credentialCookieName(connectorId, serverUrl)}=; ${buildCookie(0)}`);
}

export async function refreshRemoteAccessToken(token: RemoteStoredToken): Promise<RemoteStoredToken | undefined> {
  if (!token.refreshToken || !token.tokenEndpoint || !token.clientId) return undefined;
  try {
    const form = new URLSearchParams({ grant_type: 'refresh_token', refresh_token: token.refreshToken, client_id: token.clientId });
    const headers: Record<string, string> = { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' };
    if (token.clientSecret) {
      form.delete('client_id');
      headers.Authorization = 'Basic ' + Buffer.from(token.clientId + ':' + token.clientSecret).toString('base64');
    }
    const res = await fetch(token.tokenEndpoint, { method: 'POST', headers, body: form.toString(), cache: 'no-store' });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token) return undefined;
    return {
      ...token,
      accessToken: String(data.access_token),
      refreshToken: data.refresh_token ? String(data.refresh_token) : token.refreshToken,
      tokenType: data.token_type || token.tokenType,
      expiresAt: data.expires_in ? Date.now() + Number(data.expires_in) * 1000 : token.expiresAt,
      scope: data.scope || token.scope,
    };
  } catch {
    return undefined;
  }
}
