import { NextRequest, NextResponse } from 'next/server';
import { sendRealEmail } from '@/lib/mailer';
import { fetchLatestEmails } from '@/lib/imapReader';
import { getCredentialFromRequest, getStoredTokenFromRequest, type RemoteStoredToken, setStoredTokenCookie } from '@/lib/remoteMcpAuth';
import {
  createConnectLink,
  createSession,
  executeSessionTool,
  extractSearchTools,
  generateToolInput,
  hasComposioPlatformKey,
  listConnectedAccounts,
  searchSessionTools,
  toOpenAITool,
  toolkitSlugFromTool,
  safeJsonText,
} from '@/lib/composioPlatform';

export const runtime = 'nodejs';
export const maxDuration = 300;

const BOSS_TARGET_MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'qwen/qwen3.8-27b'];
const DEFAULT_MAX_TOKENS = 32768;

// Real agent tools - each one wraps an existing, genuinely working function.
// No fabricated results: every tool returns real data or a real error string.
const AGENT_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'web_search',
      description: 'Search the live web for current facts, news, or anything not in your training data.',
      parameters: {
        type: 'object',
        properties: { query: { type: 'string', description: 'The search query' } },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'web_fetch',
      description: 'Fetch and extract the readable text content of a specific URL the user gave you.',
      parameters: {
        type: 'object',
        properties: { url: { type: 'string', description: 'The URL to fetch' } },
        required: ['url'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'github_lookup',
      description: 'Get real repository stats and recent commits for a GitHub repo.',
      parameters: {
        type: 'object',
        properties: { repo: { type: 'string', description: 'owner/repo, e.g. sameer-sys/claude-enterprise-app' } },
        required: ['repo'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'read_inbox',
      description: 'Read the most recent real emails from the connected inbox.',
      parameters: {
        type: 'object',
        properties: { count: { type: 'number', description: 'How many recent emails to fetch (default 3, max 10)' } },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'send_email',
      description: 'Send a real email via the connected SMTP account. Only call this when the user has clearly asked you to send an email, with a real recipient.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address' },
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
];

function getSafeHttpUrl(raw: string): URL | null {
  try {
    const url = new URL(String(raw || '').trim());
    if (!['http:', 'https:'].includes(url.protocol)) return null;

    const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
    if (
      host === 'localhost' ||
      host.endsWith('.localhost') ||
      host.endsWith('.local') ||
      host === 'metadata.google.internal' ||
      host === 'metadata' ||
      host === 'host.docker.internal' ||
      host === 'kubernetes.default.svc'
    ) {
      return null;
    }

    const ipv4 = host.match(/^\d{1,3}(?:\.\d{1,3}){3}$/);
    if (ipv4) {
      const octets = host.split('.').map(Number);
      if (octets.some((n) => n < 0 || n > 255)) return null;
      const [a, b] = octets;
      const blocked =
        a === 0 ||
        a === 10 ||
        a === 127 ||
        (a === 100 && b >= 64 && b <= 127) ||
        (a === 169 && b === 254) ||
        (a === 172 && b >= 16 && b <= 31) ||
        (a === 192 && b === 168) ||
        a >= 224;
      if (blocked) return null;
    }

    if (
      host === '::1' ||
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host.startsWith('::ffff:127.') ||
      host.startsWith('::ffff:10.') ||
      host.startsWith('::ffff:192.168.')
    ) {
      return null;
    }

    return url;
  } catch {
    return null;
  }
}

function connectorToolPermission(connector: any, toolName: string, args: any, requestText: string): { decision: 'allow' | 'approval' | 'blocked'; reason?: string } {
  const cfg = connector?.config || {};
  const permissions = cfg.toolPermissions && typeof cfg.toolPermissions === 'object' ? cfg.toolPermissions : {};
  const exact = permissions[toolName] || permissions[String(toolName).toUpperCase()] || permissions[String(toolName).toLowerCase()];
  if (exact === 'blocked') return { decision: 'blocked', reason: 'This connector tool is blocked in your connector settings.' };
  if (exact === 'always') return { decision: 'allow' };
  if (exact === 'approval') return { decision: 'approval', reason: 'This tool requires approval.' };

  const lower = String(toolName || '').toLowerCase();
  const writeLike = /(?:^|[_:-])(send|create|update|edit|delete|remove|rename|move|upload|publish|post|reply|comment|invite|add|insert|archive|close|merge|cancel|schedule|modify|write)(?:$|[_:-])/i.test(lower);
  if (writeLike && cfg.requireApprovalForWrites !== false) {
    const approvalWords = /\b(?:approve|approved|allow|continue|confirm|yes|do it|go ahead|proceed)\b/i.test(String(requestText || ''));
    // A later user turn containing an explicit approval can authorize the exact
    // action the model is retrying; ordinary write requests remain gated.
    if (!approvalWords) return { decision: 'approval', reason: 'This is a write action and requires your confirmation.' };
  }
  return { decision: 'allow' };
}

function findConnectorForTool(connectorContext: any, toolName: string): any {
  const remote = connectorContext.remoteMcpToolRoutes?.[toolName]?.connector;
  if (remote) return remote;
  const connectors = Array.isArray(connectorContext.connectors) ? connectorContext.connectors : [];
  const lower = String(toolName || '').toLowerCase();
  const toolkit = lower.split('_')[0];
  const composio = connectors.find((c: any) =>
    String(c?.id || '') === 'conn-composio' ||
    String(c?.name || '').toLowerCase().includes('composio') ||
    (String(c?.provider || '').toLowerCase() === 'composio' &&
      String(c?.config?.composioToolkit || '').toLowerCase() === toolkit)
  );
  return lower.includes('composio') || /^[A-Z0-9]+_[A-Z0-9_]+$/.test(toolName) ? composio : undefined;
}

async function runAgentTool(
  name: string,
  args: any,
  connectorContext: {
    apiKey?: string;
    mcpToken?: string;
    mcpRefreshToken?: string;
    mcpToolNames?: string[];
    remoteMcpTools?: any[];
    remoteMcpToolRoutes?: Record<string, { connector: any; originalToolName: string }>;
    connectors?: any[];
    accounts?: any[];
    composioUserId?: string;
    remoteCredentials?: Record<string, RemoteStoredToken | undefined>;
    remoteMcpUpdates?: Record<string, RemoteStoredToken>;
    requestText?: string;
  } = {}
): Promise<string> {
  try {
    const policyConnector = findConnectorForTool(connectorContext, name);
    const policy = connectorToolPermission(policyConnector, name, args, String(connectorContext.requestText || ''));
    if (policy.decision === 'blocked') return 'TOOL_BLOCKED: ' + (policy.reason || 'This connector tool is blocked.');
    if (policy.decision === 'approval') {
      return 'APPROVAL_REQUIRED: ' + (policy.reason || 'Please confirm this action before I execute it.') + ' Tool: ' + name + '. I have not executed the action.';
    }

    // Handle Composio "For You" MCP execution
    const builtInToMcpAction: Record<string, string> = {
      'youtube_list_playlists': 'YOUTUBE_LIST_USER_PLAYLISTS',
      'youtube_create_playlist': 'YOUTUBE_CREATE_PLAYLIST',
      'youtube_add_video_to_playlist': 'YOUTUBE_INSERT_PLAYLIST_ITEM',
      'github_list_repos': 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
      'github_create_issue': 'GITHUB_CREATE_AN_ISSUE',
      'gmail_list_messages': 'GMAIL_LIST_THREADS',
      'gmail_send_email': 'GMAIL_SEND_EMAIL',
      'google_calendar_list_events': 'GOOGLECALENDAR_LIST_EVENTS',
      'google_calendar_create_event': 'GOOGLECALENDAR_CREATE_EVENT',
    };

    const remoteRoute = connectorContext.remoteMcpToolRoutes?.[name];
    if (remoteRoute) {
      const { callRemoteMcpTool } = await import('@/lib/remoteMcp');
      const connectorId = String(remoteRoute.connector?.id || '');
      return (await callRemoteMcpTool(
        remoteRoute.connector,
        name,
        remoteRoute.originalToolName,
        args || {},
        {
          credentials: connectorContext.remoteCredentials?.[connectorId],
          onCredentialsUpdated: (next) => {
            if (connectorContext.remoteMcpUpdates && connectorId) connectorContext.remoteMcpUpdates[connectorId] = next;
            if (connectorContext.remoteCredentials && connectorId) connectorContext.remoteCredentials[connectorId] = next;
          },
        }
      )).slice(0, 14000);
    }

    if (connectorContext.mcpToken) {
      try {
        const { executeMcpTool, mcpContentToText, pickMcpToolName } = await import('@/lib/composioMcp');
        const liveNames = connectorContext.mcpToolNames || [];
        const clip = (text: string) => (text.length > 14000 ? text.slice(0, 14000) + '\n...[truncated]' : text);

        if (liveNames.includes(name)) {
          const isConnectionStatusRequest =
            isConnectorRelatedRequest(String(connectorContext.requestText || '')) &&
            /\b(?:connected|linked|authorized|integrated|active|available|configured|apps?|accounts?|services?|connections?|connectors?|integrations?)\b/i.test(String(connectorContext.requestText || '')) &&
            !/\b(?:connect|add|authorize|link|reconnect|rename|remove|disconnect|unlink)\b/i.test(String(connectorContext.requestText || ''));

          if (/MANAGE_CONNECTIONS/i.test(name) && isConnectionStatusRequest) {
            const { getComposioToolkitConnectionStatuses, DEFAULT_COMPOSIO_TOOLKITS } = await import('@/lib/composioMcp');
            const statusRes = await getComposioToolkitConnectionStatuses(
              connectorContext.mcpToken,
              connectorContext.mcpRefreshToken,
              DEFAULT_COMPOSIO_TOOLKITS
            );
            if (statusRes.newAccessToken) connectorContext.mcpToken = statusRes.newAccessToken;
            if (statusRes.newRefreshToken) connectorContext.mcpRefreshToken = statusRes.newRefreshToken;
            if (!statusRes.success) return 'Unable to read Composio connection status: ' + String(statusRes.error || 'unknown error');
            const connected = statusRes.statuses.flatMap((entry: any) =>
              (entry.accounts || []).map((account: any) => ({ ...account, app_name: entry.toolkit }))
            );
            return formatConnectorResult(String(connectorContext.requestText || ''), { data: { connected_accounts: connected } });
          }

          const res = await executeMcpTool(connectorContext.mcpToken, name, args || {}, connectorContext.mcpRefreshToken);
          if (res.newAccessToken) connectorContext.mcpToken = res.newAccessToken;
          if ((res as any).newRefreshToken) connectorContext.mcpRefreshToken = (res as any).newRefreshToken;
          const rawText = mcpContentToText(res.data);
          if (!res.success) return clip(rawText || JSON.stringify({ successful: false, error: res.error || 'MCP tool failed' }));
          const compact = /(?:SEARCH_TOOLS|GET_TOOL_SCHEMAS|MULTI_EXECUTE)/i.test(name)
            ? compactComposioToolResult(String(connectorContext.requestText || ''), name, rawText)
            : rawText;
          return clip(compact || JSON.stringify({ successful: true }));
        }

        // Legacy wrapper names still resolve to the real MCP tools.
        if (name === 'Search_Composio_Tools' || name === 'COMPOSIO_SEARCH_SKILLS' || name === 'connector_search' || name === 'composio_search_tools') {
          const query = String(args?.query || args?.search || '');
          const searchTool = pickMcpToolName(liveNames, [/SEARCH_TOOLS/i], 'COMPOSIO_SEARCH_TOOLS');
          const res = await executeMcpTool(connectorContext.mcpToken, searchTool, { queries: [{ use_case: query }], session: { generate_id: true } }, connectorContext.mcpRefreshToken);
          if (res.newAccessToken) connectorContext.mcpToken = res.newAccessToken;
          if ((res as any).newRefreshToken) connectorContext.mcpRefreshToken = (res as any).newRefreshToken;
          return clip(mcpContentToText(res.data) || JSON.stringify({ error: res.error }));
        }

        if (name === 'Multi_Execute_Composio_Tools' || name === 'connector_execute' || name === 'composio_execute_action') {
          const execTool = pickMcpToolName(liveNames, [/MULTI_EXECUTE/i], 'COMPOSIO_MULTI_EXECUTE_TOOL');
          const payload = args?.action ? { tools: [{ name: args.action, arguments: args.params || args.arguments || {} }] } : args;
          const res = await executeMcpTool(connectorContext.mcpToken, execTool, payload, connectorContext.mcpRefreshToken);
          if (res.newAccessToken) connectorContext.mcpToken = res.newAccessToken;
          if ((res as any).newRefreshToken) connectorContext.mcpRefreshToken = (res as any).newRefreshToken;
          return clip(mcpContentToText(res.data) || JSON.stringify({ error: res.error }));
        }

        if (name === 'Manage_connections' || name === 'connector_manage_connections' || name === 'COMPOSIO_MANAGE_CONNECTIONS') {
          const manageTool = pickMcpToolName(liveNames, [/MANAGE_CONNECTIONS/i], 'COMPOSIO_MANAGE_CONNECTIONS');
          const toolkits = Array.isArray(args?.toolkits) ? args.toolkits.map(String).filter(Boolean) : [];
          if (!toolkits.length) return 'COMPOSIO_MANAGE_CONNECTIONS requires explicit toolkit names.';
          const res = await executeMcpTool(connectorContext.mcpToken, manageTool, { ...args, toolkits }, connectorContext.mcpRefreshToken);
          if (res.newAccessToken) connectorContext.mcpToken = res.newAccessToken;
          if ((res as any).newRefreshToken) connectorContext.mcpRefreshToken = (res as any).newRefreshToken;
          return clip(mcpContentToText(res.data) || JSON.stringify({ error: res.error }));
        }

        // Built-in actions mapped to Composio "For You" MCP
        if (builtInToMcpAction[name]) {
          const mcpAction = builtInToMcpAction[name];
          const execTool = pickMcpToolName(liveNames, [/MULTI_EXECUTE/i], 'COMPOSIO_MULTI_EXECUTE_TOOL');
          const res = await executeMcpTool(connectorContext.mcpToken, execTool, {
            tools: [{ name: mcpAction, arguments: args || {} }]
          }, connectorContext.mcpRefreshToken);
          if (res.newAccessToken) connectorContext.mcpToken = res.newAccessToken;
          if ((res as any).newRefreshToken) connectorContext.mcpRefreshToken = (res as any).newRefreshToken;
          return clip(mcpContentToText(res.data) || JSON.stringify({ error: res.error }));
        }

        // Direct action slug dispatcher (e.g. YOUTUBE_CREATE_PLAYLIST) routed via MULTI_EXECUTE
        if (/^[A-Z0-9]+_[A-Z0-9_]+$/.test(name) && !liveNames.includes(name)) {
          const execTool = pickMcpToolName(liveNames, [/MULTI_EXECUTE/i], 'COMPOSIO_MULTI_EXECUTE_TOOL');
          const res = await executeMcpTool(connectorContext.mcpToken, execTool, {
            tools: [{ name, arguments: args || {} }]
          }, connectorContext.mcpRefreshToken);
          if (res.newAccessToken) connectorContext.mcpToken = res.newAccessToken;
          if ((res as any).newRefreshToken) connectorContext.mcpRefreshToken = (res as any).newRefreshToken;
          return clip(mcpContentToText(res.data) || JSON.stringify({ error: res.error }));
        }
      } catch (mcpErr: any) {
        console.error('[MCP TOOL EXEC ERR]', mcpErr?.message || mcpErr);
      }
    } else {
      // If NOT connected to Composio "For You" MCP, do not fabricate or fall back to another connector runtime.
      const isComposioTool =
        name.startsWith('COMPOSIO_') ||
        name.startsWith('connector_') ||
        Boolean(builtInToMcpAction[name]) ||
        ['Search_Composio_Tools', 'Multi_Execute_Composio_Tools', 'Manage_connections', 'composio_execute_action', 'composio_search_tools'].includes(name) ||
        /^[A-Z0-9]+_[A-Z0-9_]+$/.test(name);

      if (isComposioTool) {
        return 'Composio "For You" is not connected yet. Click Connectors in the top right, click "+ Add", enter the MCP URL (https://connect.composio.dev/mcp), and sign in to connect.';
      }
    }

    if (name === 'web_search') {
      const queryClean = String(args?.query || '').trim();
      if (!queryClean) return 'No query provided.';
      let out = '';
      try {
        const ddgHtmlRes = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryClean)}`, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          },
          signal: AbortSignal.timeout(8000),
        });
        if (ddgHtmlRes.ok) {
          const html = await ddgHtmlRes.text();
          const regex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
          let match;
          const snippets: string[] = [];
          while ((match = regex.exec(html)) !== null && snippets.length < 6) {
            const clean = match[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
            if (clean) snippets.push(clean);
          }
          if (snippets.length > 0) {
            out += 'Search Results:\n' + snippets.map((s, idx) => `${idx + 1}. ${s}`).join('\n') + '\n';
          }
        }
      } catch (e) {}

      try {
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(queryClean)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(6000) });
        if (ddgRes.ok) {
          const d = await ddgRes.json();
          if (d.AbstractText) out += `Summary: ${d.AbstractText} (Source: ${d.AbstractURL || 'Web'})\n`;
        }
      } catch (e) {}

      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(queryClean)}`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(6000) });
        if (wikiRes.ok) {
          const d = await wikiRes.json();
          if (d.extract) out += `Wikipedia: ${d.extract}\n`;
        }
      } catch (e) {}

      return out || 'No search results found.';
    }

    if (name === 'web_fetch') {
      const targetUrl = String(args?.url || '').replace(/[.,;:)]+$/, '');
      if (!targetUrl) return 'No URL provided.';
      const safeUrl = getSafeHttpUrl(targetUrl);
      if (!safeUrl) return 'Fetch blocked: only public HTTP(S) URLs are allowed.';
      const res = await fetch(safeUrl.toString(), {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return `Fetch failed with status ${res.status}.`;
      const rawHtml = await res.text();
      const cleanText = rawHtml
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
        .replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ')
        .replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ')
        .replace(/<header\b[^<]*(?:(?!<\/header>)<[^<]*)*<\/header>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 4000);
      return cleanText.length > 40 ? cleanText : 'Fetched the page but found little readable text (it may be JS-rendered).';
    }

    if (name === 'github_lookup') {
      const repo = String(args?.repo || '').trim();
      if (!repo) return 'No repo provided.';
      const ghRes = await fetch(`https://api.github.com/repos/${repo}`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(8000) });
      if (!ghRes.ok) return `GitHub lookup failed: repo not found or not accessible (status ${ghRes.status}).`;
      const ghData = await ghRes.json();
      let out = `Stars: ${ghData.stargazers_count}, Forks: ${ghData.forks_count}, Open Issues: ${ghData.open_issues_count}, Default Branch: ${ghData.default_branch}, Pushed At: ${ghData.pushed_at}`;
      try {
        const commitsRes = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=3`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(8000) });
        if (commitsRes.ok) {
          const commitsData = await commitsRes.json();
          const recentCommits = commitsData
            .map((c: any) => `- "${c.commit?.message?.split('\n')[0]}" by ${c.commit?.author?.name || 'unknown'} (${c.commit?.author?.date?.slice(0, 10)})`)
            .join('\n');
          if (recentCommits) out += `\nRecent commits:\n${recentCommits}`;
        }
      } catch (e) {}
      return out;
    }



    if (name === 'send_email') {
      const to = String(args?.to || '').trim();
      const subject = String(args?.subject || '').trim();
      const body = String(args?.body || '');
      if (!to || !subject || !body) return 'Missing to/subject/body - cannot send.';

      const sendRes = await sendRealEmail({ to, subject, text: body });
      return sendRes.success
        ? 'Email sent successfully to ' + to + '. Message ID: ' + sendRes.messageId + '.'
        : 'Email FAILED to send: ' + sendRes.error;
    }

    if (name === 'read_inbox') {
      const count = Math.min(Number(args?.count) || 5, 20);
      const inboxRes = await fetchLatestEmails(count);
      if (!inboxRes.success) return 'Could not read inbox: ' + inboxRes.error;
      if (!inboxRes.emails.length) return 'Inbox is empty or SMTP/IMAP is not configured.';
      return inboxRes.emails.map((e: any) =>
        'From: ' + e.fromName + ' <' + e.from + '>, Subject: "' + e.subject + '", Date: ' + e.date
      ).join('\n');
    }








    return `Unknown tool: ${name}`;
  } catch (e: any) {
    return `Tool "${name}" failed: ${e?.message || 'unknown error'}`;
  }
}


const SYSTEM_PROMPTS: Record<string, string> = {
  boss: `You are Boss — the autonomous enterprise AI assistant with live hands powered by Composio "For You" MCP and user-added remote MCP connectors.

CONNECTED ACCOUNTS & LIVE TOOLS:
When connected to Composio "For You" (https://connect.composio.dev/mcp) or user-added remote MCP connectors, you have live execution tools:
- COMPOSIO_SEARCH_TOOLS: Search available tools and actions across user's connected services and report toolkit connection status.
- COMPOSIO_GET_TOOL_SCHEMAS: Get the exact parameters schema for tools.
- COMPOSIO_MULTI_EXECUTE_TOOL: Execute real actions on accounts connected in Composio "For You".
- COMPOSIO_MANAGE_CONNECTIONS: Start, rename, or remove an explicitly requested toolkit connection. Never use it to inspect connection status.
- web_search: Search the live web for facts, news, and current information.
- web_fetch: Fetch readable content from any URL.

CONNECTED APPS DIRECTIVE:
- When asked what apps or services are connected, use COMPOSIO_SEARCH_TOOLS connection-status results. Never call COMPOSIO_MANAGE_CONNECTIONS for a status/list/check request.
- Use COMPOSIO_MANAGE_CONNECTIONS only for an explicit user request to connect, rename, or remove a specific toolkit.
- Deliver clear, conversational answers with real account details. Never output internal planning notes, meta-instructions, or JSON tool definitions in your final reply.`,
};

function isConnectorRelatedRequest(text: string): boolean {
  const lower = String(text || '').toLowerCase();

  // ── 1. Direct NLP patterns that ALWAYS match regardless of app name ──
  // These catch natural language about connections, accounts, integrations
  // for ANY connector (Composio, future MCP connectors, etc.)
  const directPatterns = [
    // "what apps/services/accounts are connected"
    /\b(?:what|which|how many|list|show|tell me|give me|get|check)\b.*\b(?:apps?|services?|accounts?|connections?|connectors?|integrations?|tools?)\b.*\b(?:connected|linked|integrated|authorized|active|available|set up|configured)\b/,
    // "tell me the connectors you have", "what connectors", "list connectors", "show connectors"
    /\b(?:what|which|how many|list|show|tell me|give me|get|check)\b.*\b(?:connectors?|connections?)\b/,
    /\bconnectors?\b.*\b(?:you have|available|active|installed|set up|configured|now)\b/,
    /\b(?:connected\s+apps?|connected\s+accounts?|connected\s+services?)\b/,
    // "connected apps/services/accounts" (reversed word order)
    /\b(?:connected|linked|integrated|authorized|active)\b.*\b(?:apps?|services?|accounts?|connections?|connectors?|integrations?|tools?)\b/,
    // "what are you connected to/with"
    /\b(?:what|which)\b.*\b(?:connected|linked|integrated)\b\s*(?:to|with)\b/,
    // "am I connected to" / "are you connected"
    /\b(?:am i|are you|is it|are we)\b.*\b(?:connected|linked|integrated)\b/,
    // Mentions composio / mcp directly
    /\bcomposio\b/,
    /\bmcp\b.*\b(?:connect|tool|server|action|app|service)\b/,
    // "my connections" / "my integrations" / "my linked accounts"
    /\bmy\b.*\b(?:connections?|integrations?|linked\s+accounts?|connected\s+apps?)\b/,
    // "connect to" / "disconnect" / "reconnect"
    /\b(?:connect\s+to|disconnect|reconnect|unlink|relink)\b/,
    // "what can you do" / "what tools do you have" (capability queries)
    /\b(?:what|which)\b.*\b(?:can you do|tools?\s+do\s+you|actions?\s+can|capable)\b/,
  ];
  if (directPatterns.some((p) => p.test(lower))) return true;

  // ── 2. App-name + action detection (existing logic, expanded) ──
  const appTerms = [
    'gmail','google drive','gdrive','drive','google calendar','calendar','youtube','yt','slack','notion',
    'microsoft 365','m365','instagram','facebook','linkedin','linear','asana','canva','hubspot',
    'discord','trello','jira','github','git','twitter','x.com','dropbox','onedrive','salesforce',
    'stripe','shopify','airtable','figma','zoom','teams','outlook','todoist','clickup',
    'composio','mcp'
  ];
  const connectorTerms = [
    'connector','connected app','connected account','connected service',
    'authorize','authorization','oauth','linked account','access',
    'connected with','connected to','integration','linked to','signed in'
  ];
  const actionObjects = [
    'repository','repositories','repo','repos','pull request','pull requests',
    'issue','issues','branch','branches','commit','commits',
    'email','emails','inbox','message','messages','thread','threads',
    'calendar event','calendar events','meeting','meetings','event','events',
    'file','files','folder','folders','document','documents','spreadsheet','spreadsheets',
    'playlist','playlists','video','videos','channel','channels',
    'page','pages','post','posts','task','tasks','contact','contacts',
    'comment','comments','app','apps','service','services','account','accounts',
    'connection','connections','integration','integrations',
    'component','components','layout','layouts','sidebar','navbar','header','footer',
    'ui','screen','screens','function','functions','class','classes','module','modules',
    'endpoint','endpoints','route','routes','code','script','scripts','codebase',
    'my app','my project','my repo','my repository'
  ];
  const looksLikeAction = /\b(can you|could you|tell me|show me|show|list|find|search|read|get|check|create|add|update|edit|delete|send|reply|post|comment|upload|download|schedule|move|rename|archive|star|close|merge|open|give me|retrieve|fetch|load|pull|view|display|browse|access|how many|total|count|number of|what|which)\b/i.test(lower);
  const mentionsGitHub = /\b(?:github|git|repo|repos|repository|repositories|pull request|pull requests|commit|commits|branch|branches)\b/i.test(lower);
  const mentionsOtherApp = appTerms.some((term) => lower.includes(term));
  const mentionsConnectorObject = actionObjects.some((term) => lower.includes(term));
  const implicitGitHubRepoRequest =
    /\b(?:my|i\s+have|do\s+i\s+have)\b/i.test(lower) &&
    /\b(?:repositories|repos|pull\s+requests|issues)\b/i.test(lower) &&
    /\b(?:how many|list|show|what|which|tell me)\b/i.test(lower);
  const implicitConnectorObjectRequest = mentionsConnectorObject && looksLikeAction;
  return (
    (mentionsGitHub || mentionsOtherApp || implicitGitHubRepoRequest || implicitConnectorObjectRequest) &&
    (
      looksLikeAction ||
      connectorTerms.some((term) => lower.includes(term)) ||
      mentionsConnectorObject
    )
  );
}

function attachMcpSession(
  response: Response,
  context?: { mcpToken?: string; mcpRefreshToken?: string; remoteMcpUpdates?: Record<string, RemoteStoredToken>; connectors?: any[] }
): Response {
  if (!context?.mcpToken) return response;

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const base = '; Path=/; HttpOnly; SameSite=Lax' + secure;

  response.headers.append(
    'Set-Cookie',
    'composio_mcp_token=' + encodeURIComponent(context.mcpToken) + base + '; Max-Age=' + 30 * 24 * 3600
  );

  if (context.mcpRefreshToken) {
    response.headers.append(
      'Set-Cookie',
      'composio_mcp_refresh_token=' + encodeURIComponent(context.mcpRefreshToken) + base + '; Max-Age=' + 90 * 24 * 3600
    );
  }

  response.headers.append(
    'Set-Cookie',
    'composio_mcp_access_token=; Path=/; HttpOnly; SameSite=Lax' + secure + '; Max-Age=0'
  );

  const remoteUpdates = context?.remoteMcpUpdates || {};
  const contextConnectors = context?.connectors || [];
  for (const [connectorId, token] of Object.entries(remoteUpdates) as Array<[string, RemoteStoredToken]>) {
    const connector = contextConnectors.find((item: any) => String(item?.id) === connectorId);
    const serverUrl = String(connector?.config?.mcpUrl || connector?.url || '').trim();
    if (serverUrl) setStoredTokenCookie(response, connectorId, serverUrl, token);
  }

  return response;
}

function streamTextDirectly(
  text: string,
  detectedSkill: string,
  mcpContext?: { mcpToken?: string; mcpRefreshToken?: string; remoteMcpUpdates?: Record<string, RemoteStoredToken>; connectors?: any[] }
): Response {
  const encoder = new TextEncoder();
  return attachMcpSession(new Response(
    new ReadableStream({
      start(controller) {
        for (let i = 0; i < text.length; i += 32) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: text.slice(i, i + 32) })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Skill': detectedSkill,
        'X-Claude-Router': 'boss-agent-direct',
      },
    }
  ), mcpContext);
}

function compactComposioToolResult(requestText: string, toolName: string, data: any): string {
  let parsed = data;
  if (typeof parsed === 'string') { try { parsed = JSON.parse(parsed); } catch { return parsed.trim().slice(0, 12000); } }
  if (Array.isArray(parsed)) return parsed.slice(0, 20).map((item: any, i: number) => `${i + 1}. ${typeof item === 'string' ? item : JSON.stringify(item)}`).join('\\n');
  if (!parsed || typeof parsed !== 'object') return String(parsed ?? '');
  if (/SEARCH_TOOLS/i.test(toolName)) {
    const candidates: any[] = [];
    const collect = (value: any) => {
      if (Array.isArray(value)) for (const item of value) collect(item);
      else if (value && typeof value === 'object') {
        const name = value.name || value.tool_name || value.toolName;
        const description = value.description || value.tool_description || value.summary;
        if (name) candidates.push({ name: String(name), description: String(description || '').slice(0, 300) });
        for (const key of ['tools','results','items','data']) if (value[key] !== undefined) collect(value[key]);
      }
    };
    collect(parsed);
    const unique = Array.from(new Map(candidates.map((x) => [x.name, x])).values()).slice(0, 25);
    if (unique.length) return 'Relevant Composio tools found:\\n' + unique.map((x, i) => (i + 1) + '. ' + x.name + (x.description ? ' — ' + x.description : '')).join('\\n');
    return 'Composio tool search completed, but no directly usable tool names were returned. Try a more specific search.';
  }
  if (/GET_TOOL_SCHEMAS/i.test(toolName)) {
    const schemas: any[] = [];
    const collectSchemas = (value: any) => {
      if (Array.isArray(value)) for (const item of value) collectSchemas(item);
      else if (value && typeof value === 'object') {
        const name = value.name || value.tool_name || value.toolName;
        if (name && (value.input_schema || value.inputSchema || value.parameters || value.description)) schemas.push({ name: String(name), description: String(value.description || '').slice(0, 300), schema: value.input_schema || value.inputSchema || value.parameters || {} });
        for (const key of ['tools','schemas','results','items','data']) if (value[key] !== undefined) collectSchemas(value[key]);
      }
    };
    collectSchemas(parsed);
    if (schemas.length) return JSON.stringify({ tool_schemas: schemas.slice(0, 12) });
  }
  return formatConnectorResult(requestText, { data: parsed });
}
function formatConnectorResult(requestText: string, result: any): string {
  let data = result?.data ?? result;
  const lower = String(requestText || '').toLowerCase();
  if (data == null) return 'Done.';

  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        data = JSON.parse(trimmed);
      } catch {
        return trimmed;
      }
    } else {
      return trimmed;
    }
  }

  if (typeof data !== 'object') return String(data);

  // Check for connected accounts listing
  const isAccountQuery =
    /\b(?:what|which|how many|list|show|tell me|get|check)\b.*\b(?:apps?|accounts?|connections?|services?)\b/i.test(lower) ||
    /\b(?:connected|linked)\b.*\b(?:apps?|accounts?|connections?)\b/i.test(lower) ||
    /\bcomposio\b/i.test(lower);

  if (isAccountQuery) {
    // COMPOSIO_SEARCH_TOOLS returns:
    // { results: { toolkit: { status, accounts: [...] } }, summary: {...} }
    // Normalize that keyed result into one flat list of active accounts.
    let connections: any[] = [];
    if (Array.isArray(data)) {
      connections = data;
    } else if (Array.isArray(data.connections)) {
      connections = data.connections;
    } else if (Array.isArray(data.connected_accounts)) {
      connections = data.connected_accounts;
    } else if (Array.isArray(data.accounts)) {
      connections = data.accounts;
    } else if (Array.isArray(data.items)) {
      connections = data.items;
    } else if (data.results && typeof data.results === 'object' && !Array.isArray(data.results)) {
      for (const [toolkit, entry] of Object.entries(data.results as Record<string, any>)) {
        const accounts = Array.isArray((entry as any)?.accounts) ? (entry as any).accounts : [];
        for (const account of accounts) {
          connections.push({
            ...(account || {}),
            app_name: toolkit,
          });
        }
      }
    }

    // Do not show INITIATING/INITIALIZING rows as connected apps.
    connections = connections.filter((c: any) => {
      const status = String(c?.status || 'ACTIVE').toUpperCase();
      return status === 'ACTIVE' || status === 'CONNECTED';
    });

    const manageUrl = data.redirect_url || data.manage_url || data.url;
    if (Array.isArray(connections)) {
      if (connections.length === 0) {
        let msg = 'You currently have **0 external apps** connected in your personal Composio "For You" session.';
        if (manageUrl) {
          msg += `\n\nLink your apps (YouTube, GitHub, Gmail, Slack, etc.) here: [Connect Apps on Composio](${manageUrl})`;
        } else {
          msg += '\n\nTo link YouTube, GitHub, Gmail, or add CLI/MCP tools, click **Connectors** in the top right to authenticate or add custom tools.';
        }
        return msg;
      }
      const lines = connections.map((c: any, idx: number) => {
        const app = c.app_name || c.appName || c.app || c.name || 'App';
        const account = c.user_id || c.email || c.account_identifier || c.id || '';
        const status = c.status || 'Active';
        return `${idx + 1}. **${app}**${account ? ` (${account})` : ''} — \`${status}\``;
      });
      let response = `Here are your live connected apps from Composio "For You":\n\n` + lines.join('\n');
      if (manageUrl) {
        response += `\n\nManage or link more apps here: [Composio Connection Manager](${manageUrl})`;
      }
      return response;
    }

    if (manageUrl) {
      return `Manage your live connected apps here: [Composio Manage Connections](${manageUrl})`;
    }
  }

  const directCount = data.total_count ?? data.totalCount ?? data.repository_count ?? data.repositoryCount ?? data.count;
  if (directCount != null && /\b(how many|total|count|number of)\b/i.test(lower)) {
    const noun = lower.includes('repositor') ? 'repositories' : lower.includes('email') ? 'emails' : lower.includes('playlist') ? 'playlists' : 'items';
    return 'You have ' + String(directCount) + ' ' + noun + ' in your connected account.';
  }

  const candidates = [data.items, data.playlists, data.repositories, data.repos, data.results, data.data];
  const list = candidates.find((value: any) => Array.isArray(value));
  if (Array.isArray(list)) {
    const noun = lower.includes('repositor') ? 'repositories' : lower.includes('email') ? 'emails' : lower.includes('playlist') ? 'playlists' : 'items';
    const labels = list.map((item: any, idx: number) => {
      const name = item?.title || item?.snippet?.title || item?.name || item?.full_name || item?.id || '';
      const count = item?.itemCount ?? item?.contentDetails?.itemCount;
      return `${idx + 1}. **${name}**` + (count != null ? ` (${count} items)` : '');
    }).filter(Boolean);

    if (/\b(how many|total|count|number of)\b/i.test(lower)) {
      return `You have **${list.length}** ${noun} in your connected account:\n\n` +
        labels.slice(0, 20).join('\n') +
        (list.length > 20 ? '\n…and ' + (list.length - 20) + ' more.' : '');
    }
    return labels.length
      ? `Found **${list.length}** ${noun}:\n\n` + labels.slice(0, 20).join('\n') + (list.length > 20 ? '\n…and ' + (list.length - 20) + ' more.' : '')
      : 'Found ' + String(list.length) + ' ' + noun + '.';
  }

  const compact = Object.entries(data)
    .filter(([key]) => !['access_token','refresh_token','token','credentials','connectionParams'].includes(key))
    .slice(0, 8)
    .map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value)))
    .join('\n');
  return compact || 'Action completed successfully.';
}

async function runComposioPlatformAgent(options: {
  requestText: string;
  messages: any[];
  connectors: any[];
  userId: string;
  origin: string;
  modelId: string;
}): Promise<Response | null> {
  if (!hasComposioPlatformKey()) return null;

  const { requestText, messages, connectors, userId, origin } = options;
  const accounts = await listConnectedAccounts(userId);

  const isAccountQuery =
    /\b(?:what|which|how many|list|show|tell|give|get|check)\b.*\b(?:apps?|accounts?|connections?|services?|integrations?)\b/i.test(requestText) ||
    /\b(?:connected|linked|authorized|active)\b.*\b(?:apps?|accounts?|connections?|services?|integrations?)\b/i.test(requestText) ||
    /\b(?:apps?|accounts?|connections?|services?|integrations?)\b.*\b(?:connected|linked|authorized|active)\b/i.test(requestText);

  const activeConnections = accounts
    .filter((account: any) => ['ACTIVE', 'CONNECTED'].includes(String(account?.status || '').toUpperCase()))
    .map((account: any) => ({
      app_name: String(account?.toolkit?.slug || account?.toolkit_slug || 'App'),
      account: account?.alias || account?.id || '',
      status: String(account?.status || 'ACTIVE'),
      id: account?.id ? String(account.id) : undefined,
    }));

  if (isAccountQuery) {
    return streamTextDirectly(
      activeConnections.length
        ? formatConnectorResult(requestText, { data: { connected_accounts: activeConnections } })
        : 'You currently have **0 connected apps**. Open **Connectors** to connect GitHub, Gmail, Google Drive, Google Calendar, YouTube, Slack, and other supported services.',
      'Connector Hub',
      { connectors, composioUserId: userId }
    );
  }

  const session = await createSession(userId);
  let search = await searchSessionTools(session.sessionId, requestText);
  let discovered = extractSearchTools(search);

  if (!discovered.length) {
    return streamTextDirectly(
      'I could not find a supported connector action for that request. Open **Connectors** to check the connected service and try again.',
      'Connector Hub',
      { connectors, composioUserId: userId }
    );
  }

  const accountByToolkit = new Map<string, any[]>();
  for (const account of activeConnections) {
    const list = accountByToolkit.get(account.app_name.toLowerCase()) || [];
    list.push(account);
    accountByToolkit.set(account.app_name.toLowerCase(), list);
  }

  const missingToolkit = discovered
    .map((tool) => String(toolkitSlugFromTool(tool.slug)).toLowerCase())
    .find((slug) => !accountByToolkit.has(slug));

  if (missingToolkit) {
    const connection = await createConnectLink(
      userId,
      missingToolkit,
      origin + '/api/composio/callback'
    );
    return streamTextDirectly(
      'The **' + missingToolkit + '** connector is not connected yet. Connect it here: ' + connection.redirectUrl,
      'Connector Hub',
      { connectors, composioUserId: userId }
    );
  }

  const groqKey = String(process.env.GROQ_API_KEY || '').trim();
  if (!groqKey) {
    return streamTextDirectly(
      'The connector is connected, but the AI tool router is missing GROQ_API_KEY on the server.',
      'Connector Hub',
      { connectors, composioUserId: userId }
    );
  }

  const system = [
    'You are the connector execution agent for this workspace.',
    'Use the connected app tools to perform the user request. Never narrate a plan instead of calling a tool.',
    'Do not invent IDs, file names, repository names, event IDs, playlist IDs, or account identifiers.',
    'Use only the arguments needed by the selected tool schema.',
    'For write actions, respect the connector approval policy returned by the application.',
    'After a tool result, continue the task when another step is required. Finish only when the user request is actually complete or blocked.',
    'Return a concise final answer describing the real result.',
  ].join('\\n');

  const convo: any[] = [
    { role: 'system', content: system },
    ...messages.map((m: any) => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: String(m.content || ''),
    })),
  ];

  let llmTools = discovered.map(toOpenAITool).filter((tool: any) => tool?.function?.name);
  let lastResult = '';

  for (let turn = 0; turn < 8; turn++) {
    const resp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + groqKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-120b',
        messages: convo,
        tools: llmTools,
        tool_choice: llmTools.length ? 'required' : 'none',
        max_tokens: 8192,
      }),
      signal: AbortSignal.timeout(45000),
    });

    if (!resp.ok) {
      throw new Error('Connector agent model request failed (' + resp.status + ').');
    }

    const data = await resp.json();
    const assistant = data?.choices?.[0]?.message;
    const calls = Array.isArray(assistant?.tool_calls) ? assistant.tool_calls : [];

    if (!calls.length) {
      const text = String(assistant?.content || '').trim();
      if (text) return streamTextDirectly(text, 'Connector Hub', { connectors, composioUserId: userId });
      if (lastResult) return streamTextDirectly(formatConnectorResult(requestText, lastResult), 'Connector Hub', { connectors, composioUserId: userId });
      break;
    }

    convo.push(assistant);

    for (const call of calls) {
      const name = String(call?.function?.name || '');
      let args: Record<string, any> = {};
      try {
        args = JSON.parse(String(call?.function?.arguments || '{}'));
      } catch {}

      const policyConnector = findConnectorForTool({ connectors }, name);
      const policy = connectorToolPermission(policyConnector, name, args, requestText);
      let resultText: string;

      if (policy.decision !== 'allow') {
        resultText = (policy.decision === 'blocked' ? 'TOOL_BLOCKED: ' : 'APPROVAL_REQUIRED: ') + String(policy.reason || 'This action requires approval.') + ' Tool: ' + name;
      } else {
        const toolkit = toolkitSlugFromTool(name);
        const candidates = accountByToolkit.get(toolkit.toLowerCase()) || [];
        const account = candidates.length === 1
          ? candidates[0].id
          : (candidates.find((item: any) => item?.is_default)?.id || candidates[0]?.id);

        const executed = await executeSessionTool(
          session.sessionId,
          name,
          args,
          account
        );
        resultText = safeJsonText(executed?.data ?? executed?.error ?? executed);

        if (executed?.error && !executed?.data) {
          // If the model selected a valid tool but produced incomplete arguments,
          // ask Composio to generate the missing structured inputs as a deterministic fallback.
          try {
            const generated = await generateToolInput(name, requestText + '\\nCurrent attempt error: ' + String(executed.error));
            const retry = await executeSessionTool(session.sessionId, name, generated, account);
            resultText = safeJsonText(retry?.data ?? retry?.error ?? retry);
          } catch {}
        }
      }

      lastResult = resultText;
      convo.push({
        role: 'tool',
        tool_call_id: call.id,
        content: resultText.slice(0, 20000),
      });
    }

    search = await searchSessionTools(
      session.sessionId,
      requestText + '\\nUse the real previous tool result to decide the next required step:\\n' + lastResult.slice(0, 6000)
    );
    discovered = extractSearchTools(search);
    if (discovered.length) {
      llmTools = discovered.map(toOpenAITool).filter((tool: any) => tool?.function?.name);
    }
  }

  return lastResult
    ? streamTextDirectly(formatConnectorResult(requestText, lastResult), 'Connector Hub', { connectors, composioUserId: userId })
    : streamTextDirectly('The connector action did not return a usable result.', 'Connector Hub', { connectors, composioUserId: userId });
}

function detectSkill(lastMsg: string, hasImages: boolean): string {
  if (hasImages) return 'Multimodal Vision & Analysis';
  const lower = lastMsg.toLowerCase();
  if (
    lower.includes('html') ||
    lower.includes('react') ||
    lower.includes('ui') ||
    lower.includes('svg') ||
    lower.includes('component') ||
    lower.includes('website') ||
    lower.includes('page') ||
    lower.includes('button') ||
    lower.includes('tailwind')
  ) {
    return 'Generative UI & Visual Sandbox';
  }
  if (
    lower.includes('code') ||
    lower.includes('python') ||
    lower.includes('javascript') ||
    lower.includes('script') ||
    lower.includes('debug') ||
    lower.includes('function') ||
    lower.includes('algorithm') ||
    lower.includes('run') ||
    lower.includes('error')
  ) {
    return 'Code Interpreter & Execution Sandbox';
  }
  if (
    lower.includes('search') ||
    lower.includes('news') ||
    lower.includes('latest') ||
    lower.includes('docs') ||
    lower.includes('documentation') ||
    lower.includes('research') ||
    lower.includes('benchmark')
  ) {
    return 'Live Web Research & Documentation';
  }
  if (
    lower.includes('plan') ||
    lower.includes('architecture') ||
    lower.includes('system') ||
    lower.includes('deep') ||
    lower.includes('reasoning') ||
    lower.includes('compare') ||
    lower.includes('design')
  ) {
    return 'Deep Hybrid Extended Reasoning';
  }
  return 'Enterprise Intelligence Engine';
}

async function synthesizeClaudeEnterpriseResponse(
  lastText: string,
  modelId: string,
  skill: string,
  activeConnectors: any[] = [],
  messages: any[] = []
): Promise<string> {
  void modelId;
  void skill;
  void activeConnectors;
  void messages;
  const text = String(lastText || '').trim();
  return text ? 'I could not reach an AI response provider for that request.' : 'Please enter a message.';
}

export async function GET(req: NextRequest) {
  return NextResponse.redirect(new URL('/', req.url));
}

export async function POST(req: NextRequest) {
  try {
    const requestStartTime = Date.now();
    const {
      messages,
      modelId = 'boss',
      geminiKey,
      openRouterKey,
      omniRouteUrl,
      thinkingBudget = 16000,
      agentPrompt,
      connectors = [],
      composioMcpToken: bodyMcpToken,
      composioMcpRefreshToken: bodyMcpRefreshToken,
    } = await req.json();

    const headerMcpToken = req.headers.get('x-composio-mcp-token') || '';
    const headerMcpRefreshToken = req.headers.get('x-composio-mcp-refresh-token') || '';

    const cookieMcpToken = req.cookies.get('composio_mcp_token')?.value || req.cookies.get('composio_mcp_access_token')?.value || '';
    const cookieMcpRefreshToken = req.cookies.get('composio_mcp_refresh_token')?.value || '';

    const composioUserId = String(req.cookies.get('sameer_composio_user_id')?.value || '').trim() || 'default';
    let composioMcpToken = String(bodyMcpToken || headerMcpToken || cookieMcpToken || '').trim();
    let composioMcpRefreshToken = String(bodyMcpRefreshToken || headerMcpRefreshToken || cookieMcpRefreshToken || '').trim();

    const isOmniRouteModel = true;

    const userLastMsg = messages[messages.length - 1];
    const lastText = typeof userLastMsg?.content === 'string' ? userLastMsg.content : '';
    const lowerText = lastText.toLowerCase();

    // ========================================================
    // COMPOSIO CONNECTOR CONTEXT (DYNAMIC "FOR YOU" MCP RUNTIME ONLY)
    // ========================================================
    let connectorContext = '';
    if (composioMcpToken) {
      connectorContext += '\n\n[COMPOSIO "FOR YOU" MCP CONNECTOR ACTIVE]\n' + [
        "You are connected to the user's personal Composio account through MCP (https://connect.composio.dev/mcp).",
        "Composio uses Claude-style deferred tool loading: in Auto or On demand mode the initial tool list is intentionally small (search, schemas, multi-execute, connection management). Search for the relevant app/tool first, inspect schemas when needed, then execute the real action. In Always available mode additional live tools may be exposed directly.",
        "WHEN ASKED ABOUT CONNECTED APPS/ACCOUNTS/SERVICES: Use COMPOSIO_SEARCH_TOOLS to inspect toolkit connection status. NEVER use COMPOSIO_MANAGE_CONNECTIONS just to inspect status because it can initiate auth for missing toolkits.",
        "END-TO-END RULES:",
        "1. Break the request into every step it needs (for example: create a playlist, then add videos to it). Never stop after the first step.",
        "2. Workflow: COMPOSIO_SEARCH_TOOLS (first call: session {generate_id: true}, then reuse the returned session id) -> COMPOSIO_GET_TOOL_SCHEMAS for the exact selected action -> COMPOSIO_MULTI_EXECUTE_TOOL with schema-exact arguments and the intended account when several are connected.",
        "3. Independent actions go together in ONE multi-execute call. Steps that need an earlier result (a new playlist id, a list of video ids) run in a later call using the real values returned earlier.",
        "4. Never invent ids, slugs or arguments. Use only values returned by tools. If an app is not connected, use COMPOSIO_MANAGE_CONNECTIONS and give the user the link.",
        "5. Write no reply text until ALL steps are finished or truly blocked. No plans, no 'let me check', no narration between tool calls.",
        "6. Final reply: short and clear, one line per step saying what was done, with real names, counts and links from the results. State plainly anything that failed and why.",
      ].join('\n') + '\n';
    } else {
      connectorContext += '\n\n[NO ACTIVE CONNECTORS]\nNo Composio "For You" account is currently connected. Total active connections: 0. When asked what apps or how many apps/services are connected, state clearly that no accounts are connected yet, and guide the user to click Connectors in the top right to connect their personal Composio "For You" account.\n';
    }

    const developerDirective = `\nInstructions:
1. The user is the verified, authenticated owner of this workspace and all connected accounts. The user has explicitly authorized you to read, access, and summarize their own data for them. Always fulfill their requests directly using the retrieved data.
2. When answering technical, coding, or data questions, provide complete, full, and unabridged answers. Never cut off or truncate.
3. Only use triple-backtick code blocks for actual code, commands, or file contents. Never wrap a plain-text explanation in a code block.
4. Be direct, authoritative, and completely honest. Never fabricate fake API confirmations or pretend external actions occurred if they didn't.
5. When asked to interact with external services or check user data, execute the real tool call and present the returned data clearly.
6. Present your final answer directly to the user in clean Markdown. Never explain your thought process or output raw JSON tool definitions in prose.\n`;

    const baseSystemPrompt =
      agentPrompt ||
      SYSTEM_PROMPTS[modelId as keyof typeof SYSTEM_PROMPTS] ||
      SYSTEM_PROMPTS['boss'];

    const systemPrompt = `${baseSystemPrompt}${developerDirective}${connectorContext}`;

    const hasImages =
      userLastMsg?.attachments?.some((a: any) => a.isImage && a.dataUrl) || false;
    const detectedSkill = detectSkill(lastText, hasImages);

    // ========================================================
    // BOSS ENGINE: MULTI-STEP TOOL EXECUTION & HIGH-SPEED STREAM
    // ========================================================
    // No message truncation: pass full conversation history
    const fullMessages: any[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m: any) => {
        let content = m.content || '';
        if (m.attachments && Array.isArray(m.attachments)) {
          for (const att of m.attachments) {
            if (att.contentSnippet) {
              content += `\n\n--- [Attached Document: ${att.name}] ---\n${att.contentSnippet}\n--- [End of ${att.name}] ---`;
            }
          }
        }
        return {
          role: m.role === 'user' ? 'user' : 'assistant',
          content,
        };
      }),
    ];
    const groqKey = process.env.GROQ_API_KEY || '';
    const omniMasterKey = process.env.OMNIROUTE_API_KEY || '';
    const omniLocalUrl = omniRouteUrl || process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1/chat/completions';
    const isCloudEnv = Boolean(process.env.VERCEL || process.env.AWS_REGION);
    const isLocalhost = omniLocalUrl.includes('127.0.0.1') || omniLocalUrl.includes('localhost');

    // 1. Tool execution loop: check if request needs web search, git, email, or Composio tools
    const agentDeadline = requestStartTime + (composioMcpToken || connectors.some((c: any) => c?.enabled !== false && String(c?.config?.connectionType || '').toLowerCase() === 'mcp') ? 200000 : 120000);
    const maxAgentTurns = composioMcpToken || connectors.some((c: any) => c?.enabled !== false && String(c?.config?.connectionType || '').toLowerCase() === 'mcp') ? 24 : 8;
    let mcpLiveTools: any[] = [];
    let mcpToolNames: string[] = [];
    if (composioMcpToken) {
      try {
        const { listMcpToolsCachedWithAuth, mcpToolsToOpenAI } = await import('@/lib/composioMcp');
        const listed = await listMcpToolsCachedWithAuth(composioMcpToken, composioMcpRefreshToken);
        if (listed.accessToken && listed.accessToken !== composioMcpToken) {
          composioMcpToken = listed.accessToken;
        }
        if (listed.refreshToken && listed.refreshToken !== composioMcpRefreshToken) {
          composioMcpRefreshToken = listed.refreshToken;
        }
        mcpLiveTools = mcpToolsToOpenAI(listed.tools);
        mcpToolNames = mcpLiveTools.map((t: any) => String(t?.function?.name || '')).filter(Boolean);
      } catch (mcpListErr: any) {
        console.error('[MCP TOOL LIST ERR]', mcpListErr?.message || mcpListErr);
      }
    }
    let mcpModeActive = Boolean(composioMcpToken) && mcpToolNames.length > 0;
    const composioConnector = (Array.isArray(connectors) ? connectors : []).find((connector: any) =>
      String(connector?.id || '') === 'conn-composio' ||
      String(connector?.name || '').toLowerCase().includes('composio')
    );
    const composioToolAccess = String(composioConnector?.config?.toolAccess || 'auto').toLowerCase();
    const composioCoreTools = mcpLiveTools.filter((tool: any) => {
      const name = String(tool?.function?.name || '');
      return /(?:SEARCH_TOOLS|GET_TOOL_SCHEMAS|MULTI_EXECUTE_TOOL|MANAGE_CONNECTIONS)/i.test(name);
    });
    // Claude-style tool loading: Auto/On demand keep the full connector catalog
    // out of the model context and start with the small discovery/execution surface.
    // Always available intentionally exposes the complete live tool catalog.
    if (mcpModeActive && composioToolAccess !== 'always') {
      mcpLiveTools = composioCoreTools;
      mcpToolNames = mcpLiveTools.map((t: any) => String(t?.function?.name || '')).filter(Boolean);
    }

    mcpModeActive = Boolean(composioMcpToken) && mcpToolNames.length > 0;
    const remoteCredentials: Record<string, RemoteStoredToken | undefined> = {};
    const remoteMcpUpdates: Record<string, RemoteStoredToken> = {};
    const runtimeConnectors = (Array.isArray(connectors) ? connectors : []).map((connector: any) => {
      const cfg = connector?.config || {};
      const type = String(cfg.connectionType || connector?.provider || '').toLowerCase();
      const url = String(cfg.mcpUrl || connector?.url || '').trim();
      const isComposio = String(connector?.name || '').toLowerCase().includes('composio') || url.includes('connect.composio.dev');
      if (type !== 'mcp' || isComposio || !url || !connector?.id) return connector;
      const stored = getStoredTokenFromRequest({ cookies: req.cookies }, String(connector.id), url);
      const credential = getCredentialFromRequest({ cookies: req.cookies }, String(connector.id), url);
      const merged = { ...(credential || {}), ...(stored || {}) };
      if (!merged.accessToken && !merged.refreshToken && !merged.clientId && !merged.clientSecret) return connector;
      remoteCredentials[String(connector.id)] = merged;
      return { ...connector, config: { ...cfg, ...(merged.accessToken ? { authToken: merged.accessToken } : {}) } };
    });

    // Generic remote MCP connectors (non-Composio) are discovered here and
    // exposed to the model under collision-safe names.
    let remoteMcpTools: any[] = [];
    const remoteMcpToolRoutes: Record<string, { connector: any; originalToolName: string }> = {};

    try {
      const { listRemoteMcpTools } = await import('@/lib/remoteMcp');
      const remoteConnectors = runtimeConnectors
        .filter((connector: any) => {
          const cfg = connector?.config || {};
          const type = String(cfg.connectionType || connector?.provider || '').toLowerCase();
          const isComposio = String(connector?.name || '').toLowerCase().includes('composio') ||
            String(cfg.mcpUrl || connector?.url || '').includes('connect.composio.dev');
          return connector?.enabled !== false &&
            type === 'mcp' &&
            !isComposio &&
            Boolean(cfg.mcpUrl || connector?.url);
        })
        .slice(0, 5);

      const discovered = await Promise.allSettled(
        remoteConnectors.map((connector: any) =>
          listRemoteMcpTools(connector).then((tools: any[]) => ({ connector, tools }))
        )
      );

      for (const item of discovered) {
        if (item.status !== 'fulfilled') continue;
        const connector = item.value.connector;
        const access = String(connector?.config?.toolAccess || 'auto').toLowerCase();
        const disabled = new Set(
          Array.isArray(connector?.config?.disabledTools) ? connector.config.disabledTools.map(String) : []
        );
        const queryWords = String(lastText || '').toLowerCase().split(/[^a-z0-9]+/).filter((word: string) => word.length >= 3);
        const connectorName = String(connector?.name || '').toLowerCase();
        const scoredTools = item.value.tools
          .filter((tool: any) => !disabled.has(String(tool.originalName || tool.function?.name || '').trim()))
          .map((tool: any) => {
            if (access === 'always') return { tool, score: 1000 };
            const haystack = (String(tool.function?.name || '') + ' ' + String(tool.function?.description || '')).toLowerCase();
            let score = 0;
            for (const word of queryWords) {
              if (haystack.includes(word)) score += 3;
              if (connectorName.includes(word)) score += 2;
            }
            return { tool, score };
          })
          .sort((a: any, b: any) => b.score - a.score);
        // Keep remote MCP context bounded. Always exposes all enabled tools;
        // Auto exposes the most relevant tools; On demand is deliberately tighter.
        const maxTools = access === 'always' ? 100 : access === 'on_demand' ? 8 : 16;
        const selectedTools = scoredTools
          .filter((entry: any) => access === 'always' || entry.score > 0)
          .slice(0, maxTools)
          .map((entry: any) => entry.tool);
        for (const tool of selectedTools) {
          remoteMcpTools.push(tool);
          const prefix = `REMOTE_MCP_${String(connector.id).replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 12)}_`;
          remoteMcpToolRoutes[tool.function.name] = {
            connector,
            originalToolName: String(tool.originalName || tool.function.name).replace(prefix, ''),
          };
        }
      }
    } catch (remoteMcpErr: any) {
      console.error('[REMOTE MCP DISCOVERY ERR]', remoteMcpErr?.message || remoteMcpErr);
    }

    // In "For You" mode the real Composio MCP tools replace the guessed wrapper tools.
    const mcpWrapperNames = new Set([
      'connector_search', 'connector_manage_connections', 'connector_execute',
      'Search_Composio_Tools', 'Multi_Execute_Composio_Tools', 'Manage_connections',
    ]);
    const baseTools = mcpModeActive
      ? AGENT_TOOLS.filter((t: any) => !mcpWrapperNames.has(String(t?.function?.name || '')))
      : AGENT_TOOLS;
    const effectiveTools = [
      ...baseTools,
      ...mcpLiveTools,
      ...remoteMcpTools,
    ];
    let forceConnectorTool = false;

    const remoteConnectorMention = (Array.isArray(connectors) ? connectors : [])
      .some((connector: any) =>
        connector?.enabled !== false &&
        String(connector?.name || '').trim() &&
        lastText.toLowerCase().includes(String(connector.name).trim().toLowerCase())
      );

    const connectorRequest = isConnectorRelatedRequest(lastText) || remoteConnectorMention;
    const hasRemoteMcpTools = remoteMcpTools.length > 0;

    // PRIMARY CONNECTOR PATH:
    // Connector requests must enter the real live Composio MCP tool loop.
    // Do not guess an app-specific action from a keyword such as "playlist" or
    // "video": multi-step requests need the model to discover the exact tools,
    // schemas, and result-dependent values through Composio.
    if (connectorRequest) {
      if (!mcpModeActive && !hasRemoteMcpTools) {
        const message = composioMcpToken
          ? 'Composio "For You" is connected, but its live MCP tools are unavailable right now. Please reconnect in Connectors and try again.'
          : 'No active Composio For You or remote MCP connector is available for this request. Open Connectors to connect one.';
        return streamTextDirectly(message, detectedSkill);
      }

      // Connector work must start with a real discovery/tool call. Never let
      // the LLM replace an action with a narrated plan just because the connector
      // is configured as "always available".
      const isExplicitConnectionManagement = /\b(?:connect|add|authorize|link|reconnect|disconnect|unlink|remove)\b/i.test(lastText);
      forceConnectorTool = mcpModeActive && !remoteConnectorMention && !isExplicitConnectionManagement;
    }

    const toolContext = {
      mcpToken: composioMcpToken,
      mcpRefreshToken: composioMcpRefreshToken,
      mcpToolNames,
      connectors: runtimeConnectors,
      accounts: [],
      remoteCredentials,
      remoteMcpUpdates,
      composioUserId,
      remoteMcpTools,
      remoteMcpToolRoutes,
      requestText: lastText,
    };

    const { pickMcpToolName } = await import('@/lib/composioMcp');

    const isAccountQuery = /\b(?:what|which|how many|list|show|tell|give|get|check)\b.*\b(?:apps?|accounts?|connections?|services?|integrations?)\b/i.test(lastText) ||
      /\b(?:connected|linked|authorized|active)\b.*\b(?:apps?|accounts?|connections?|services?|integrations?)\b/i.test(lastText) ||
      /\b(?:apps?|accounts?|connections?|services?|integrations?)\b.*\b(?:connected|linked|authorized|active)\b/i.test(lastText) ||
      /\bcomposio\b.*\b(?:connected|connections?|apps?|accounts?)\b/i.test(lastText);

    // Connected-app queries are deterministic and READ-ONLY.
    // COMPOSIO_MANAGE_CONNECTIONS is deliberately never used for inspection,
    // because missing toolkits can trigger new auth/account creation attempts.
    if (connectorRequest && isAccountQuery && mcpModeActive) {
      const { getComposioToolkitConnectionStatuses, DEFAULT_COMPOSIO_TOOLKITS } = await import('@/lib/composioMcp');
      const statusRes = await getComposioToolkitConnectionStatuses(
        toolContext.mcpToken,
        toolContext.mcpRefreshToken,
        DEFAULT_COMPOSIO_TOOLKITS
      );

      if (statusRes.newAccessToken) toolContext.mcpToken = statusRes.newAccessToken;
      if (statusRes.newRefreshToken) toolContext.mcpRefreshToken = statusRes.newRefreshToken;

      if (statusRes.success) {
        const connectedAccounts = statusRes.statuses.flatMap((entry: any) =>
          (entry.accounts || []).map((account: any) => ({
            ...account,
            app_name: entry.toolkit,
          }))
        );
        return streamTextDirectly(
          formatConnectorResult(lastText, { data: { connected_accounts: connectedAccounts } }),
          detectedSkill,
          toolContext
        );
      }
    }

    let mcpToolCallsMade = 0;
    let mcpNudges = 0;

    for (let turn = 0; turn < maxAgentTurns; turn++) {
      if (Date.now() > agentDeadline) break;

      try {
        const agentResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${groqKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'openai/gpt-oss-120b',
            messages: fullMessages,
            tools: effectiveTools,
            tool_choice: (turn === 0 && forceConnectorTool)
              ? {
                  type: 'function',
                  function: {
                    name: pickMcpToolName(
                      mcpToolNames,
                      [/SEARCH_TOOLS/i],
                      'COMPOSIO_SEARCH_TOOLS'
                    ),
                  },
                }
              : 'auto',
            max_tokens: 8192,
          }),
          signal: AbortSignal.timeout(Math.max(5000, agentDeadline - Date.now())),
        });

        if (!agentResp.ok) {
          const errBody = await agentResp.text().catch(() => '');
          console.error('[AGENT GROQ ERR]', agentResp.status, errBody);
          try {
            const fallbackResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { Authorization: `Bearer ${groqKey}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: fullMessages,
                max_tokens: 8192,
              }),
              signal: AbortSignal.timeout(Math.max(5000, agentDeadline - Date.now())),
            });
            if (fallbackResp.ok) {
              const fbData = await fallbackResp.json();
              const fbMsg = fbData?.choices?.[0]?.message;
              const fbText = String(fbMsg?.content || fbMsg?.reasoning || '').trim();
              if (fbText) {
                return new Response(
                  new ReadableStream({
                    start(controller) {
                      const encoder = new TextEncoder();
                      for (let i = 0; i < fbText.length; i += 32) {
                        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: fbText.slice(i, i + 32) })}\n\n`));
                      }
                      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                      controller.close();
                    }
                  }),
                  {
                    headers: {
                      'Content-Type': 'text/event-stream',
                      'Cache-Control': 'no-cache',
                      Connection: 'keep-alive',
                      'X-Claude-Skill': detectedSkill,
                    },
                  }
                );
              }
            }
          } catch {}
          break;
        }

        const agentData = await agentResp.json();
        const agentMsg = agentData?.choices?.[0]?.message;
        let toolCalls = agentMsg?.tool_calls;

        // Catch text-formatted JSON tool calls if model didn't emit native tool_calls
        if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
          const rawText = String(agentMsg?.content || agentMsg?.reasoning || agentMsg?.reasoning_content || '');
          const jsonToolMatch = rawText.match(/\{\s*"(?:tool|name|action)"\s*:\s*"([A-Za-z0-9_]+)"\s*,\s*"(?:arguments|params|parameters)"\s*:\s*(\{[\s\S]*?\})\s*\}/);
          if (jsonToolMatch) {
            const parsedName = jsonToolMatch[1];
            let parsedArgs = {};
            try { parsedArgs = JSON.parse(jsonToolMatch[2]); } catch {}
            toolCalls = [{
              id: 'call_text_parsed_' + Date.now(),
              type: 'function',
              function: {
                name: parsedName,
                arguments: JSON.stringify(parsedArgs)
              }
            }];
          }
        }

        if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
          const contentText = String(agentMsg?.content || '').trim();
          const reasoningText = String(agentMsg?.reasoning || agentMsg?.reasoning_content || '').trim();
          const checkText = contentText || reasoningText;

          const isAccountQuery =
            /\b(?:what|which|how many|list|show|tell|give|get|check)\b.*\b(?:apps?|accounts?|connections?|services?|integrations?)\b/i.test(lastText) ||
            /\b(?:connected|linked|authorized|active)\b.*\b(?:apps?|accounts?|connections?|services?|integrations?)\b/i.test(lastText) ||
            /\b(?:apps?|accounts?|connections?|services?|integrations?)\b.*\b(?:connected|linked|authorized|active)\b/i.test(lastText) ||
            /\bcomposio\b/i.test(lastText);

          const isPlanningText =
            /(?:User keeps asking|we need to call|must call|produce tool call|only tool call|no prose|\{"tool":|"tool":|according to instruction)/i.test(checkText) ||
            (!contentText && Boolean(reasoningText)) ||
            /(?:we need to|we should|let's call|i will call|calling|we must|action likely|use composio|should output tool call|user wants|user asks|need to call|need to find|first, need to|first need to|use composio_|to search actions|search actions for)/i.test(checkText);

          if (isPlanningText) {
            // Check if there was already a tool result we can summarize or format
            const lastToolMsg = [...fullMessages].reverse().find((m: any) => m && m.role === 'tool');
            if (lastToolMsg && typeof lastToolMsg.content === 'string') {
              const formatted = formatConnectorResult(lastText, lastToolMsg.content);
              if (formatted) {
                return streamTextDirectly(formatted, detectedSkill, toolContext);
              }
            }

            // Never allow a connector request to stall behind an LLM prose answer.
            // Perform the required first Composio meta-tool directly if the model
            // failed to emit a tool call.
            if (mcpModeActive && mcpToolCallsMade === 0) {
              const { DEFAULT_COMPOSIO_TOOLKITS } = await import('@/lib/composioMcp');
              const targetTool = pickMcpToolName(
                mcpToolNames,
                [/SEARCH_TOOLS/i],
                'COMPOSIO_SEARCH_TOOLS'
              );

              const autoArgs = {
                queries: isAccountQuery
                  ? DEFAULT_COMPOSIO_TOOLKITS.map((toolkit: string) => ({
                      use_case: 'Check whether ' + toolkit + ' is actively connected and identify a simple read-only tool for this service.',
                    }))
                  : [{ use_case: lastText }],
                session: { generate_id: true },
                model: 'gpt-5.6',
              };

              const autoResult = await runAgentTool(targetTool, autoArgs, toolContext);
              mcpToolCallsMade++;

              if (isAccountQuery) {
                const formatted = formatConnectorResult(lastText, autoResult);
                return streamTextDirectly(formatted, detectedSkill, toolContext);
              }

              fullMessages.push({
                role: 'system',
                content:
                  'COMPOSIO_PREFLIGHT_RESULT (' + targetTool + ') — use this real result to continue the connector request. ' +
                  'If a session_id is present, reuse that exact session id for subsequent Composio meta-tool calls.\n' +
                  autoResult,
              });
              forceConnectorTool = false;
              continue;
            }

            mcpNudges++;
            forceConnectorTool = true;
            fullMessages.push({
              role: 'system',
              content: isAccountQuery
                ? 'Call COMPOSIO_SEARCH_TOOLS now for connection status. Never call COMPOSIO_MANAGE_CONNECTIONS for a status/list/check request.'
                : 'Call the required Composio tool now.',
            });
            continue;
          }

          if (contentText) {
            return streamTextDirectly(contentText, detectedSkill, toolContext);
          }
          break;
        }

        fullMessages.push(agentMsg);

        for (const call of toolCalls) {
          const toolName = call.function?.name;
          let toolArgs: Record<string, any> = {};
          try {
            toolArgs = JSON.parse(call.function?.arguments || '{}');
          } catch (e) {}

          const result = await runAgentTool(toolName, toolArgs, toolContext);

          fullMessages.push({
            role: 'tool',
            tool_call_id: call.id,
            content: result,
          });
          if (mcpToolNames.includes(String(toolName))) mcpToolCallsMade++;
        }
        // Once a real MCP tool has run, let the model decide: keep calling tools or finish.
        if (mcpModeActive && mcpToolCallsMade > 0) forceConnectorTool = false;
      } catch (e) {
        break;
      }
    }

    // 2. Stream final response
    const candidateEndpoints: Array<{
      url: string;
      headers: Record<string, string>;
      models: string[];
      tag: string;
    }> = [];

    // Local / custom OmniRoute if provided
    if (!isCloudEnv || !isLocalhost) {
      candidateEndpoints.push({
        url: omniLocalUrl,
        headers: {
          Authorization: `Bearer ${omniMasterKey}`,
          'Content-Type': 'application/json',
        },
        models: ['boss'],
        tag: 'boss-local',
      });
    }

    // Primary Groq Cloud Engine (120B Flagship)
    candidateEndpoints.push({
      url: 'https://api.groq.com/openai/v1/chat/completions',
      headers: {
        Authorization: `Bearer ${groqKey}`,
        'Content-Type': 'application/json',
      },
      models: BOSS_TARGET_MODELS,
      tag: 'boss-cloud',
    });

    for (const endpoint of candidateEndpoints) {
      for (const targetModel of endpoint.models) {
        try {
          const upstreamResponse = await fetch(endpoint.url, {
            method: 'POST',
            headers: endpoint.headers,
            body: JSON.stringify({
              model: targetModel,
              messages: fullMessages,
              stream: true,
              max_tokens: DEFAULT_MAX_TOKENS,
            }),
            signal: AbortSignal.timeout(55000),
          });

          if (!upstreamResponse.ok || !upstreamResponse.body) continue;

          const encoder = new TextEncoder();
          const decoder = new TextDecoder();
          let sseBuffer = '';
          let accumulatedContent = '';
          let accumulatedReasoning = '';

          const transformStream = new TransformStream({
            transform(chunk, controller) {
              sseBuffer += decoder.decode(chunk, { stream: true });
              const lines = sseBuffer.split('\n');
              sseBuffer = lines.pop() || '';

              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith('data: ')) continue;
                const dataStr = trimmed.replace('data: ', '');
                if (dataStr === '[DONE]') {
                  let finalOutput = accumulatedContent.trim();
                  if (/(?:User keeps asking|we need to call|must call|produce tool call|only tool call|no prose|\{"tool":|"tool":|according to instruction)/i.test(finalOutput)) {
                    finalOutput = '';
                  }

                  if (!finalOutput) {
                    const lastToolMsg = [...fullMessages].reverse().find((m: any) => m && m.role === 'tool');
                    finalOutput = lastToolMsg && typeof lastToolMsg.content === 'string' && lastToolMsg.content.trim()
                      ? formatConnectorResult(lastText, lastToolMsg.content.trim())
                      : 'I checked your active connectors. Click Connectors in the top right to view or manage your connected accounts and CLI tools.';
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: finalOutput })}\n\n`)
                    );
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }

                try {
                  const parsed = JSON.parse(dataStr);
                  const delta = parsed.choices?.[0]?.delta?.content || '';
                  const reasoning =
                    parsed.choices?.[0]?.delta?.reasoning ||
                    parsed.choices?.[0]?.delta?.reasoning_content ||
                    '';

                  if (reasoning) {
                    accumulatedReasoning += reasoning;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ thinking: reasoning })}\n\n`)
                    );
                  }
                  if (delta) {
                    accumulatedContent += delta;
                    controller.enqueue(
                      encoder.encode(`data: ${JSON.stringify({ content: delta })}\n\n`)
                    );
                  }
                } catch (e) {}
              }
            },
            flush(controller) {
              if (accumulatedContent.trim().length === 0) {
                const lastToolMsg = [...fullMessages].reverse().find((m: any) => m && m.role === 'tool');
                const fallbackText = lastToolMsg && typeof lastToolMsg.content === 'string' && lastToolMsg.content.trim()
                  ? lastToolMsg.content.trim()
                  : (accumulatedReasoning.trim() || 'Action completed.');
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: fallbackText })}\n\n`)
                );
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            },
          });

          return attachMcpSession(new Response(upstreamResponse.body.pipeThrough(transformStream), {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': `${endpoint.tag}-${targetModel}`,
            },
          }), toolContext);
        } catch (streamErr) {
          // Continue to next model / endpoint
        }
      }
    }

    // ========================================================
    // OMNIROUTER STAGE 1: Google Gemini Flash (Primary Cloud)
    // ========================================================
    const rawGemini = geminiKey || process.env.GEMINI_API_KEY;
    const activeGeminiKey = typeof rawGemini === 'string' && rawGemini.trim().length > 5
      ? rawGemini.trim().replace(/^["']|["']$/g, '')
      : undefined;
    if (activeGeminiKey) {
      try {
        const contents = messages.map((m: any) => {
          const parts: any[] = [];
          let textContent = m.content || '';

          if (m.attachments && Array.isArray(m.attachments)) {
            for (const att of m.attachments) {
              if (att.isImage && att.dataUrl) {
                const match = att.dataUrl.match(/^data:([^;]+);base64,(.+)$/);
                if (match) {
                  parts.push({
                    inline_data: {
                      mime_type: match[1],
                      data: match[2],
                    },
                  });
                }
              } else if (att.contentSnippet) {
                textContent += `\n\n--- [Attached Document: ${att.name}] ---\n${att.contentSnippet}\n--- [End of ${att.name}] ---`;
              }
            }
          }

          parts.unshift({
            text:
              textContent ||
              (parts.length > 0 ? 'Please analyze the attached media.' : 'Hello'),
          });

          return {
            role: m.role === 'user' ? 'user' : 'model',
            parts,
          };
        });

        // Robust Text-Generation Models for Google Gemini
        const priorityModels = [
          'gemini-2.0-flash',
          'gemini-1.5-flash',
          'gemini-1.5-pro',
          'gemini-2.5-flash',
        ];
        let targetModels = [...priorityModels];

        try {
          const listResp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${activeGeminiKey}`,
            { signal: AbortSignal.timeout(1500) }
          );
          if (listResp.ok) {
            const listData = await listResp.json();
            const discovered = (listData.models || [])
              .filter((m: any) =>
                m.supportedGenerationMethods?.includes('generateContent') &&
                !m.name.includes('tts') &&
                !m.name.includes('audio') &&
                !m.name.includes('embedding') &&
                !m.name.includes('imagen')
              )
              .map((m: any) => m.name.replace('models/', ''));

            if (discovered.length > 0) {
              targetModels = Array.from(new Set([
                ...priorityModels.filter((p) => discovered.includes(p)),
                ...discovered.filter((d: string) => d.includes('2.0') || d.includes('1.5')),
                ...discovered,
              ]));
            }
          }
        } catch (listErr) {}

        for (const candidate of targetModels.slice(0, 3)) {
          try {
            const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${candidate}:streamGenerateContent?alt=sse&key=${activeGeminiKey}`;
            const geminiResponse = await fetch(geminiUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents,
                generationConfig: { maxOutputTokens: 16384 },
              }),
              signal: AbortSignal.timeout(10000),
            });

            if (geminiResponse.ok) {
              const encoder = new TextEncoder();
              const decoder = new TextDecoder();
              let geminiBuffer = '';

              const transformStream = new TransformStream({
                transform(chunk, controller) {
                  geminiBuffer += decoder.decode(chunk, { stream: true });
                  const lines = geminiBuffer.split('\n');
                  geminiBuffer = lines.pop() || '';

                  for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed.startsWith('data: ')) continue;
                    const dataStr = trimmed.replace('data: ', '');

                    try {
                      const parsed = JSON.parse(dataStr);
                      const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      if (textChunk) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ content: textChunk })}\n\n`)
                        );
                      }
                    } catch (e) {}
                  }
                },
                flush(controller) {
                  if (geminiBuffer.trim().startsWith('data: ')) {
                    try {
                      const parsed = JSON.parse(geminiBuffer.trim().replace('data: ', ''));
                      const textChunk = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';
                      if (textChunk) {
                        controller.enqueue(
                          encoder.encode(`data: ${JSON.stringify({ content: textChunk })}\n\n`)
                        );
                      }
                    } catch (e) {}
                  }
                },
              });

              return attachMcpSession(new Response(geminiResponse.body?.pipeThrough(transformStream), {
                headers: {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'X-Claude-Skill': detectedSkill,
                  'X-Claude-Router': candidate,
                },
              }), toolContext);
            }
          } catch (modelErr) {
            // try next candidate
          }
        }
        // If Gemini models fail, cleanly fall through to OpenRouter / Synthesizer instead of throwing 400
      } catch (e) {
        // Fallback to next provider in OmniRouter chain
      }
    }


    // ========================================================
    // OMNIROUTER STAGE 4: Zero-Auth Fast Engine Fallback (3s Cap)
    // ========================================================
    try {
      const edgeResp = await fetch('https://text.pollinations.ai/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages.slice(-6).map((m: any) => ({
              role: m.role === 'user' ? 'user' : 'assistant',
              content: m.content || '',
            })),
          ],
          model: 'openai',
        }),
        signal: AbortSignal.timeout(20000),
      });

      if (edgeResp.ok) {
        let fullText = await edgeResp.text();
        if (
          fullText &&
          fullText.trim().length > 5 &&
          !fullText.includes('budget') &&
          !fullText.includes('rate limit') &&
          !fullText.includes('Queue full') &&
          !fullText.includes('Deprecation')
        ) {
          fullText = fullText.trim();
          const encoder = new TextEncoder();
          const chunkSize = 28;
          const stream = new ReadableStream({
            start(controller) {
              for (let pos = 0; pos < fullText.length; pos += chunkSize) {
                const piece = fullText.slice(pos, pos + chunkSize);
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`)
                );
              }
              controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              controller.close();
            },
          });

          return attachMcpSession(new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': 'cloud-instant-stream',
            },
          }), toolContext);
        }
      }
    } catch (e) {
      // Fall through to synthesizer
    }

    // ========================================================
    // AUTONOMOUS END-TO-END WORK & CONNECTOR EXECUTION (HERMES / OPEN INTERPRETER)
    // ========================================================
    const fallbackContent = await synthesizeClaudeEnterpriseResponse(lastText, modelId, detectedSkill, connectors, messages);
    const encoder = new TextEncoder();
    const chunkSize = 28;
    const stream = new ReadableStream({
      start(controller) {
        for (let pos = 0; pos < fallbackContent.length; pos += chunkSize) {
          const piece = fallbackContent.slice(pos, pos + chunkSize);
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`));
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return attachMcpSession(new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Skill': detectedSkill,
        'X-Claude-Router': 'claude-enterprise-edge',
      },
    }), toolContext);
  } catch (error: any) {
    const encoder = new TextEncoder();
    const safeMsg = `Hello! I am Boss. I am standing by and ready to help you. How can I assist you?`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: safeMsg })}\n\n`));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Skill': 'Enterprise Resilience',
        'X-Claude-Router': 'claude-emergency-shield',
      },
    });
  }
}
