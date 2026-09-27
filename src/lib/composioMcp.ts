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
 * Call JSON-RPC 2.0 method on Composio MCP server with user AuthKit JWT
 */
export async function callComposioMcp(
  accessToken: string,
  method: string,
  params: any = {}
): Promise<{ success: boolean; result?: any; error?: any }> {
  try {
    const id = Date.now();
    const res = await fetch(COMPOSIO_MCP_SERVER_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id,
        method,
        params,
      }),
      cache: 'no-store',
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return {
        success: false,
        error: `MCP server responded with status ${res.status}: ${errText}`,
      };
    }

    const payload = await res.json().catch(() => ({}));
    if (payload.error) {
      return {
        success: false,
        error: payload.error.message || payload.error,
      };
    }

    return {
      success: true,
      result: payload.result,
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
export async function listMcpTools(accessToken: string): Promise<McpToolSchema[]> {
  const response = await callComposioMcp(accessToken, 'tools/list', {});
  if (response.success && Array.isArray(response.result?.tools)) {
    return response.result.tools;
  }
  return [];
}

/**
 * Execute an MCP tool on the Composio "For You" server
 */
export async function executeMcpTool(
  accessToken: string,
  toolName: string,
  args: any = {}
): Promise<{ success: boolean; data?: any; error?: string }> {
  const response = await callComposioMcp(accessToken, 'tools/call', {
    name: toolName,
    arguments: args,
  });

  if (!response.success) {
    return {
      success: false,
      error: response.error?.message || String(response.error || 'MCP execution failed'),
    };
  }

  return {
    success: true,
    data: response.result?.content || response.result,
  };
}
