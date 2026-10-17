import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';

export interface ClaudeDesktopTool {
  serverName: string;
  originalName: string;
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

class ClaudeDesktopMcpManager {
  private servers: Map<string, any> = new Map();
  private configPath: string;

  constructor() {
    this.configPath = path.join(
      process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'),
      'Claude',
      'claude_desktop_config.json'
    );
  }

  public loadConfig(): { mcpServers?: Record<string, { command: string; args?: string[]; env?: Record<string, string> }> } | null {
    try {
      if (!fs.existsSync(this.configPath)) return null;
      const raw = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }

  public async getOrStartServer(name: string, serverConfig: { command: string; args?: string[]; env?: Record<string, string> }) {
    if (this.servers.has(name)) {
      const existing = this.servers.get(name);
      if (existing.proc && !existing.proc.killed) {
        return existing;
      }
    }

    const { command, args = [], env = {} } = serverConfig;
    const proc = spawn(command, args, {
      env: { ...process.env, ...env },
      stdio: ['pipe', 'pipe', 'inherit'],
      windowsHide: true,
    });

    const pendingRequests = new Map<number, (res: any) => void>();
    let msgId = 1;
    let buffer = '';

    proc.stdout?.on('data', (chunk: Buffer) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const msg = JSON.parse(trimmed);
          if (msg.id && pendingRequests.has(msg.id)) {
            pendingRequests.get(msg.id)!(msg);
            pendingRequests.delete(msg.id);
          }
        } catch {
          // ignore non-json log lines
        }
      }
    });

    proc.on('exit', () => {
      this.servers.delete(name);
    });

    const sendRequest = (method: string, params: any = {}) => {
      return new Promise<any>((resolve, reject) => {
        const id = msgId++;
        const timeout = setTimeout(() => {
          pendingRequests.delete(id);
          reject(new Error(`MCP request ${method} timed out`));
        }, 20000);

        pendingRequests.set(id, (res) => {
          clearTimeout(timeout);
          resolve(res);
        });

        const req = JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n';
        proc.stdin?.write(req);
      });
    };

    try {
      await sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: { name: 'sameer-ai-workspace', version: '1.0.0' },
      });
      proc.stdin?.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');
    } catch (e: any) {
      console.warn(`[ClaudeDesktopMcp] Init failed for ${name}:`, e?.message);
    }

    const serverEntry = { proc, sendRequest, serverConfig };
    this.servers.set(name, serverEntry);
    return serverEntry;
  }

  public async listAllTools(): Promise<ClaudeDesktopTool[]> {
    const config = this.loadConfig();
    if (!config || !config.mcpServers) return [];

    const allTools: ClaudeDesktopTool[] = [];
    for (const [serverName, serverCfg] of Object.entries(config.mcpServers)) {
      try {
        const server = await this.getOrStartServer(serverName, serverCfg);
        const res = await server.sendRequest('tools/list', {});
        const tools = res?.result?.tools || [];
        for (const t of tools) {
          allTools.push({
            serverName,
            originalName: t.name,
            function: {
              name: `claude_${serverName}_${t.name}`.replace(/[^a-zA-Z0-9_]/g, '_'),
              description: `[Claude Desktop: ${serverName}] ${t.description || ''}`,
              parameters: t.inputSchema || { type: 'object', properties: {} },
            },
          });
        }
      } catch (err: any) {
        console.warn(`[ClaudeDesktopMcp] Could not list tools for ${serverName}:`, err?.message);
      }
    }
    return allTools;
  }

  public async callTool(serverName: string, toolName: string, args: any): Promise<string> {
    const config = this.loadConfig();
    if (!config || !config.mcpServers || !config.mcpServers[serverName]) {
      throw new Error(`MCP server "${serverName}" not configured in claude_desktop_config.json`);
    }

    const server = await this.getOrStartServer(serverName, config.mcpServers[serverName]);
    const res = await server.sendRequest('tools/call', {
      name: toolName,
      arguments: args,
    });

    if (res?.error) {
      throw new Error(res.error.message || JSON.stringify(res.error));
    }

    const contents = res?.result?.content || [];
    return contents.map((c: any) => c.text || JSON.stringify(c)).join('\n') || JSON.stringify(res?.result);
  }
}

export const claudeDesktopMcpManager = new ClaudeDesktopMcpManager();
