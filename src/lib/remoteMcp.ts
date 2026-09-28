import type { Connector } from '@/types/chat';
import { refreshRemoteAccessToken, type RemoteStoredToken } from '@/lib/remoteMcpAuth';

export interface RemoteMcpTool {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, any> };
  originalName?: string;
}

interface McpEnvelope { payload: any; sessionId?: string; status: number; }
interface RemoteState { sessionId?: string; initialized: boolean; protocolVersion?: string; }
interface RemoteMcpOptions {
  credentials?: RemoteStoredToken;
  onCredentialsUpdated?: (token: RemoteStoredToken) => void;
}

const REMOTE_STATE = new Map<string, RemoteState>();
let REQUEST_ID = 0;

function nextRequestId(): number {
  REQUEST_ID = (REQUEST_ID + 1) % 2147483647;
  return Date.now() * 1000 + REQUEST_ID;
}

export function safeRemoteMcpUrl(raw: string): URL {
  const url = new URL(String(raw || '').trim());
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Remote MCP URL must use HTTP or HTTPS.');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host === 'metadata.google.internal' || host === 'metadata' || host === 'host.docker.internal' || host === 'kubernetes.default.svc') {
    throw new Error('Local/private MCP URLs are not reachable from the cloud connector runtime.');
  }
  const ipv4 = host.match(/^\d{1,3}(?:\.\d{1,3}){3}$/);
  if (ipv4) {
    const [a, b] = host.split('.').map(Number);
    if ([a, b, ...host.split('.').slice(2).map(Number)].some((n) => n < 0 || n > 255)) throw new Error('Invalid MCP hostname.');
    if (a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224) throw new Error('Local/private MCP URLs are not reachable from the cloud connector runtime.');
  }
  if (host === '::1' || host.startsWith('fe80:') || host.startsWith('fc') || host.startsWith('fd') || host.startsWith('::ffff:127.') || host.startsWith('::ffff:10.') || host.startsWith('::ffff:192.168.')) throw new Error('Local/private MCP URLs are not reachable from the cloud connector runtime.');
  return url;
}

function baseHeaders(connector: Connector, credentials?: RemoteStoredToken): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/json, text/event-stream',
    'Content-Type': 'application/json',
  };
  const cfg: any = connector.config || {};
  const token = String(credentials?.accessToken || cfg.authToken || cfg.apiKey || '').trim();
  if (token) headers.Authorization = (credentials?.tokenType || 'Bearer') + ' ' + token;
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
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 202 || response.status === 204) return { payload: null, sessionId, status: response.status };
  if (contentType.includes('text/event-stream')) {
    const raw = await response.text();
    let payload: any = null;
    for (const block of raw.split(/\r?\n\r?\n/)) {
      const dataLines = block.split(/\r?\n/).filter((line) => line.startsWith('data:')).map((line) => line.slice(5).trim()).filter(Boolean);
      if (!dataLines.length) continue;
      const value = dataLines.join('\n');
      try {
        const parsed = JSON.parse(value);
        if (parsed?.result !== undefined || parsed?.error) payload = parsed;
      } catch {}
    }
    return { payload, sessionId, status: response.status };
  }
  const text = await response.text().catch(() => '');
  let payload: any = {};
  try { payload = text ? JSON.parse(text) : {}; } catch { payload = { raw: text }; }
  return { payload, sessionId, status: response.status };
}

async function rpc(connector: Connector, method: string, params: any = {}, options: RemoteMcpOptions = {}, allowError = false): Promise<McpEnvelope> {
  const cfg: any = connector.config || {};
  const endpoint = safeRemoteMcpUrl(String(cfg.mcpUrl || connector.url || ''));
  const key = connector.id + '::' + endpoint.toString();
  const state = REMOTE_STATE.get(key) || { initialized: false };

  const doFetch = async (credentials?: RemoteStoredToken) => {
    const headers = baseHeaders(connector, credentials);
    if (state.sessionId) headers['Mcp-Session-Id'] = state.sessionId;
    headers['Mcp-Method'] = method;
    if (method === 'tools/call' && params?.name) headers['Mcp-Name'] = String(params.name).slice(0, 256);
    return fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: nextRequestId(), method, params }),
      cache: 'no-store',
      signal: AbortSignal.timeout(30000),
    });
  };

  let credentials = options.credentials;
  let response = await doFetch(credentials);
  if ((response.status === 401 || response.status === 403) && credentials?.refreshToken) {
    const refreshed = await refreshRemoteAccessToken(credentials);
    if (refreshed) {
      credentials = refreshed;
      options.onCredentialsUpdated?.(refreshed);
      response = await doFetch(credentials);
    }
  }

  if (!response.ok && !allowError) {
    const body = await response.text().catch(() => '');
    const error: any = new Error('Remote MCP ' + response.status + ': ' + body.slice(0, 1400));
    error.status = response.status;
    error.wwwAuthenticate = response.headers.get('www-authenticate') || undefined;
    throw error;
  }

  const envelope = await readEnvelope(response);
  if (envelope.sessionId) {
    state.sessionId = envelope.sessionId;
    REMOTE_STATE.set(key, state);
  }
  if (envelope.payload?.error) {
    const error: any = new Error(envelope.payload.error.message || JSON.stringify(envelope.payload.error));
    error.status = envelope.payload.error?.code;
    throw error;
  }
  return envelope;
}

async function initializeRemote(connector: Connector, options: RemoteMcpOptions = {}): Promise<void> {
  const cfg: any = connector.config || {};
  const endpoint = safeRemoteMcpUrl(String(cfg.mcpUrl || connector.url || ''));
  const key = connector.id + '::' + endpoint.toString();
  const existing = REMOTE_STATE.get(key);
  if (existing?.initialized) return;

  const versions = Array.from(new Set([String(cfg.protocolVersion || ''), '2026-07-28', '2025-11-25', '2025-06-18'].filter(Boolean)));
  let lastError: any;
  for (const version of versions) {
    try {
      const envelope = await rpc(connector, 'initialize', {
        protocolVersion: version,
        capabilities: { extensions: {} },
        clientInfo: { name: 'sameer-ai-workspace', version: '2.0.0' },
      }, options);
      const negotiated = String(envelope.payload?.result?.protocolVersion || version);
      REMOTE_STATE.set(key, { initialized: true, sessionId: envelope.sessionId, protocolVersion: negotiated });

      const headers = baseHeaders(connector, options.credentials);
      if (envelope.sessionId) headers['Mcp-Session-Id'] = envelope.sessionId;
      headers['Mcp-Method'] = 'notifications/initialized';
      await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }),
        cache: 'no-store',
        signal: AbortSignal.timeout(10000),
      }).catch(() => {});
      return;
    } catch (err: any) {
      lastError = err;
      const text = String(err?.message || '').toLowerCase();
      if (!text.includes('protocol') && !text.includes('version') && err?.status !== -32602 && err?.status !== 400) break;
    }
  }
  throw lastError || new Error('Remote MCP initialization failed.');
}

export async function listRemoteMcpTools(connector: Connector, options: RemoteMcpOptions = {}): Promise<RemoteMcpTool[]> {
  await initializeRemote(connector, options);
  const envelope = await rpc(connector, 'tools/list', {}, options);
  const tools = Array.isArray(envelope.payload?.result?.tools) ? envelope.payload.result.tools : [];
  return tools.filter((tool: any) => tool && typeof tool.name === 'string').slice(0, 100).map((tool: any) => ({
    type: 'function' as const,
    originalName: String(tool.name),
    function: {
      name: 'REMOTE_MCP_' + String(connector.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 12) + '_' + String(tool.name).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 44),
      description: '[' + connector.name + '] ' + String(tool.description || tool.name).slice(0, 700),
      parameters: tool.inputSchema && typeof tool.inputSchema === 'object' ? tool.inputSchema : { type: 'object', properties: {} },
    },
  }));
}

export async function callRemoteMcpTool(connector: Connector, _exposedToolName: string, originalToolName: string, args: Record<string, any> = {}, options: RemoteMcpOptions = {}): Promise<string> {
  await initializeRemote(connector, options);
  const envelope = await rpc(connector, 'tools/call', { name: originalToolName, arguments: args }, options);
  const result = envelope.payload?.result;
  if (result?.isError) throw new Error(contentToText(result?.content) || 'Remote MCP tool failed.');
  return contentToText(result?.content ?? result);
}

function contentToText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : item?.text ? item.text : JSON.stringify(item)).join('\n');
  if (value?.text && typeof value.text === 'string') return value.text;
  return JSON.stringify(value);
}