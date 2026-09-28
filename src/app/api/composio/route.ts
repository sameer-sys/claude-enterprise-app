import { NextRequest, NextResponse } from 'next/server';
import {
  listConnectedAccounts,
  initiateAppConnection,
  executeComposioAction,
  getComposioApiKey,
  COMPOSIO_APP_MAP,
} from '@/lib/composio';
import {
  getMcpOAuthUrl,
  callComposioMcp,
  listMcpTools,
  executeMcpTool,
} from '@/lib/composioMcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveKey() {
  return getComposioApiKey();
}

function resolveUserId(req: NextRequest): string {
  return req.cookies.get('sameer_composio_user_id')?.value || `sameer_${crypto.randomUUID()}`;
}

function withUserCookie(response: NextResponse, userId: string): NextResponse {
  response.cookies.set('sameer_composio_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

export async function GET(req: NextRequest) {
  try {
    const entityId = resolveUserId(req);
    const mcpToken = req.cookies.get('composio_mcp_token')?.value || '';
    const apiKey = await resolveKey();

    // Check if Composio "For You" MCP is connected
    const mcpConnected = Boolean(mcpToken);

    if (mcpConnected) {
      // User is connected to "For You" MCP
      let tools: any[] = [];
      try {
        tools = await listMcpTools(mcpToken);
      } catch {}

      return withUserCookie(
        NextResponse.json({
          configured: true,
          mode: 'for_you',
          mcpConnected: true,
          apiKeyConfigured: Boolean(apiKey),
          userId: entityId,
          tools,
          connectedAccounts: [],
          supportedApps: Object.keys(COMPOSIO_APP_MAP),
        }),
        entityId
      );
    }

    if (!apiKey) {
      return withUserCookie(
        NextResponse.json({
          configured: false,
          mode: 'unconfigured',
          mcpConnected: false,
          apiKeyConfigured: false,
          connectedAccounts: [],
          supportedApps: Object.keys(COMPOSIO_APP_MAP),
          message: 'Neither Composio For You MCP nor COMPOSIO_API_KEY is configured.',
        }),
        entityId
      );
    }

    const accounts = await listConnectedAccounts(apiKey, entityId);
    return withUserCookie(
      NextResponse.json({
        configured: true,
        mode: 'platform',
        mcpConnected: false,
        apiKeyConfigured: true,
        userId: entityId,
        connectedAccounts: accounts,
        supportedApps: Object.keys(COMPOSIO_APP_MAP),
      }),
      entityId
    );
  } catch (err: any) {
    return NextResponse.json(
      { configured: false, error: err?.message || 'Composio status lookup failed.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      appName,
      redirectUrl,
      actionName,
      input,
      connectedAccountId,
      toolName,
      args,
    } = body || {};

    const origin = new URL(req.url).origin;
    const entityId = resolveUserId(req);

    // ========================================================
    // 1. "FOR YOU" MCP ACTIONS
    // ========================================================

    // Get OAuth URL for signing in to Composio "For You"
    if (action === 'get_mcp_oauth_url') {
      const { authUrl, codeVerifier, state } = getMcpOAuthUrl(origin);
      const res = NextResponse.json({ success: true, authUrl });

      res.cookies.set('composio_pkce_verifier', codeVerifier, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600, // 10 minutes
      });
      res.cookies.set('composio_pkce_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 600,
      });

      return res;
    }

    // Check "For You" MCP connection status
    if (action === 'check_mcp_status') {
      const mcpToken = req.cookies.get('composio_mcp_token')?.value;
      return NextResponse.json({
        success: true,
        connected: Boolean(mcpToken),
        mode: mcpToken ? 'for_you' : 'none',
      });
    }

    // Disconnect "For You" MCP
    if (action === 'disconnect_mcp') {
      const res = NextResponse.json({ success: true, connected: false });
      res.cookies.set('composio_mcp_token', '', { path: '/', maxAge: 0 });
      res.cookies.set('composio_mcp_refresh_token', '', { path: '/', maxAge: 0 });
      res.cookies.set('composio_mcp_connected', 'false', { path: '/', maxAge: 0 });
      res.cookies.set('sameer_composio_user_id', '', { path: '/', maxAge: 0 });
      return res;
    }

    // Execute via "For You" MCP
    if (action === 'execute_mcp') {
      const mcpToken = req.cookies.get('composio_mcp_token')?.value;
      if (!mcpToken) {
        return NextResponse.json(
          { success: false, error: 'Composio For You is not connected. Sign in via MCP.' },
          { status: 401 }
        );
      }
      const result = await executeMcpTool(mcpToken, String(toolName || actionName), args || input || {});
      return NextResponse.json(result, { status: result.success ? 200 : 502 });
    }

    // ========================================================
    // 2. PLATFORM ACTIONS (LEGACY FALLBACK)
    // ========================================================
    const apiKey = await resolveKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Composio is not configured. Connect via Composio "For You" or set COMPOSIO_API_KEY.',
        },
        { status: 503 }
      );
    }

    if (action === 'connect') {
      if (!appName || !entityId) {
        return NextResponse.json({ success: false, error: 'appName is required.' }, { status: 400 });
      }
      const result = await initiateAppConnection(
        apiKey,
        String(appName),
        String(entityId),
        redirectUrl || new URL('/api/composio/callback', req.url).toString()
      );
      return withUserCookie(NextResponse.json(result, { status: result.success ? 200 : 502 }), entityId);
    }

    if (action === 'disconnect') {
      if (!connectedAccountId) {
        return NextResponse.json({ success: false, error: 'connectedAccountId is required.' }, { status: 400 });
      }
      const res = await fetch(
        'https://backend.composio.dev/api/v3.1/connected_accounts/' + encodeURIComponent(String(connectedAccountId)),
        {
          method: 'DELETE',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json(
          { success: false, error: data?.error?.message || data?.message || 'Composio disconnect failed.' },
          { status: res.status }
        );
      }
      return NextResponse.json({ success: true, connectedAccountId });
    }

    if (action === 'execute') {
      if (!actionName) {
        return NextResponse.json({ success: false, error: 'actionName is required.' }, { status: 400 });
      }
      const result = await executeComposioAction(
        apiKey,
        String(actionName),
        input || {},
        connectedAccountId,
        String(entityId)
      );
      return NextResponse.json(result, { status: result.success ? 200 : 502 });
    }

    return NextResponse.json({ success: false, error: 'Unknown Composio action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Composio request failed.' }, { status: 500 });
  }
}
