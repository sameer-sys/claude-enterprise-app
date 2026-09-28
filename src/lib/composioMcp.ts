import crypto from 'crypto';

export const COMPOSIO_MCP_CLIENT_ID = 'client_01M3HAWYDCAGAF1QYM64SGC9NY';
export const COMPOSIO_MCP_AUTH_ENDPOINT = 'https://connect.composio.dev/oauth/authorize';
export const COMPOSIO_MCP_TOKEN_ENDPOINT = 'https://login.composio.dev/oauth2/token';
export const COMPOSIO_MCP_SERVER_URL = 'https://connect.composio.dev/mcp';

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
): Promise<{ success: boolean; result?: any; error?: any; newAccessToken?: string }> {
  try {
    const doFetch = async (token: string) => {
      const id = Date.now();
      return fetch(COMPOSIO_MCP_SERVER_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
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
    let res = await doFetch(activeToken);

    // Auto-refresh token if 401 Unauthorized or 403 Forbidden
    if ((res.status === 401 || res.status === 403) && refreshToken) {
      console.warn('[MCP AUTO-REFRESH] Access token expired or invalid. Attempting refresh...');
      const refreshed = await refreshMcpToken(refreshToken);
      if (refreshed.success && refreshed.tokens?.access_token) {
        activeToken = refreshed.tokens.access_token;
        newAccessToken = activeToken;
        res = await doFetch(activeToken);
      }
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `MCP server responded with status ${res.status}: ${errText}`,
        newAccessToken,
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
      };
    }

    return {
      success: true,
      result: payload.result,
      newAccessToken,
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

export const DEFAULT_COMPOSIO_TOOLKITS = [
  'youtube',
  'github',
  'gmail',
  'googlecalendar',
  'googledrive',
  'slack',
  'notion',
  'discord',
  'linear',
  'asana',
  'jira',
  'trello',
  'hubspot',
  'salesforce',
  'shopify',
  'reddit',
  'telegram',
  'whatsapp',
  'microsoft365',
];

export async function executeMcpTool(
  accessToken: string,
  toolName: string,
  args: Record<string, any> = {},
  refreshToken?: string
): Promise<{ success: boolean; data?: any; error?: string; newAccessToken?: string }> {
  let callArgs = args || {};
  if (/MANAGE_CONNECTIONS/i.test(toolName)) {
    if (!callArgs.toolkits || !Array.isArray(callArgs.toolkits) || callArgs.toolkits.length === 0) {
      callArgs = { ...callArgs, toolkits: DEFAULT_COMPOSIO_TOOLKITS };
    }
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
    };
  }

  return {
    success: true,
    data: content,
    newAccessToken: response.newAccessToken,
  };
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
): Promise<{ tools: McpToolSchema[]; accessToken: string; refreshed: boolean }> {
  const hit = MCP_TOOL_CACHE.get(accessToken);
  if (hit && Date.now() - hit.at < ttlMs && hit.tools.length > 0) {
    return { tools: hit.tools, accessToken, refreshed: false };
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
    refreshed: Boolean(response.newAccessToken),
  };
}
