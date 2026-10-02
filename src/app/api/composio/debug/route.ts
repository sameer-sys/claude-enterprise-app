import { NextRequest, NextResponse } from 'next/server';
import { executeMcpTool, DEFAULT_COMPOSIO_TOOLKITS } from '@/lib/composioMcp';

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
  const attempts = [
    { label: 'default-toolkit-list', args: { action: 'list', toolkits: DEFAULT_COMPOSIO_TOOLKITS } },
    { label: 'no-toolkits', args: { action: 'list' } },
  ];

  for (const attempt of attempts) {
    try {
      const res = await executeMcpTool(mcpToken, 'COMPOSIO_MANAGE_CONNECTIONS', attempt.args, mcpRefreshToken);
      results[attempt.label] = {
        success: res.success,
        error: res.error || null,
        data: res.data,
      };
    } catch (err: any) {
      results[attempt.label] = { success: false, error: String(err?.message || err) };
    }
  }

  return NextResponse.json({ ok: true, results });
}