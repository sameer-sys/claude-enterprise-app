import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Connector } from '@/types/chat';
import { listRemoteMcpTools } from '@/lib/remoteMcp';
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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (action === 'save_credentials') {
      const connectorId = String(body?.connectorId || '').trim();
      const serverUrl = String(body?.serverUrl || '').trim();
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
      const cfg: any = connector.config || {};
      if (!connector.name || !connector.url) return NextResponse.json({ success: false, error: 'Connector name and URL are required.' }, { status: 400 });

      const saved = getCredentialFromRequest(req, connector.id, connector.url) || {};
      const suppliedId = String(body?.clientId || connector.config?.oauthClientId || saved.clientId || '').trim();
      const suppliedSecret = String(body?.clientSecret || saved.clientSecret || '').trim();
      const resourceHint = String(body?.resource || cfg.resource || '').trim() || undefined;
      const discovered = await discoverRemoteOAuth(connector.url, resourceHint);
      const discoveredOauth = discovered.oauth;
      const manualAuthorizationEndpoint = String(cfg.oauthAuthorizationEndpoint || '').trim();
      const manualTokenEndpoint = String(cfg.oauthTokenEndpoint || '').trim();
      const manualAuthMethod = String(cfg.oauthTokenEndpointAuthMethod || '').trim().toLowerCase();
      const oauth = discoveredOauth || (manualAuthorizationEndpoint && manualTokenEndpoint
        ? {
            authorization_endpoint: manualAuthorizationEndpoint,
            token_endpoint: manualTokenEndpoint,
            scopes_supported: Array.isArray(cfg.oauthScopes) ? cfg.oauthScopes.map(String) : (String(cfg.oauthScopes || '').trim() ? String(cfg.oauthScopes).trim().split(/\\s+/) : []),
            token_endpoint_auth_methods_supported: manualAuthMethod ? [manualAuthMethod] : undefined,
          }
        : undefined);
      if (!oauth?.authorization_endpoint || !oauth?.token_endpoint) {
        return NextResponse.json({ success: false, error: 'OAuth metadata could not be discovered for this connector. Configure an OAuth Client ID/Secret or API token in Advanced settings.' }, { status: 400 });
      }

      let clientId = suppliedId;
      let clientSecret = suppliedSecret || undefined;
      const supportedAuthMethods = Array.isArray(oauth.token_endpoint_auth_methods_supported)
        ? oauth.token_endpoint_auth_methods_supported.map(String).map((v) => v.toLowerCase())
        : [];
      let tokenEndpointAuthMethod = manualAuthMethod || String(supportedAuthMethods[0] || '').toLowerCase();
      if (!tokenEndpointAuthMethod) tokenEndpointAuthMethod = clientSecret ? 'client_secret_post' : 'none';
      if (!clientId && oauth.client_id_metadata_document_supported) {
        clientId = new URL('/api/mcp/oauth/client-metadata', req.url).toString();
      }
      if (!clientId && oauth.registration_endpoint) {
        const register = await fetch(oauth.registration_endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({
            client_name: 'Sameer AI Workspace',
            redirect_uris: [new URL('/api/mcp/oauth/callback', req.url).toString()],
            response_types: ['code'],
            grant_types: ['authorization_code'],
            token_endpoint_auth_method: tokenEndpointAuthMethod,
          }),
          cache: 'no-store',
          signal: AbortSignal.timeout(10000),
        });
        const registered = await register.json().catch(() => ({}));
        if (!register.ok || !registered?.client_id) return NextResponse.json({ success: false, error: registered?.error_description || registered?.error || 'OAuth client registration failed.' }, { status: 502 });
        clientId = String(registered.client_id);
        clientSecret = registered.client_secret ? String(registered.client_secret) : clientSecret;
        tokenEndpointAuthMethod = String(registered.token_endpoint_auth_method || tokenEndpointAuthMethod).toLowerCase();
      }
      if (!clientId) return NextResponse.json({ success: false, error: 'OAuth client registration is required by this MCP server. Add an OAuth Client ID in Advanced settings or enable a registration endpoint.' }, { status: 400 });

      const verifier = codeVerifier();
      const state = crypto.randomUUID();
      const redirectUri = new URL('/api/mcp/oauth/callback', req.url).toString();
      const resource = String(body?.resource || cfg.resource || discovered.protectedResource?.resource || connector.url || '').trim();
      const configuredScopes = Array.isArray(cfg.oauthScopes) ? cfg.oauthScopes.map(String).filter(Boolean) : (String(cfg.oauthScopes || '').trim() ? String(cfg.oauthScopes).trim().split(/\\s+/).filter(Boolean) : []);
      const scopeList = (Array.isArray(discovered.protectedResource?.scopes_supported) && discovered.protectedResource.scopes_supported.length
        ? discovered.protectedResource.scopes_supported
        : (configuredScopes.length ? configuredScopes : (Array.isArray(oauth.scopes_supported) ? oauth.scopes_supported : [])))
        .map(String).filter(Boolean);
      const auth = new URL(oauth.authorization_endpoint);
      auth.searchParams.set('response_type', 'code');
      auth.searchParams.set('client_id', clientId);
      auth.searchParams.set('redirect_uri', redirectUri);
      auth.searchParams.set('state', state);
      auth.searchParams.set('code_challenge', pkceChallenge(verifier));
      auth.searchParams.set('code_challenge_method', 'S256');
      const extraParams = cfg.oauthParams && typeof cfg.oauthParams === 'object' ? cfg.oauthParams : {};
      for (const [key, value] of Object.entries(extraParams)) {
        if (value !== undefined && value !== null && String(value).trim()) auth.searchParams.set(String(key), String(value));
      }
      if (scopeList.length) auth.searchParams.set('scope', scopeList.join(' '));
      if (resource && cfg.oauthSendResource !== false) auth.searchParams.set('resource', resource);

      const oauthState: RemoteOAuthState = { state, connectorId: connector.id, name: connector.name, serverUrl: connector.url, redirectUri, codeVerifier: verifier, clientId, clientSecret, resource: cfg.oauthSendResource === false ? undefined : resource, tokenEndpoint: oauth.token_endpoint, authorizationEndpoint: oauth.authorization_endpoint, tokenEndpointAuthMethod };
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
      const raw = Array.isArray(body?.connectors) ? body.connectors : [];
      const items = raw.map((item: any) => {
        const connector = connectorFromInput(item);
        const token = getStoredTokenFromRequest(req, connector.id, connector.url);
        const credential = getCredentialFromRequest(req, connector.id, connector.url);
        return {
          id: connector.id,
          connected: Boolean(token?.accessToken),
          configured: Boolean(credential?.clientId || credential?.clientSecret || credential?.accessToken || token?.accessToken),
        };
      });
      return NextResponse.json({ success: true, connectors: items });
    }

    if (action !== 'check') return NextResponse.json({ success: false, error: 'Unsupported MCP action.' }, { status: 400 });

    const connector = connectorFromInput(body?.connector);
    if (!connector.name || !connector.url) return NextResponse.json({ success: false, error: 'Connector name and remote MCP URL are required.' }, { status: 400 });
    let credentials = getStoredTokenFromRequest(req, connector.id, connector.url) || getCredentialFromRequest(req, connector.id, connector.url);
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
