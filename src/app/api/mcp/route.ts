import { NextRequest, NextResponse } from 'next/server';
import type { Connector } from '@/types/chat';
import { listRemoteMcpTools } from '@/lib/remoteMcp';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    if (body?.action !== 'check') {
      return NextResponse.json(
        { success: false, error: 'Unsupported MCP action.' },
        { status: 400 }
      );
    }

    const input = body?.connector;
    const name = String(input?.name || '').trim();
    const url = String(input?.config?.mcpUrl || input?.url || '').trim();

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: 'Connector name and remote MCP URL are required.' },
        { status: 400 }
      );
    }

    const parsed = new URL(url);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return NextResponse.json(
        { success: false, error: 'Remote MCP URL must use HTTP or HTTPS.' },
        { status: 400 }
      );
    }

    const connector: Connector = {
      id: String(input?.id || ('mcp-' + Date.now())),
      name,
      description: String(input?.description || ('Remote MCP server at ' + url)),
      icon: String(input?.icon || 'composio'),
      enabled: true,
      status: 'ready',
      category: 'Integrations',
      isCustom: true,
      isVerified: true,
      provider: 'mcp',
      config: {
        ...(input?.config && typeof input.config === 'object' ? input.config : {}),
        connectionType: 'mcp',
        providerName: name,
        mcpUrl: url,
      },
      url,
    };

    const tools = await listRemoteMcpTools(connector);

    return NextResponse.json({
      success: true,
      connector: name,
      url,
      toolCount: tools.length,
      tools: tools.slice(0, 20).map((tool) => ({
        name: tool.function.name,
        description: tool.function.description,
      })),
    });
  } catch (err: any) {
    const message = String(err?.message || 'Remote MCP server check failed.');
    const requiresAuth = /(?:401|403|unauthorized|forbidden|authentication|oauth)/i.test(message);

    return NextResponse.json(
      {
        success: false,
        requiresAuth,
        error: message,
      },
      { status: requiresAuth ? 401 : 502 }
    );
  }
}
