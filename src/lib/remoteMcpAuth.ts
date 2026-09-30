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
  tokenEndpointAuthMethod?: string;
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
  tokenEndpointAuthMethod?: string;
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

/**
 * RFC 9728 derives protected-resource metadata by inserting
 * /.well-known/oauth-protected-resource between the host and the
 * resource path. This is important for path-based MCP endpoints such
 * as /mcp and /mcp/v1.
 */
function pathAwareWellKnown(serverUrl: string, suffix: string): URL {
  const url = new URL(serverUrl);
  const path = url.pathname.replace(/\\/+$/, '');
  const wellKnownPath = path && path !== '/'
    ? `/.well-known/${suffix}${path.startsWith('/') ? path : '/' + path}`
    : `/.well-known/${suffix}`;
  const result = new URL(wellKnownPath, `${url.origin}/`);
  result.search = url.search;
  return result;
}

function canonicalResource(raw: string): string {
  const url = new URL(raw);
  url.hash = '';
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\\/+$/, '');
  return url.toString();
}

function resourceMetadataMatches(candidate: any, expectedResource: string): boolean {
  if (!candidate || typeof candidate !== 'object') return false;
  if (!candidate.resource) return true;
  try {
    return canonicalResource(String(candidate.resource)) === canonicalResource(expectedResource);
  } catch {
    return false;
  }
}

function extractResourceMetadataUrl(header: string): string | undefined {
  const match = String(header || '').match(/resource_metadata\\s*=\\s*(?:"([^"]+)"|([^,\\s]+))/i);
  const value = String(match?.[1] || match?.[2] || '').trim();
  if (!value) return undefined;
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' ? parsed.toString() : undefined;
  } catch {
    return undefined;
  }
}

async function discoverFromWwwAuthenticate(serverUrl: string): Promise<string | undefined> {
  try {
    const res = await fetch(serverUrl, {
      method: 'GET',
      headers: { Accept: 'application/json, text/plain, */*' },
      cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return extractResourceMetadataUrl(res.headers.get('www-authenticate') || '');
  } catch {
    return undefined;
  }
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
  const expectedResource = String(resourceUrl || serverUrl).trim() || serverUrl;
  const discoverySignal = AbortSignal.timeout(7000);

  const pathCandidate = pathAwareWellKnown(serverUrl, 'oauth-protected-resource');
  const rootCandidate = originWellKnown(serverUrl, '/.well-known/oauth-protected-resource');
  const challengeUrl = await discoverFromWwwAuthenticate(serverUrl);

  const directMetadataPromise = challengeUrl
    ? fetchJson(new URL(challengeUrl), discoverySignal)
    : Promise.resolve(undefined);

  const [challengeMetadata, pathMetadata, rootMetadata] = await Promise.all([
    directMetadataPromise,
    fetchJson(pathCandidate, discoverySignal),
    fetchJson(rootCandidate, discoverySignal),
  ]);

  const protectedResource = [challengeMetadata, pathMetadata, rootMetadata]
    .find((candidate) => resourceMetadataMatches(candidate, expectedResource));

  let authorizationServer = Array.isArray(protectedResource?.authorization_servers)
    ? String(protectedResource.authorization_servers[0] || '').trim()
    : '';

  let oauth: RemoteOAuthMetadata | undefined;
  if (authorizationServer) {
    try {
      oauth = await fetchJson(pathAwareWellKnown(authorizationServer, 'oauth-authorization-server'), discoverySignal);
      if (!oauth) oauth = await fetchJson(originWellKnown(authorizationServer, '/.well-known/oauth-authorization-server'), discoverySignal);
      if (!oauth) oauth = await fetchJson(pathAwareWellKnown(authorizationServer, 'openid-configuration'), discoverySignal);
      if (!oauth) oauth = await fetchJson(originWellKnown(authorizationServer, '/.well-known/openid-configuration'), discoverySignal);
    } catch {}
  }

  if (!oauth) {
    try {
      oauth = await fetchJson(pathAwareWellKnown(serverUrl, 'oauth-authorization-server'), discoverySignal);
      if (!oauth) oauth = await fetchJson(originWellKnown(serverUrl, '/.well-known/oauth-authorization-server'), discoverySignal);
      if (!oauth) oauth = await fetchJson(pathAwareWellKnown(serverUrl, 'openid-configuration'), discoverySignal);
      if (!oauth) oauth = await fetchJson(originWellKnown(serverUrl, '/.well-known/openid-configuration'), discoverySignal);
      authorizationServer = String(oauth?.issuer || authorizationServer || new URL(serverUrl).origin);
    } catch {}
  }

  return {
    protectedResource,
    authorizationServer: authorizationServer || undefined,
    oauth,
  };
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
    const form = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: token.refreshToken,
      client_id: token.clientId,
    });
    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    };

    const authMethod = String(token.tokenEndpointAuthMethod || '').toLowerCase();
    if (token.clientSecret && authMethod === 'client_secret_basic') {
      form.delete('client_id');
      headers.Authorization = 'Basic ' + Buffer.from(token.clientId + ':' + token.clientSecret).toString('base64');
    } else if (token.clientSecret) {
      form.set('client_secret', token.clientSecret);
    }

    const res = await fetch(token.tokenEndpoint, {
      method: 'POST',
      headers,
      body: form.toString(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
    });
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
