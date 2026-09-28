import type { Connector } from '@/types/chat';

export interface RemoteMcpTool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

interface McpEnvelope {
  payload: any;
  sessionId?: string;
}

interface RemoteState {
  sessionId?: string;
  initialized: boolean;
}

const REMOTE_STATE = new Map<string, RemoteState>();

function safeUrl(raw: string): URL {
  const url = new URL(String(raw || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Remote MCP URL must use HTTP or HTTPS.');

  const host = url.hostname.toLowerCase();
  const blocked =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host === 'metadata.google.internal' ||
    host === 'metadata' ||
    host === 'host.docker.internal';

  if (blocked) throw new Error('Local/private MCP URLs are not reachable from the cloud connector runtime.');
  return url;
}

function baseHeaders(connector: Connector): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };

  const cfg: any = connector.config || {};
  const token = String(cfg.authToken || cfg.apiKey || '').trim();
  if (token) headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`;

  if (cfg.headers && typeof cfg.headers === 'object') {
    for (const [key, value] of Object.entries(cfg.headers)) {
      if (!/^(authorization|accept|content-type|x-[a-z0-9-]+)$/i.test(key)) continue;
      headers[key] = String(value);
    }
  }

  return headers;
}

async function readEnvelope(response: Response): Promise<McpEnvelope> {
  const sessionId = response.headers.get('mcp-session-id') || response.headers.get('Mcp-Session-Id') || undefined;
  const type = response.headers.get('content-type') || '';
  if (type.includes('text/event-stream')) {
    const raw = await response.text();
    let payload: any = null;
    for (const line of raw.split(/\r?\n/)) {
      if (!line.startsWith('data:')) continue;
      const value = line.slice(5).trim();
      if (!value) continue;
      try {
        const parsed = JSON.parse(value);
        if (parsed?.result !== undefined || parsed?.error) payload = parsed;
      } catch {}
    }
    return { payload, sessionId };
  }

  return {
    payload: await response.json().catch(() => ({})),
    sessionId,
  };
}

async function rpc(
  connector: Connector,
  method: string,
  params: any = {},
  allowError = false
): Promise<McpEnvelope> {
  const cfg: any = connector.config || {};
  const endpoint = safeUrl(String(cfg.mcpUrl || connector.url || ''));

  const key = connector.id + '::' + endpoint.toString();
  const state = REMOTE_STATE.get(key) || { initialized: false };

  const headers = baseHeaders(connector);
  if (state.sessionId) headers['Mcp-Session-Id'] = state.sessionId;

  const response = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
    cache: 'no-store',
  });

  if (!response.ok && !allowError) {
    const body = await response.text().catch(() => '');
    throw new Error(`Remote MCP ${response.status}: ${body.slice(0, 1200)}`);
  }

  const envelope = await readEnvelope(response);
  if (envelope.sessionId) {
    state.sessionId = envelope.sessionId;
    REMOTE_STATE.set(key, state);
  }

  if (envelope.payload?.error) {
    throw new Error(envelope.payload.error.message || JSON.stringify(envelope.payload.error));
  }

  return envelope;
}

async function initializeRemote(connector: Connector): Promise<void> {
  const cfg: any = connector.config || {};
  const endpoint = safeUrl(String(cfg.mcpUrl || connector.url || ''));
  const key = connector.id + '::' + endpoint.toString();
  const state = REMOTE_STATE.get(key);
  if (state?.initialized) return;

  const envelope = await rpc(connector, 'initialize', {
    protocolVersion: String(cfg.protocolVersion || '2025-06-18'),
    capabilities: {},
    clientInfo: {
      name: 'sameer-ai-workspace',
      version: '1.0.0',
    },
  });

  const next: RemoteState = {
    initialized: true,
    sessionId: envelope.sessionId || state?.sessionId,
  };
  REMOTE_STATE.set(key, next);

  // Streamable HTTP MCP servers expect this notification after initialize.
  const headers = baseHeaders(connector);
  if (next.sessionId) headers['Mcp-Session-Id'] = next.sessionId;
  await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'notifications/initialized',
      params: {},
    }),
    cache: 'no-store',
  }).catch(() => {});
}

export async function listRemoteMcpTools(connector: Connector): Promise<RemoteMcpTool[]> {
  await initializeRemote(connector);
  const envelope = await rpc(connector, 'tools/list', {});
  const tools = Array.isArray(envelope.payload?.result?.tools) ? envelope.payload.result.tools : [];

  return tools
    .filter((tool: any) => tool && typeof tool.name === 'string')
    .slice(0, 100)
    .map((tool: any) => ({
      type: 'function' as const,
      function: {
        name: `REMOTE_MCP_${String(connector.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 12)}_${String(tool.name).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 32)}`,
        description: `[${connector.name}] ${String(tool.description || tool.name).slice(0, 650)}`,
        parameters:
          tool.inputSchema && typeof tool.inputSchema === 'object'
            ? tool.inputSchema
            : { type: 'object', properties: {} },
      },
    }));
}

export async function callRemoteMcpTool(
  connector: Connector,
  exposedToolName: string,
  originalToolName: string,
  args: Record<string, any> = {}
): Promise<string> {
  await initializeRemote(connector);
  const envelope = await rpc(connector, 'tools/call', {
    name: originalToolName,
    arguments: args,
  });

  const result = envelope.payload?.result;
  if (result?.isError) throw new Error(contentToText(result?.content) || 'Remote MCP tool failed.');
  return contentToText(result?.content ?? result);
}

function contentToText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) {
    return value.map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item.text === 'string') return item.text;
      return JSON.stringify(item);
    }).join('\n');
  }
  return JSON.stringify(value);
}
