import { NextRequest, NextResponse } from 'next/server';
import { listMcpTools } from '@/lib/composioMcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Safe Composio connectivity diagnostic.
 *
 * The UI must not maintain a second account registry. Composio owns connected
 * account state and resolves it dynamically during SEARCH_TOOLS / execution.
 * This endpoint therefore verifies the MCP session and the live meta tools
 * instead of displaying a misleading "0 accounts" result.
 */
export async function GET(req: NextRequest) {
  const mcpToken =
    req.cookies.get('composio_mcp_token')?.value ||
    req.cookies.get('composio_mcp_access_token')?.value ||
    req.headers.get('x-composio-mcp-token') || '';
  const mcpRefreshToken =
    req.cookies.get('composio_mcp_refresh_token')?.value ||
    req.headers.get('x-composio-mcp-refresh-token') || '';

  if (!mcpToken) {
    return NextResponse.json({
      ok: false,
      connected: false,
      error: 'No Composio MCP session is connected in this browser.',
    });
  }

  try {
    const tools = await listMcpTools(mcpToken, mcpRefreshToken);
    const names = tools.map((tool: any) => String(tool?.name || '')).filter(Boolean);
    const metaTools = names.filter((name) => /^COMPOSIO_/i.test(name));

    return NextResponse.json({
      ok: true,
      connected: true,
      runtime: 'composio-mcp',
      toolCount: names.length,
      metaTools,
      message: 'Composio MCP is connected. App/tool accounts are resolved dynamically by Composio at task time.',
    });
  } catch (err: any) {
    return NextResponse.json({
      ok: false,
      connected: true,
      error: String(err?.message || err),
    }, { status: 502 });
  }
}
