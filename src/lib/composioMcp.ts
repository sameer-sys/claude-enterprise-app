import crypto from 'crypto';

export const COMPOSIO_MCP_CLIENT_ID = 'client_01M3HAWYDCAGAF1QYM64SGC9NY';
export const COMPOSIO_MCP_AUTH_ENDPOINT = 'https://connect.composio.dev/oauth/authorize';
export const COMPOSIO_MCP_TOKEN_ENDPOINT = 'https://login.composio.dev/oauth2/token';
export const COMPOSIO_MCP_SERVER_URL = 'https://connect.composio.dev/mcp';

function decodeJwtPayload(token: string): Record<string, any> {
  try {
    const parts = String(token || '').split('.');
    if (parts.length !== 3) return {};
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch {
    return {};
  }
}

/**
 * Composio For You sessions are user-scoped. Current Composio MCP requires
 * the Composio user_id on the MCP URL; the OAuth token's subject is the
 * authoritative user identifier, so never invent a local user id.
 */
export function getComposioUserId(accessToken: string): string {
  const payload = decodeJwtPayload(accessToken);
  return String(payload.sub || payload.user_id || payload.userId || payload.client_unique_user_id || '').trim();
}

function getComposioMcpUrl(accessToken: string): string {
  const userId = getComposioUserId(accessToken);
  if (!userId) return COMPOSIO_MCP_SERVER_URL;
  const url = new URL(COMPOSIO_MCP_SERVER_URL);
  url.searchParams.set('user_id', userId);
  return url.toString();
}

export interface McpOAuthResult {
  authUrl: string;
  codeVerifier: string;
  state: string;
}

export interface McpTokenResponse {
  access_token: string;
  token_type: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
}

export interface McpToolSchema {
  name: string;
  description?: string;
  inputSchema?: Record<string, any>;
}

/**
 * Generate PKCE pair and return the Composio "For You" OAuth authorization URL
 */
export function getMcpOAuthUrl(origin: string, stateOverride?: string): McpOAuthResult {
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
  const state = stateOverride || crypto.randomBytes(16).toString('hex');

  const redirectUri = `${origin}/api/composio/callback`;
  const params = new URLSearchParams({
    client_id: COMPOSIO_MCP_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid profile email offline_access',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: state,
  });

  return {
    authUrl: `${COMPOSIO_MCP_AUTH_ENDPOINT}?${params.toString()}`,
    codeVerifier,
    state,
  };
}

/**
 * Exchange OAuth authorization code for Composio "For You" AuthKit tokens
 */
export async function exchangeMcpCode(
  code: string,
  verifier: string,
  origin: string
): Promise<{ success: boolean; tokens?: McpTokenResponse; error?: string }> {
  try {
    const redirectUri = `${origin}/api/composio/callback`;
    const res = await fetch(COMPOSIO_MCP_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: COMPOSIO_MCP_CLIENT_ID,
        code,
        code_verifier: verifier,
        redirect_uri: redirectUri,
      }).toString(),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token) {
      return {
        success: false,
        error: data?.error_description || data?.error || `Token exchange failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      tokens: data as McpTokenResponse,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error during MCP token exchange',
    };
  }
}

/**
 * Refresh an expired Composio "For You" access token using refresh_token
 */
export async function refreshMcpToken(
  refreshToken: string
): Promise<{ success: boolean; tokens?: McpTokenResponse; error?: string }> {
  try {
    const res = await fetch(COMPOSIO_MCP_TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Accept': 'application/json',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: COMPOSIO_MCP_CLIENT_ID,
        refresh_token: refreshToken,
      }).toString(),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.access_token) {
      return {
        success: false,
        error: data?.error_description || data?.error || `Token refresh failed with status ${res.status}`,
      };
    }

    return {
      success: true,
      tokens: data as McpTokenResponse,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error during MCP token refresh',
    };
  }
}

/**
 * Call JSON-RPC 2.0 method on Composio MCP server with user AuthKit JWT
 */
export async function callComposioMcp(
  accessToken: string,
  method: string,
  params: any = {},
  refreshToken?: string
): Promise<{ success: boolean; result?: any; error?: any; newAccessToken?: string; newRefreshToken?: string }> {
  try {
    const doFetch = async (token: string) => {
      const id = Date.now();
      return fetch(getComposioMcpUrl(token), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          ...(process.env.COMPOSIO_API_KEY
            ? { 'x-consumer-api-key': process.env.COMPOSIO_API_KEY }
            : {}),
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id,
          method,
          params,
        }),
        cache: 'no-store',
      });
    };

    let activeToken = accessToken;
    let newAccessToken: string | undefined = undefined;
    let newRefreshToken: string | undefined = undefined;
    let res = await doFetch(activeToken);

    // Auto-refresh token if 401 Unauthorized or 403 Forbidden
    if ((res.status === 401 || res.status === 403) && refreshToken) {
      console.warn('[MCP AUTO-REFRESH] Access token expired or invalid. Attempting refresh...');
      const refreshed = await refreshMcpToken(refreshToken);
      if (refreshed.success && refreshed.tokens?.access_token) {
        activeToken = refreshed.tokens.access_token;
        newAccessToken = activeToken;
        newRefreshToken = refreshed.tokens.refresh_token || refreshToken;
        res = await doFetch(activeToken);
      }
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `MCP server responded with status ${res.status}: ${errText}`,
        newAccessToken,
        newRefreshToken,
      };
    }

    let payload: any = {};
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/event-stream')) {
      // Streamable-HTTP MCP servers may answer with an SSE frame instead of plain JSON.
      const raw = await res.text().catch(() => '');
      for (const line of raw.split('\n')) {
        if (!line.startsWith('data:')) continue;
        try {
          const parsed = JSON.parse(line.slice(5).trim());
          if (parsed && (parsed.result !== undefined || parsed.error)) payload = parsed;
        } catch {}
      }
    } else {
      payload = await res.json().catch(() => ({}));
    }
    if (payload.error) {
      return {
        success: false,
        error: payload.error.message || payload.error,
        newAccessToken,
        newRefreshToken,
      };
    }

    return {
      success: true,
      result: payload.result,
      newAccessToken,
      newRefreshToken,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to call Composio MCP server',
    };
  }
}

/**
 * List available tools from the Composio "For You" MCP server
 */
export async function listMcpTools(accessToken: string, refreshToken?: string): Promise<McpToolSchema[]> {
  const response = await callComposioMcp(accessToken, 'tools/list', {}, refreshToken);
  if (response.success && Array.isArray(response.result?.tools)) {
    return response.result.tools;
  }
  return [];
}

/** Legacy compatibility only; runtime discovery uses Composio's live catalog. */
export const DEFAULT_COMPOSIO_TOOLKITS: string[] = [];

/**
 * Resolve a human-friendly toolkit name from the live Composio payload.
 * Prefer an explicit display name, then the live description, and finally
 * a generic slug-to-title conversion. The toolkit slug itself is preserved
 * separately for execution and account identity.
 */
export function getComposioToolkitDisplayName(value: any): string {
  const slug = String(
    value?.toolkit ||
    value?.toolkit_slug ||
    value?.toolkitSlug ||
    value?.app_slug ||
    value?.appSlug ||
    ''
  ).trim();

  const explicit = [
    value?.display_name,
    value?.displayName,
    value?.toolkit_name,
    value?.toolkitName,
    value?.app_name_display,
    value?.appDisplayName,
  ].map((candidate) => String(candidate || '').trim())
    .find((candidate) => candidate && candidate.toLowerCase() !== slug.toLowerCase());

  if (explicit) return explicit;

  const description = String(value?.description || '').replace(/\s+/g, ' ').trim();
  const descriptionMatch = description.match(/^(.{1,80}?)\s+is\s+/i);
  if (descriptionMatch?.[1]) return descriptionMatch[1].trim();

  if (!slug) return 'App';

  return slug
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
/**
 * Flatten a COMPOSIO_MANAGE_CONNECTIONS payload into one list of accounts.
 *
 * Composio returns several shapes for this tool depending on version:
 * a bare array, { connections }, { connected_accounts }, { accounts },
 * { items }, or the keyed { results: { toolkit: { accounts: [...] } } } form.
 * The Connectors status endpoint and the chat route both display this data, so
 * they must agree. They previously carried separate copies of this logic and
 * could report different counts for the same response; this is the only
 * implementation now.
 */
export function normalizeConnectedAccounts(raw: any): any[] {
  if (raw == null) return [];

  // MCP content blocks: [{ type: 'text', text: '...' }]. The real payload is
  // JSON inside the text field, so parse it before normalizing.
  if (Array.isArray(raw) && raw.length > 0 && raw.every((b) => b && typeof b === 'object' && typeof b.text === 'string')) {
    const text = raw.map((b) => b.text).join('\n').trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        raw = JSON.parse(text);
      } catch {
        return [];
      }
    }
  }

  // Composio wraps the payload in a { data: {...}, error, log_id, successful }
  // envelope. The real results live at data.results / data.connections etc.
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    const inner = raw.data;
    if (inner.results || inner.connections || inner.connected_accounts || inner.accounts || inner.items || inner.toolkit_connection_statuses) {
      raw = inner;
    }
  }

  let list: any[] = [];

  if (Array.isArray(raw)) {
    list = raw;
  } else if (Array.isArray(raw.connections)) {
    list = raw.connections;
  } else if (Array.isArray(raw.connected_accounts)) {
    list = raw.connected_accounts;
  } else if (Array.isArray(raw.accounts)) {
    list = raw.accounts;
  } else if (Array.isArray(raw.items)) {
    list = raw.items;
  } else if (Array.isArray(raw.toolkit_connection_statuses)) {
    for (const status of raw.toolkit_connection_statuses) {
      if (!status || status.has_active_connection !== true) continue;
      const details = status.connection_details && typeof status.connection_details === 'object' ? status.connection_details : {};
      const info = status.current_user_info && typeof status.current_user_info === 'object' ? status.current_user_info : {};
      const account = details.connected_account || details.connectedAccount || details.account || {};
      const id = String(account?.id || details.connected_account_id || details.connectedAccountId || '').trim();
      const appDisplayName = getComposioToolkitDisplayName(status);
      list.push({
        ...account,
        id: id || account?.id,
        connected_account_id: id || undefined,
        app_name: appDisplayName,
        app_display_name: appDisplayName,
        app_slug: String(status.toolkit || '').trim(),
        toolkit: status.toolkit,
        status: 'ACTIVE',
        email: account?.email || info.email || info.email_address || undefined,
        user_id: account?.user_id || info.user_id || undefined,
        account_identifier: account?.email || info.email || info.name || undefined,
      });
    }
  } else if (raw.results && typeof raw.results === 'object' && !Array.isArray(raw.results)) {
    for (const [toolkit, entry] of Object.entries(raw.results as Record<string, any>)) {
      const value: any = entry || {};
      const accounts = Array.isArray(value.accounts)
        ? value.accounts
        : Array.isArray(value.connected_accounts)
          ? value.connected_accounts
          : Array.isArray(value.connectedAccounts)
            ? value.connectedAccounts
            : (value.connected_account || value.connectedAccount || value.connection
              ? [value.connected_account || value.connectedAccount || value.connection]
              : []);
      for (const account of accounts) {
        if (!account || typeof account !== 'object') continue;
        const appDisplayName = getComposioToolkitDisplayName({
          ...value,
          ...account,
          toolkit,
          description: value.description || entry?.description,
          display_name: account.display_name || account.displayName || entry?.display_name || entry?.displayName,
        });
        list.push({
          ...account,
          app_name: account.app_name || account.appName || appDisplayName,
          app_display_name: account.app_display_name || account.appDisplayName || appDisplayName,
          app_slug: account.app_slug || account.appSlug || toolkit,
          toolkit,
        });
      }
    }
  }

  // INITIATING/INITIALIZING rows are in-flight auth attempts, not linked apps.
  return list.filter((account: any) => {
    const status = String(account?.status || 'ACTIVE').toUpperCase();
    return status === 'ACTIVE' || status === 'CONNECTED';
  });
}

export async function executeMcpTool(
  accessToken: string,
  toolName: string,
  args: Record<string, any> = {},
  refreshToken?: string
): Promise<{ success: boolean; data?: any; error?: string; newAccessToken?: string; newRefreshToken?: string }> {
  let callArgs = args || {};
  if (/MANAGE_CONNECTIONS/i.test(toolName)) {
    // Current Composio MCP expects toolkit slugs as strings.
    // Keep the exact slugs returned by Composio; never invent app-specific ones.
    const rawToolkits = Array.isArray(callArgs.toolkits) ? callArgs.toolkits : DEFAULT_COMPOSIO_TOOLKITS;
    const normalizedToolkits = rawToolkits
      .map((item: any) => typeof item === 'string'
        ? item.trim().toLowerCase()
        : String(item?.name || item?.toolkit || item?.slug || '').trim().toLowerCase())
      .filter(Boolean);
    callArgs = { ...callArgs, toolkits: normalizedToolkits };
    delete callArgs.action;
  }

  const response = await callComposioMcp(accessToken, 'tools/call', {
    name: toolName,
    arguments: callArgs,
  }, refreshToken);

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || String(response.error || 'MCP execution failed'),
      newAccessToken: response.newAccessToken,
    };
  }

  const content = response.result?.content || response.result;
  if (response.result?.isError) {
    return {
      success: false,
      data: content,
      error: mcpContentToText(content) || 'MCP tool reported an error',
      newAccessToken: response.newAccessToken,
      newRefreshToken: response.newRefreshToken,
    };
  }

  return {
    success: true,
    data: content,
    newAccessToken: response.newAccessToken,
    newRefreshToken: response.newRefreshToken,
  };
}


/**
 * Discover toolkit slugs from Composio's live catalog.
 * Never maintain an app-specific allow-list here.
 */
export async function listComposioToolkitSlugs(
  accessToken: string,
  refreshToken?: string,
  availableToolNames: string[] = []
): Promise<string[]> {
  const toolName = pickMcpToolName(
    availableToolNames,
    [/LIST_TOOLKITS/i],
    'COMPOSIO_LIST_TOOLKITS'
  );
  const response = await executeMcpTool(accessToken, toolName, {}, refreshToken);
  if (!response.success) return [];

  let raw: any = response.data;
  const text = mcpContentToText(raw);
  try { raw = JSON.parse(text); } catch {}

  const found = new Set<string>();
  const visit = (value: any) => {
    if (!value) return;
    if (Array.isArray(value)) {
      for (const item of value) visit(item);
      return;
    }
    if (typeof value !== 'object') return;
    for (const candidate of [value.slug, value.toolkit_slug, value.toolkitSlug]) {
      const slug = String(candidate || '').trim().toLowerCase();
      if (/^[a-z0-9][a-z0-9_-]{1,127}$/.test(slug)) found.add(slug);
    }
    for (const key of ['toolkits', 'items', 'results', 'data']) {
      if (value[key] !== undefined) visit(value[key]);
    }
  };
  visit(raw);
  return [...found];
}

/**
 * Read active connected accounts without assuming which apps exist.
 * Prefer Composio's bulk active-connection meta-tool; otherwise discover the
 * live toolkit catalog and query MANAGE_CONNECTIONS for those slugs.
 */
export async function listComposioActiveConnections(
  accessToken: string,
  refreshToken?: string,
  availableToolNames: string[] = []
): Promise<any[]> {
  // 1) Prefer Composio's live bulk connection checker when this MCP session
  // exposes it. This requires no guessed toolkit catalog at all.
  const checkTool = pickMcpToolName(
    availableToolNames,
    [/CHECK_ACTIVE_CONNECTIONS/i, /CHECK_ACTIVE_CONNECTION$/i],
    ''
  );
  if (checkTool) {
    const checked = await executeMcpTool(accessToken, checkTool, {}, refreshToken);
    if (checked.success) {
      const accounts = normalizeConnectedAccounts(checked.data);
      if (accounts.length > 0) return accounts;
    }
  }

  // Prefer the dedicated bulk active-connection meta-tool.
  const checkAllTool = pickMcpToolName(
    availableToolNames,
    [/CHECK_ACTIVE_CONNECTIONS/i],
    'COMPOSIO_CHECK_ACTIVE_CONNECTIONS'
  );
  const checkedAll = await executeMcpTool(
    accessToken,
    checkAllTool,
    { requests: [] },
    refreshToken
  );
  if (checkedAll.success) {
    const accounts = normalizeConnectedAccounts(checkedAll.data);
    if (accounts.length > 0) return accounts;
  }

  // 2) Ask MANAGE_CONNECTIONS directly for its complete active-account list.
  // Some Composio MCP sessions support this bulk form and do not expose a
  // separate toolkit catalog. Do not manufacture a zero-app result when that
  // happens.
  const manageTool = pickMcpToolName(
    availableToolNames,
    [/MANAGE_CONNECTIONS/i],
    'COMPOSIO_MANAGE_CONNECTIONS'
  );
  const bulk = await executeMcpTool(
    accessToken,
    manageTool,
    { action: 'list' },
    refreshToken
  );
  if (bulk.success) {
    const accounts = normalizeConnectedAccounts(bulk.data);
    if (accounts.length > 0) return accounts;
  }

  // 3) Last resort: discover the live toolkit catalog and query it in bounded
  // chunks. This remains fully dynamic and is only needed for MCP versions
  // that require explicit toolkit objects.
  const toolkitSlugs = await listComposioToolkitSlugs(accessToken, refreshToken, availableToolNames);
  if (toolkitSlugs.length === 0) {
    throw new Error(
      'Composio could not return active connections through its bulk connection tools or live toolkit catalog.'
    );
  }

  const chunkSize = 40;
  const allAccounts: any[] = [];
  let successfulChunks = 0;
  let lastError = '';

  for (let i = 0; i < toolkitSlugs.length; i += chunkSize) {
    const chunk = toolkitSlugs.slice(i, i + chunkSize);
    const managed = await executeMcpTool(
      accessToken,
      manageTool,
      { toolkits: chunk.map((name) => ({ name, action: 'list' })) },
      refreshToken
    );

    if (!managed.success) {
      lastError = String(managed.error || 'Composio connection listing failed');
      continue;
    }

    successfulChunks++;
    allAccounts.push(...normalizeConnectedAccounts(managed.data));
  }

  if (successfulChunks === 0) {
    throw new Error(lastError || 'Composio could not list connected accounts.');
  }

  const seen = new Set<string>();
  return allAccounts.filter((account: any) => {
    const id = String(
      account?.id ||
      account?.connected_account_id ||
      account?.connectedAccountId ||
      account?.alias ||
      JSON.stringify(account)
    );
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}



/**
 * Flatten MCP `content` blocks (or any value) into plain text for the model.
 */
export function mcpContentToText(data: any): string {
  if (data === undefined || data === null) return '';
  if (typeof data === 'string') return data;
  if (Array.isArray(data)) {
    return data
      .map((item: any) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.text === 'string') return item.text;
        return JSON.stringify(item);
      })
      .join('\n');
  }
  return JSON.stringify(data);
}

/**
 * Pick the real tool name from the live MCP tool list, falling back to a known slug.
 */
export function pickMcpToolName(available: string[], patterns: RegExp[], fallback: string): string {
  for (const pattern of patterns) {
    const hit = available.find((name) => pattern.test(name));
    if (hit) return hit;
  }
  return fallback;
}

function trimSchemaText(node: any, max: number): any {
  if (Array.isArray(node)) return node.map((n) => trimSchemaText(n, max));
  if (node && typeof node === 'object') {
    const out: Record<string, any> = {};
    for (const [key, value] of Object.entries(node)) {
      if (key === '$schema') continue;
      if (key === 'description' && typeof value === 'string') {
        out[key] = value.length > max ? value.slice(0, max) + '...' : value;
      } else if (key === 'examples') {
        continue;
      } else {
        out[key] = trimSchemaText(value, max);
      }
    }
    return out;
  }
  return node;
}

/**
 * Convert live MCP tool schemas to OpenAI-style function tools, keeping the
 * exact MCP tool names so calls can be passed straight back to the server.
 */
export function mcpToolsToOpenAI(tools: McpToolSchema[]): any[] {
  return tools
    .filter((tool) => tool && typeof tool.name === 'string' && /^[a-zA-Z0-9_-]{1,64}$/.test(tool.name))
    .map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: String(tool.description || tool.name).slice(0, 700),
        parameters: trimSchemaText(
          tool.inputSchema && typeof tool.inputSchema === 'object'
            ? tool.inputSchema
            : { type: 'object', properties: {} },
          220
        ),
      },
    }));
}

const MCP_TOOL_CACHE = new Map<string, { at: number; tools: McpToolSchema[] }>();

/**
 * tools/list with a short in-memory cache so every chat request does not pay for it.
 */
export async function listMcpToolsCached(
  accessToken: string,
  refreshToken?: string,
  ttlMs = 5 * 60 * 1000
): Promise<McpToolSchema[]> {
  const result = await listMcpToolsCachedWithAuth(accessToken, refreshToken, ttlMs);
  return result.tools;
}

/**
 * Cached tools/list that also tells the caller when a refresh produced a
 * replacement access token. Hosts should persist that token in their
 * HttpOnly session cookie before the next request.
 */
export async function listMcpToolsCachedWithAuth(
  accessToken: string,
  refreshToken?: string,
  ttlMs = 5 * 60 * 1000
): Promise<{ tools: McpToolSchema[]; accessToken: string; refreshToken?: string; refreshed: boolean; debug?: string }> {
  const hit = MCP_TOOL_CACHE.get(accessToken);
  if (hit && Date.now() - hit.at < ttlMs && hit.tools.length > 0) {
    return { tools: hit.tools, accessToken, refreshToken, refreshed: false, debug: 'cache-hit' };
  }

  const response = await callComposioMcp(accessToken, 'tools/list', {}, refreshToken);
  const tools = response.success && Array.isArray(response.result?.tools)
    ? response.result.tools as McpToolSchema[]
    : [];
  const activeAccessToken = response.newAccessToken || accessToken;

  if (tools.length > 0) {
    MCP_TOOL_CACHE.set(activeAccessToken, { at: Date.now(), tools });
  }

  return {
    tools,
    accessToken: activeAccessToken,
    refreshToken: response.newRefreshToken || refreshToken,
    refreshed: Boolean(response.newAccessToken),
    debug: `tools=${tools.length} success=${response.success} err=${String(response.error || '').slice(0, 160)} refreshed=${Boolean(response.newAccessToken)} hadRefresh=${Boolean(refreshToken)}`,
  };
}
