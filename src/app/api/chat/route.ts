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
      name: 'execute_code',
      description: 'Run Python, JavaScript, or TypeScript code in an isolated temporary cloud sandbox. Use this when the user asks you to execute, test, calculate with, debug by running, or verify code. Never claim code was executed unless this tool returns an execution result.',
      parameters: {
        type: 'object',
        properties: {
          language: {
            type: 'string',
            enum: ['python', 'javascript', 'typescript'],
            description: 'Programming language.',
          },
          code: {
            type: 'string',
            description: 'Complete source code to execute.',
          },
          timeout_ms: {
            type: 'number',
            description: 'Optional execution timeout in milliseconds, from 1000 to 30000.',
          },
        },
        required: ['language', 'code'],
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
  const toolkit = String(toolName || '').toLowerCase().split('_')[0];
  return connectors.find((connector: any) =>
    connector?.enabled !== false &&
    String(connector?.provider || '').toLowerCase() === 'composio' &&
    String(connector?.config?.composioToolkit || '').toLowerCase() === toolkit
  );
}

async function runAgentTool(
  name: string,
  args: any,
  connectorContext: {
    remoteMcpToolRoutes?: Record<string, { connector: any; originalToolName: string }>;
    connectors?: any[];
    remoteCredentials?: Record<string, RemoteStoredToken | undefined>;
    remoteMcpUpdates?: Record<string, RemoteStoredToken>;
    requestText?: string;
    requestOidcToken?: string;
  } = {}
): Promise<string> {
  try {
    const policyConnector = findConnectorForTool(connectorContext, name);
    const policy = connectorToolPermission(policyConnector, name, args, String(connectorContext.requestText || ''));
    if (policy.decision === 'blocked') return 'TOOL_BLOCKED: ' + (policy.reason || 'This connector tool is blocked.');
    if (policy.decision === 'approval') {
      return 'APPROVAL_REQUIRED: ' + (policy.reason || 'Please confirm this action before I execute it.') + ' Tool: ' + name + '. I have not executed the action.';
    }

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

    if (name === 'web_search') {
      const queryClean = String(args?.query || '').trim();
      if (!queryClean) return 'No query provided.';

      const decodeHtml = (value: string): string =>
        value
          .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
          .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
          .replace(/&quot;/gi, '"')
          .replace(/&#39;|&apos;/gi, "'")
          .replace(/&amp;/gi, '&')
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>');

      const unwrapDuckUrl = (rawHref: string): string => {
        try {
          const href = rawHref.startsWith('//') ? `https:${rawHref}` : rawHref;
          const parsed = new URL(href, 'https://duckduckgo.com');
          const uddg = parsed.searchParams.get('uddg');
          return uddg ? decodeURIComponent(uddg) : href;
        } catch {
          return rawHref;
        }
      };

      const results: Array<{ title: string; url: string; snippet: string }> = [];
      try {
        const response = await fetch(
          `https://html.duckduckgo.com/html/?q=${encodeURIComponent(queryClean)}`,
          {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
              Accept: 'text/html,application/xhtml+xml',
            },
            signal: AbortSignal.timeout(10000),
          }
        );

        if (response.ok) {
          const html = await response.text();
          const resultPattern = /<div[^>]*class="result[^"]*"[^>]*>([\s\S]*?)<\/div>\s*<\/div>/gi;
          let blockMatch: RegExpExecArray | null;
          while ((blockMatch = resultPattern.exec(html)) !== null && results.length < 8) {
            const block = blockMatch[1];
            const titleMatch = block.match(/<a[^>]*class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/i);
            if (!titleMatch) continue;
            const snippetMatch =
              block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/i) ||
              block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/span>/i);
            const title = decodeHtml(titleMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
            const url = unwrapDuckUrl(titleMatch[1]);
            const snippet = decodeHtml(
              String(snippetMatch?.[1] || '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
            );
            if (title && /^https?:\/\//i.test(url)) results.push({ title, url, snippet });
          }
        }
      } catch {}

      if (results.length === 0) {
        try {
          const response = await fetch(
            `https://api.duckduckgo.com/?q=${encodeURIComponent(queryClean)}&format=json&no_html=1&skip_disambig=1`,
            { headers: { 'User-Agent': 'Sameer-AI-Workspace/1.0' }, signal: AbortSignal.timeout(7000) }
          );
          if (response.ok) {
            const data = await response.json();
            if (data.AbstractURL && (data.AbstractText || data.Heading)) {
              results.push({
                title: String(data.Heading || queryClean),
                url: String(data.AbstractURL),
                snippet: String(data.AbstractText || ''),
              });
            }
            for (const topic of Array.isArray(data.RelatedTopics) ? data.RelatedTopics : []) {
              if (results.length >= 8) break;
              if (topic?.FirstURL && topic?.Text) {
                results.push({
                  title: String(topic.Text).split(' - ')[0].trim().slice(0, 180),
                  url: String(topic.FirstURL),
                  snippet: String(topic.Text),
                });
              }
            }
          }
        } catch {}
      }

      if (results.length === 0) return 'No search results found for: ' + queryClean;
      return [
        `Web search results for: ${queryClean}`,
        ...results.map((item, index) =>
          `${index + 1}. ${item.title}\nURL: ${item.url}${item.snippet ? `\nSnippet: ${item.snippet}` : ''}`
        ),
      ].join('\n\n');
    }

    if (name === 'web_fetch') {
      const targetUrl = String(args?.url || '').trim().replace(/[.,;:)>]+$/, '');
      if (!targetUrl) return 'No URL provided.';
      const safeUrl = getSafeHttpUrl(targetUrl);
      if (!safeUrl) return 'Fetch blocked: only public HTTP(S) URLs are allowed.';

      const extractReadableText = (html: string): string => {
        return html
          .replace(/<script\b[^<]*(?:(?!<\/script>)[^<]*)*<\/script>/gis, ' ')
          .replace(/<style\b[^<]*(?:(?!<\/style>)[^<]*)*<\/style>/gis, ' ')
          .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)[^<]*)*<\/noscript>/gis, ' ')
          .replace(/<(nav|footer|header|aside|form)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
          .replace(/<br\s*\/?>(?=.)/gi, '\n')
          .replace(/<\/(p|div|article|section|li|h[1-6])>/gi, '\n')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&nbsp;/gi, ' ')
          .replace(/&amp;/gi, '&')
          .replace(/&quot;/gi, '"')
          .replace(/&#39;|&apos;/gi, "'")
          .replace(/&lt;/gi, '<')
          .replace(/&gt;/gi, '>')
          .replace(/\u00a0/g, ' ')
          .replace(/[ \t]+/g, ' ')
          .replace(/\n[ \t]+/g, '\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();
      };

      try {
        const response = await fetch(safeUrl.toString(), {
          redirect: 'follow',
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/154 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/json,text/plain;q=0.9,*/*;q=0.8',
          },
          signal: AbortSignal.timeout(12000),
        });

        if (!response.ok) return `Fetch failed with status ${response.status}.`;
        const finalUrl = response.url || safeUrl.toString();
        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        const raw = await response.text();

        if (contentType.includes('application/json')) {
          return `Fetched URL: ${finalUrl}\nContent-Type: ${contentType}\n\n${raw.slice(0, 12000)}`;
        }

        const title =
          raw.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]
            ?.replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim() || '';
        const canonical = raw.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)?.[1] || finalUrl;
        const text = extractReadableText(raw);

        if (text.length >= 120) {
          return [
            `Fetched URL: ${finalUrl}`,
            title ? `Title: ${title}` : '',
            canonical ? `Canonical: ${canonical}` : '',
            `\n${text.slice(0, 12000)}`,
          ].filter(Boolean).join('\n');
        }

        // Public reader fallback for JS-heavy pages.
        try {
          const readerResponse = await fetch(
            `https://r.jina.ai/http://${safeUrl.toString().replace(/^https?:\/\//i, '')}`,
            {
              headers: { 'User-Agent': 'Sameer-AI-Workspace/1.0', Accept: 'text/plain' },
              signal: AbortSignal.timeout(12000),
            }
          );
          if (readerResponse.ok) {
            const readerText = (await readerResponse.text()).trim();
            if (readerText.length >= 80) {
              return `Fetched URL: ${finalUrl}\n\n${readerText.slice(0, 12000)}`;
            }
          }
        } catch {}

        return 'Fetched the page but found little readable text; it may be JavaScript-rendered or require authentication.';
      } catch (e: any) {
        return `Fetch failed: ${e?.message || 'network error'}`;
      }
    }

    if (name === 'execute_code') {
      const { executeCodeInSandbox } = await import('@/lib/codeSandbox');
      return executeCodeInSandbox({
        language: String(args?.language || ''),
        code: String(args?.code || ''),
        timeoutMs: Number(args?.timeout_ms) || 15000,
        requestOidcToken: String(connectorContext.requestOidcToken || '').trim() || undefined,
      });
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
- execute_code: Run Python, JavaScript, or TypeScript in an isolated disposable Vercel Sandbox and return the real stdout/stderr and exit code.

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
  context?: { composioUserId?: string; remoteMcpUpdates?: Record<string, RemoteStoredToken>; connectors?: any[] }
): Response {
  if (!context?.composioUserId && !context?.remoteMcpUpdates) return response;

  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const httpOnlyBase = '; Path=/; HttpOnly; SameSite=Lax' + secure;

  if (context?.composioUserId) {
    response.headers.append(
      'Set-Cookie',
      'sameer_composio_user_id=' + encodeURIComponent(context.composioUserId) + httpOnlyBase + '; Max-Age=' + 60 * 60 * 24 * 365 * 5
    );
  }

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
  mcpContext?: { composioUserId?: string; remoteMcpUpdates?: Record<string, RemoteStoredToken>; connectors?: any[] }
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
        let msg = 'You currently have **0 connected apps**.';
        if (manageUrl) {
          msg += `\n\nConnect more apps here: [Open Connectors](${manageUrl})`;
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
      let response = `Here are your live connected apps:\n\n` + lines.join('\n');
      if (manageUrl) {
        response += `\n\nOpen Connectors to manage these accounts or connect another app: [Open Connectors](${manageUrl})`;
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
    } = await req.json();

    const composioUserId = String(req.cookies.get('sameer_composio_user_id')?.value || '').trim() || 'sameer_' + crypto.randomUUID();

    const isOmniRouteModel = true;

    const userLastMsg = messages[messages.length - 1];
    const lastText = typeof userLastMsg?.content === 'string' ? userLastMsg.content : '';
    const lowerText = lastText.toLowerCase();

    // New first-class connector runtime. Connector requests never fall back to
    // the legacy Composio For You/MCP connector runtime.
    if (isConnectorRelatedRequest(lastText)) {
      if (!hasComposioPlatformKey()) {
        return streamTextDirectly(
          'Connectors are not configured on the server yet. Add COMPOSIO_API_KEY in the production environment, then reopen Connectors.',
          'Connector Hub'
        );
      }
      try {
        const platformResponse = await runComposioPlatformAgent({
          requestText: lastText,
          messages,
          connectors,
          userId: String(req.cookies.get('sameer_composio_user_id')?.value || '').trim() || 'sameer_' + crypto.randomUUID(),
          origin: new URL(req.url).origin,
          modelId: String(modelId),
        });
        if (platformResponse) return platformResponse;
      } catch (platformErr: any) {
        console.error('[COMPOSIO PLATFORM ERR]', platformErr?.message || platformErr);
        return streamTextDirectly(
          'Connector execution failed: ' + String(platformErr?.message || 'unknown error') + '. No connector action was fabricated.',
          'Connector Hub'
        );
      }
    }

    // Connector instructions are isolated inside the dedicated connector runtime.
    // General chat never receives a hidden/default Composio session.

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

    const systemPrompt = `${baseSystemPrompt}${developerDirective}`;

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

    // General tool execution supports web, email, GitHub lookup, and custom remote MCP.
    // Built-in app connectors are handled exclusively by runComposioPlatformAgent above.
    const hasEnabledRemoteMcp = connectors.some((c: any) =>
      c?.enabled !== false &&
      String(c?.config?.connectionType || c?.provider || '').toLowerCase() === 'mcp' &&
      Boolean(c?.config?.mcpUrl || c?.url)
    );
    const agentDeadline = requestStartTime + (hasEnabledRemoteMcp ? 200000 : 120000);
    const maxAgentTurns = hasEnabledRemoteMcp ? 16 : 8;
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

    const effectiveTools = [
      ...AGENT_TOOLS,
      ...remoteMcpTools,
    ];

    const toolContext = {
      connectors: runtimeConnectors,
      remoteMcpToolRoutes,
      remoteCredentials,
      remoteMcpUpdates,
      requestText: lastText,
      composioUserId,
      requestOidcToken: req.headers.get('x-vercel-oidc-token') || '',
    };

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
            tool_choice: 'auto',
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
          const contentText = String(agentMsg?.content || '').trim();
          const reasoningText = String(agentMsg?.reasoning || agentMsg?.reasoning_content || '').trim();
          const checkText = contentText || reasoningText;

          const isPlanningText =
            /(?:User keeps asking|we need to call|must call|produce tool call|only tool call|no prose|\{"tool":|"tool":|according to instruction)/i.test(checkText) ||
            (!contentText && Boolean(reasoningText)) ||
            /(?:we need to|we should|let's call|i will call|calling|we must|action likely|should output tool call|user wants|user asks|need to call|need to find|first, need to|first need to|to search actions|search actions for)/i.test(checkText);

          if (isPlanningText && planningNudges < 3) {
            planningNudges++;
            fullMessages.push({
              role: 'system',
              content: 'Use an available tool now when the user request requires external data or an external action. Do not narrate the tool call.',
            });
            continue;
          }

          if (contentText) return streamTextDirectly(contentText, detectedSkill, toolContext);
          if (reasoningText) return streamTextDirectly(reasoningText, detectedSkill, toolContext);
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
        }
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
              'X-Claude-Skill': detectedSkill,              'X-Claude-Skill': detectedSkill,
            },
          }), toolContext);
        }
      } catch (error) {
        console.error('[EDGE FALLBACK ERR]', error);
      }
    }
  } catch (error: any) {
    const encoder = new TextEncoder();
    const safeMsg = `Hello! I am Boss. I am standing by and ready to help you. How can I assist you?`;
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: safeMsg })}\\n\\n`));
        controller.enqueue(encoder.encode('data: [DONE]\\n\\n'));
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
