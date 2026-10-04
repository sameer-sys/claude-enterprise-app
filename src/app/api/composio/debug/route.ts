import { NextRequest, NextResponse } from 'next/server';
import { executeMcpTool, listComposioActiveConnections } from '@/lib/composioMcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * Diagnostic endpoint: returns the RAW COMPOSIO_MANAGE_CONNECTIONS response
 * for the caller's session so we can see exactly what Composio reports
 * instead of guessing from the formatted UI text.
 *
 * Tokens are never echoed back. Only the response body and status are shown.
 *
 * NOTE: only read-only 'list' forms are tested. The '*' wildcard is NOT
 * included because Composio treats it as an initiate-all call, which has
 * side effects.
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
    return NextResponse.json({ ok: false, error: 'no composio_mcp_token cookie present in this browser' });
  }

  const results: Record<string, any> = {};
  try {
    const accounts = await listComposioActiveConnections(mcpToken, mcpRefreshToken);
    results['dynamic-active-connections'] = {
      success: true,
      count: accounts.length,
      data: accounts,
    };
  } catch (err: any) {
    results['dynamic-active-connections'] = {
      success: false,
      error: String(err?.message || err),
    };
  }

  return NextResponse.json({ ok: true, results });
}