import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Connector } from '@/types/chat';
import { listRemoteMcpTools, getGitHubToken } from '@/lib/remoteMcp';
import {
  OAUTH_STATE_COOKIE,
  MAX_COOKIE_AGE,
  buildCookie,
  codeVerifier,
  pkceChallenge,
  encodeJson,
  discoverRemoteOAuth,
  getCredentialFromRequest,
  getStoredTokenFromRequest,
  setStoredTokenCookie,
  clearTokenCookie,
  credentialCookieName,
  type RemoteOAuthState,
  type RemoteStoredToken,
} from '@/lib/remoteMcpAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function connectorFromInput(input: any): Connector {
  const name = String(input?.name || '').trim();
  const url = String(input?.config?.mcpUrl || input?.url || '').trim();
  return {
    id: String(input?.id || ('mcp-' + Date.now())),
    name,
    description: String(input?.description || ('Remote MCP server at ' + url)),
    icon: String(input?.icon || 'mcp'),
    enabled: true,
    status: 'ready',
    category: 'Integrations',
    isCustom: true,
    isVerified: true,
    provider: 'mcp',
    capabilities: ['Remote MCP', 'Tool Discovery', 'Tool Execution', 'OAuth'],
    config: { ...(input?.config && typeof input.config === 'object' ? input.config : {}), connectionType: 'mcp', providerName: name, mcpUrl: url },
    url,
  };
}

function cookie(value: string, maxAge = MAX_COOKIE_AGE): string {
  return `${value}; ${buildCookie(maxAge)}`;
}

function publicOrigin(req: NextRequest): string {
  // The OAuth callback must be byte-identical across client registration,
  // authorization, and token exchange. Deriving it from x-forwarded-host makes
  // Vercel preview deployments advertise a different redirect_uri than the one
  // registered on the GitHub OAuth App, which GitHub rejects with
  // "The redirect_uri is not associated with this application."
  // So pin production to APP_URL and only fall back to request headers in dev.
  const configured = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  if (configured) return configured;
  if (process.env.NODE_ENV === 'production') {
    console.warn('[mcp] APP_URL is not set; falling back to request host. Set APP_URL to the exact public origin of this deployment.');
  }
  const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
  const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
  const host = forwardedHost || req.headers.get('host') || new URL(req.url).host;
  const proto = forwardedProto || (host.endsWith('.app.github.dev') ? 'https' : new URL(req.url).protocol.replace(':', ''));
  return proto + '://' + host;
}


export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'save_credentials') {
      const connectorId = String(body?.connectorId || '').trim();
      const connectorInput = body?.connector && typeof body.connector === 'object' ? body.connector : undefined;
      const serverUrl = String(body?.serverUrl || connectorInput?.config?.mcpUrl || connectorInput?.url || '').trim();
      if (!connectorId || !serverUrl) return NextResponse.json({ success: false, error: 'Connector id and server URL are required.' }, { status: 400 });
      const clientId = String(body?.clientId || '').trim();
      const clientSecret = String(body?.clientSecret || '').trim();
      const apiToken = String(body?.apiToken || '').trim();
      const stored: RemoteStoredToken = { accessToken: apiToken, clientId: clientId || undefined, clientSecret: clientSecret || undefined };
      const response = NextResponse.json({ success: true });
      response.headers.append('Set-Cookie', cookie(credentialCookieName(connectorId, serverUrl) + '=' + encodeURIComponent(encodeJson(stored))));
      return response;
    }

    if (action === 'oauth_start') {
      const connector = connectorFromInput(body?.connector);
      if (!connector.name || !connector.url) return NextResponse.json({ success: false, error: 'Connector name and URL are required.' }, { status: 400 });

      const saved = getCredentialFromRequest(req, connector.id, connector.url) || {};
      const isGitHub = connector.id === 'conn-github' || /githubcopilot\.com\/mcp/i.test(connector.url);
      const suppliedId = String((isGitHub ? process.env.GITHUB_OAUTH_CLIENT_ID : '') || body?.clientId || connector.config?.oauthClientId || saved.clientId || '').trim();
      const suppliedSecret = String((isGitHub ? process.env.GITHUB_OAUTH_CLIENT_SECRET : '') || body?.clientSecret || connector.config?.oauthClientSecret || saved.clientSecret || '').trim();
      const discovered = await discoverRemoteOAuth(connector.url, String(body?.resource || connector.config?.resource || '').trim() || undefined);
      const configuredAuthorizationEndpoint = String(connector.config?.oauthAuthorizationEndpoint || '').trim();
      const configuredTokenEndpoint = String(connector.config?.oauthTokenEndpoint || '').trim();
      const configuredAuthMethod = String(connector.config?.oauthTokenEndpointAuthMethod || '').trim();
      const oauth: any = {
        ...(discovered.oauth || {}),
        ...(configuredAuthorizationEndpoint ? { authorization_endpoint: configuredAuthorizationEndpoint } : {}),
        ...(configuredTokenEndpoint ? { token_endpoint: configuredTokenEndpoint } : {}),
        ...(configuredAuthMethod ? { token_endpoint_auth_methods_supported: [configuredAuthMethod] } : {}),
      };
      if (!oauth.authorization_endpoint || !oauth.token_endpoint) {
        return NextResponse.json({ success: false, error: 'This MCP server did not publish OAuth authorization metadata. Add an API token or an OAuth Client ID in Advanced settings.' }, { status: 400 });
      }

      let clientId = suppliedId;
      let clientSecret = suppliedSecret || undefined;
      if (!clientId && oauth.client_id_metadata_document_supported) {
        clientId = new URL('/api/mcp/oauth/client-metadata', publicOrigin(req)).toString();
      }
      if (!clientId && oauth.registration_endpoint) {
        const register = await fetch(oauth.registration_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            client_name: 'Sameer AI Workspace',
            redirect_uris: [new URL('/api/mcp/oauth/callback', publicOrigin(req)).toString()],
            response_types: ['code'],
            grant_types: ['authorization_code'],
            token_endpoint_auth_method: 'none',
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        const registered = await register.json().catch(() => ({}));
        if (!register.ok || !registered?.client_id) return NextResponse.json({ success: false, error: registered?.error_description || registered?.error || 'OAuth client registration failed.' }, { status: 502 });
        clientId = String(registered.client_id);
        clientSecret = registered.client_secret ? String(registered.client_secret) : clientSecret;
      }
      if (!clientId) return NextResponse.json({ success: false, error: 'OAuth client registration is required by this MCP server. Add an OAuth Client ID in Advanced settings or enable a registration endpoint.' }, { status: 400 });

      const verifier = codeVerifier();
      const state = crypto.randomUUID();
      const redirectUri = new URL('/api/mcp/oauth/callback', publicOrigin(req)).toString();
      const resource = String(body?.resource || connector.config?.resource || discovered.protectedResource?.resource || connector.url || '').trim();
      const scopeList = Array.isArray(oauth.scopes_supported) ? oauth.scopes_supported.map(String).filter(Boolean) : [];
      const auth = new URL(oauth.authorization_endpoint);
      auth.searchParams.set('response_type', 'code');
      auth.searchParams.set('client_id', clientId);
      auth.searchParams.set('redirect_uri', redirectUri);
      auth.searchParams.set('state', state);
      auth.searchParams.set('code_challenge', pkceChallenge(verifier));
      auth.searchParams.set('code_challenge_method', 'S256');
      if (scopeList.length) auth.searchParams.set('scope', scopeList.join(' '));
      if (resource) auth.searchParams.set('resource', resource);

      const supportedAuthMethods = Array.isArray(oauth.token_endpoint_auth_methods_supported) ? oauth.token_endpoint_auth_methods_supported.map(String).map((value: string) => value.toLowerCase()) : [];
      const tokenEndpointAuthMethod = clientSecret && supportedAuthMethods.includes('client_secret_post') ? 'client_secret_post' : supportedAuthMethods.includes('none') ? 'none' : supportedAuthMethods[0];
      const oauthState: RemoteOAuthState = { state, connectorId: connector.id, name: connector.name, serverUrl: connector.url, redirectUri, codeVerifier: verifier, clientId, clientSecret, resource, tokenEndpoint: oauth.token_endpoint, authorizationEndpoint: oauth.authorization_endpoint, tokenEndpointAuthMethod };
      const response = NextResponse.json({ success: true, authUrl: auth.toString() });
      response.headers.append('Set-Cookie', cookie(OAUTH_STATE_COOKIE + '=' + encodeURIComponent(encodeJson(oauthState)), 15 * 60));
      return response;
    }

    if (action === 'disconnect') {
      const connectorId = String(body?.connectorId || '').trim();
      const serverUrl = String(body?.serverUrl || '').trim();
      if (!connectorId || !serverUrl) return NextResponse.json({ success: false, error: 'Connector id and server URL are required.' }, { status: 400 });
      const response = NextResponse.json({ success: true });
      clearTokenCookie(response, connectorId, serverUrl);
      return response;
    }

    if (action === 'status') {
      const items = Array.isArray(body?.connectors) ? body.connectors : [];
      // Bound the fan-out: status now performs real authenticated discovery.
      if (items.length > 20) return NextResponse.json({ success: false, error: 'Check at most 20 connectors per request.' }, { status: 400 });
      const rotatedTokens: Array<{ id: string; url: string; token: RemoteStoredToken }> = [];
      const results = await Promise.all(items.map(async (item: any) => {
        const connector = connectorFromInput(item);
        if (!connector.name || !connector.url) return { id: String(item?.id || ''), connected: false, state: 'not_configured' };
        const serverUrl = connector.url;
        let endpoint: URL;
        try {
          endpoint = new URL(serverUrl);
          if (endpoint.protocol !== 'https:' || endpoint.username || endpoint.password) throw new Error('Invalid endpoint');
        } catch {
          return { id: connector.id, connected: false, state: 'not_configured' };
        }
        let credentials = getStoredTokenFromRequest(req, connector.id, serverUrl) || getCredentialFromRequest(req, connector.id, serverUrl);
        // Preserve the existing official GitHub fallback, never match by display name.
        if (!credentials?.accessToken && endpoint.origin === 'https://api.githubcopilot.com' && /^\/mcp\/?$/.test(endpoint.pathname) && !endpoint.search) {
          const token = getGitHubToken();
          if (token) credentials = { accessToken: token };
        }
        if (!credentials?.accessToken) return { id: connector.id, connected: false, state: 'not_configured' };
        try {
          // The transport owns expiry/refresh handling; persist any credential rotation.
          const tools = await listRemoteMcpTools(connector, {
            credentials,
            onCredentialsUpdated: (token) => {
              credentials = token;
              rotatedTokens.push({ id: connector.id, url: serverUrl, token });
            },
          });
          return { id: connector.id, connected: true, state: 'connected', toolCount: tools.length };
        } catch (err: any) {
          const message = String(err?.message || '');
          const requiresAuth = err?.status === 401 || err?.status === 403 || /(?:unauthorized|forbidden|authentication|oauth)/i.test(message);
          return { id: connector.id, connected: false, state: requiresAuth ? 'needs_auth' : 'unreachable' };
        }
      }));
      const response = NextResponse.json({ success: true, connectors: results });
      response.headers.set('Cache-Control', 'no-store');
      for (const rotated of rotatedTokens) setStoredTokenCookie(response, rotated.id, rotated.url, rotated.token);
      return response;
    }

    if (action !== 'check') return NextResponse.json({ success: false, error: 'Unsupported MCP action.' }, { status: 400 });

    const connector = connectorFromInput(body?.connector);
    if (!connector.name || !connector.url) return NextResponse.json({ success: false, error: 'Connector name and remote MCP URL are required.' }, { status: 400 });
    let credentials = getStoredTokenFromRequest(req, connector.id, connector.url) || getCredentialFromRequest(req, connector.id, connector.url);
    if (!credentials?.accessToken && (connector.id === 'conn-github' || /github/i.test(connector.name))) {
      const ghTok = getGitHubToken();
      if (ghTok) credentials = { accessToken: ghTok };
    }
    let rotated: RemoteStoredToken | undefined;
    const tools = await listRemoteMcpTools(connector, { credentials, onCredentialsUpdated: (next) => { rotated = next; credentials = next; } });

    const response = NextResponse.json({ success: true, connector: connector.name, url: connector.url, connected: true, toolCount: tools.length, tools: tools.slice(0, 20).map((tool) => ({ name: tool.function.name, description: tool.function.description })) });
    if (rotated) setStoredTokenCookie(response, connector.id, connector.url, rotated);
    return response;
  } catch (err: any) {
    const message = String(err?.message || 'Remote MCP operation failed.');
    const requiresAuth = err?.status === 401 || err?.status === 403 || /(?:unauthorized|forbidden|authentication|oauth)/i.test(message);
    return NextResponse.json({ success: false, requiresAuth, error: message }, { status: requiresAuth ? 401 : 502 });
  }
}
