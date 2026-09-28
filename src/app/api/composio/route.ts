import { NextRequest, NextResponse } from 'next/server';
import {
  getMcpOAuthUrl,
  callComposioMcp,
  listMcpTools,
  executeMcpTool,
  DEFAULT_COMPOSIO_TOOLKITS,
} from '@/lib/composioMcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const SUPPORTED_APPS = [
  'github',
  'gmail',
  'google_drive',
  'google_calendar',
  'youtube',
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
    const mcpToken =
      req.cookies.get('composio_mcp_token')?.value ||
      req.cookies.get('composio_mcp_access_token')?.value ||
      req.headers.get('x-composio-mcp-token') ||
      '';
    const mcpRefreshToken =
      req.cookies.get('composio_mcp_refresh_token')?.value ||
      req.headers.get('x-composio-mcp-refresh-token') ||
      '';

    const mcpConnected = Boolean(mcpToken);

    if (mcpConnected) {
      // User is connected to "For You" MCP
      let tools: any[] = [];
      let connectedAccounts: any[] = [];
      try {
        tools = await listMcpTools(mcpToken, mcpRefreshToken);
        const connRes = await executeMcpTool(mcpToken, 'COMPOSIO_MANAGE_CONNECTIONS', { toolkits: DEFAULT_COMPOSIO_TOOLKITS }, mcpRefreshToken);
        if (connRes.success && connRes.data) {
          const raw = connRes.data;
          const list = raw?.connections || raw?.connected_accounts || raw?.accounts || (Array.isArray(raw) ? raw : []);
          connectedAccounts = list;
        }
      } catch {}

      return withUserCookie(
        NextResponse.json({
          configured: true,
          mode: 'for_you',
          mcpConnected: true,
          userId: entityId,
          tools,
          connectedAccounts,
          supportedApps: SUPPORTED_APPS,
        }),
        entityId
      );
    }

    // When not connected to For You MCP: strictly unconfigured with 0 accounts
    return withUserCookie(
      NextResponse.json({
        configured: false,
        mode: 'unconfigured',
        mcpConnected: false,
        userId: entityId,
        tools: [],
        connectedAccounts: [],
        supportedApps: SUPPORTED_APPS,
        message:
          'Composio "For You" is not connected yet. Click Connectors to connect your personal Composio account.',
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
    const { action, toolName, actionName, input, args } = body || {};

    const origin = new URL(req.url).origin;

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
      const mcpToken =
        req.cookies.get('composio_mcp_token')?.value ||
        req.cookies.get('composio_mcp_access_token')?.value ||
        req.headers.get('x-composio-mcp-token');
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
      res.cookies.set('composio_mcp_access_token', '', { path: '/', maxAge: 0 });
      res.cookies.set('composio_mcp_refresh_token', '', { path: '/', maxAge: 0 });
      res.cookies.set('composio_mcp_connected', 'false', { path: '/', maxAge: 0 });
      res.cookies.set('sameer_composio_user_id', '', { path: '/', maxAge: 0 });
      return res;
    }

    // Execute via "For You" MCP
    if (action === 'execute_mcp') {
      const mcpToken =
        req.cookies.get('composio_mcp_token')?.value ||
        req.cookies.get('composio_mcp_access_token')?.value ||
        req.headers.get('x-composio-mcp-token') ||
        body?.mcpToken ||
        '';
      const mcpRefreshToken =
        req.cookies.get('composio_mcp_refresh_token')?.value ||
        req.headers.get('x-composio-mcp-refresh-token') ||
        body?.mcpRefreshToken ||
        '';
      if (!mcpToken) {
        return NextResponse.json(
          { success: false, error: 'Composio For You is not connected. Sign in via MCP.' },
          { status: 401 }
        );
      }
      const result = await executeMcpTool(
        mcpToken,
        String(toolName || actionName),
        args || input || {},
        mcpRefreshToken
      );
      return NextResponse.json(result, { status: result.success ? 200 : 502 });
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Unsupported action. All operations must connect via Composio "For You" MCP.',
      },
      { status: 400 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Composio request failed.' },
      { status: 500 }
    );
  }
}
