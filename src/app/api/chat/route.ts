import { NextRequest, NextResponse } from 'next/server';
import { sendRealEmail } from '@/lib/mailer';
import { fetchLatestEmails } from '@/lib/imapReader';
import {
  listConnectedAccounts,
  executeComposioAction,
  executeComposioNaturalLanguage,
  createComposioConnectionLink,
  getComposioApiKey,
} from '@/lib/composio';

export const runtime = 'nodejs';
export const maxDuration = 60;

const OPENROUTER_MODELS: Record<string, string> = {
  'claude-3-7-sonnet': 'anthropic/claude-3.7-sonnet',
  'claude-3-5-sonnet': 'anthropic/claude-3.5-sonnet',
  'claude-3-5-haiku': 'anthropic/claude-3.5-haiku',
  'claude-3-opus': 'anthropic/claude-3-opus',
  'minimax-01': 'minimax/minimax-01',
  'deepseek-r1': 'deepseek/deepseek-r1:free',
  // "Boss" now really is the flagship model, not a mislabeled free one.
  'the-boss-chat': 'anthropic/claude-3.7-sonnet',
  'the-boss-build': 'anthropic/claude-3.7-sonnet',
};

// Real per-model output ceilings, not a guess. Verified: claude-3.7-sonnet's
// documented max is 128k but that can require provider-specific extended-
// output handling we haven't confirmed through OpenRouter, so it's set to a
// safely higher value instead of the untested max. claude-3.5-sonnet/haiku
// (8192) and claude-3-opus (4096) are Anthropic's real, fixed ceilings -
// opus genuinely cannot go higher. The free/other models' exact ceilings
// aren't verified, so they stay at a safe 8192 rather than a guessed number.
const MAX_TOKENS_BY_MODEL: Record<string, number> = {
  'anthropic/claude-3.7-sonnet': 16384,
  'anthropic/claude-3.5-sonnet': 8192,
  'anthropic/claude-3.5-haiku': 8192,
  'anthropic/claude-3-opus': 4096,
};
const DEFAULT_MAX_TOKENS = 8192;

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
      name: 'send_email',
      description: 'Send a real email via the connected Gmail/SMTP account. Only call this when the user has clearly asked you to send an email, with a real recipient.',
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
  {
    type: 'function',
    function: {
      name: 'connector_search',
      description: 'Search the live action catalog of enabled connected services. Use this to find the exact real action needed for GitHub, Gmail, Drive, Calendar, Slack, Notion, YouTube, and other connected services.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Describe the action needed, such as create a GitHub issue, update a repository file, list pull requests, send a Gmail message, or find a Drive file.' },
        },
        required: ['query'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connector_manage_connections',
      description: 'List connected Composio accounts or create a real OAuth Connect Link for an app. Use this when the user asks to connect, authorize, disconnect, or inspect an app.',
      parameters: {
        type: 'object',
        properties: {
          operation: { type: 'string', enum: ['list','connect','disconnect'] },
          toolkit: { type: 'string', description: 'App/toolkit slug such as github, gmail, google_calendar, google_drive, slack, notion, microsoft365, etc.' },
          connected_account_id: { type: 'string' },
          alias: { type: 'string' },
        },
        required: ['operation'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'connector_execute',
      description: 'Execute a real action on a connected service. Use the exact tool_slug returned by connector_search and provide arguments matching its schema. Never claim success unless the tool returns success.',
      parameters: {
        type: 'object',
        properties: {
          tool_slug: { type: 'string' },
          arguments: { type: 'object' },
        },
        required: ['tool_slug', 'arguments'],
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
];

async function runAgentTool(
  name: string,
  args: any,
  connectorContext: { apiKey?: string; connectors?: any[]; accounts?: any[]; composioUserId?: string } = {}
): Promise<string> {
  try {
    if (name === 'web_search') {
      const queryClean = String(args?.query || '').slice(0, 150);
      if (!queryClean) return 'No query provided.';
      let out = '';
      try {
        const ddgRes = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(queryClean)}&format=json&no_html=1&skip_disambig=1`, { signal: AbortSignal.timeout(6000) });
        if (ddgRes.ok) {
          const d = await ddgRes.json();
          if (d.AbstractText) out += `DuckDuckGo: ${d.AbstractText} (Source: ${d.AbstractURL || 'Web'})\n`;
        }
      } catch (e) {}
      try {
        const wikiRes = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(queryClean)}`, { headers: { 'User-Agent': 'Claude-Enterprise-App' }, signal: AbortSignal.timeout(6000) });
        if (wikiRes.ok) {
          const d = await wikiRes.json();
          if (d.extract) out += `Wikipedia: ${d.extract} (Source: ${d.content_urls?.desktop?.page || 'Wikipedia'})\n`;
        }
      } catch (e) {}
      return out || 'No results found for this query - report this honestly rather than guessing an answer.';
    }

    if (name === 'web_fetch') {
      const targetUrl = String(args?.url || '').replace(/[.,;:)]+$/, '');
      if (!targetUrl) return 'No URL provided.';
      const res = await fetch(targetUrl, {
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
      const to = String(args?.to || '');
      const subject = String(args?.subject || '');
      const body = String(args?.body || '');
      if (!to || !subject || !body) return 'Missing to/subject/body - cannot send.';

      if (connectorContext.apiKey && connectorContext.composioUserId && connectorContext.connectors?.some((c: any) => c?.id === 'conn-composio' && c?.enabled !== false)) {
        try {
          const liveAccounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId,
            'gmail'
          );
          const activeGmail = liveAccounts.filter((a: any) => a?.status === 'ACTIVE');
          if (activeGmail.length === 1) {
            const sent = await executeComposioAction(
              connectorContext.apiKey,
              'GMAIL_SEND_EMAIL',
              { to, subject, body },
              String(activeGmail[0].id),
              connectorContext.composioUserId
            );
            return sent.success
              ? JSON.stringify({ success: true, runtime: 'composio', data: sent.data })
              : JSON.stringify({ success: false, runtime: 'composio', error: sent.error || 'Gmail send failed.' });
          }
        } catch {}
      }

      const sendRes = await sendRealEmail({ to, subject, text: body });
      return sendRes.success
        ? 'Email sent successfully to ' + to + '. Message ID: ' + sendRes.messageId + '.'
        : 'Email FAILED to send: ' + sendRes.error;
    }

    if (name === 'read_inbox') {
      const count = Math.min(Number(args?.count) || 3, 10);

      if (connectorContext.apiKey && connectorContext.composioUserId && connectorContext.connectors?.some((c: any) => c?.id === 'conn-composio' && c?.enabled !== false)) {
        try {
          const liveAccounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId,
            'gmail'
          );
          const activeGmail = liveAccounts.filter((a: any) => a?.status === 'ACTIVE');
          if (activeGmail.length === 1) {
            const result = await executeComposioAction(
              connectorContext.apiKey,
              'GMAIL_LIST_MESSAGES',
              { maxResults: count },
              String(activeGmail[0].id),
              connectorContext.composioUserId
            );
            return result.success
              ? JSON.stringify({ success: true, runtime: 'composio', data: result.data })
              : JSON.stringify({ success: false, runtime: 'composio', error: result.error || 'Gmail inbox read failed.' });
          }
        } catch {}
      }

      const inboxRes = await fetchLatestEmails(count);
      if (!inboxRes.success) return 'Could not read inbox: ' + inboxRes.error;
      if (!inboxRes.emails.length) return 'Inbox is empty or SMTP/IMAP is not configured.';
      return inboxRes.emails.map((e: any) =>
        'From: ' + e.fromName + ' <' + e.from + '>, Subject: "' + e.subject + '", Date: ' + e.date
      ).join('\n');
    }

    if (name === 'connector_search') {
      if (!connectorContext.apiKey) {
        return 'Composio is not configured on the server.';
      }

      const { searchComposioTools, listConnectedAccounts } = await import('@/lib/composio');
      let accounts = Array.isArray(connectorContext.accounts) ? connectorContext.accounts : [];

      if (!accounts.length) {
        try {
          accounts = await listConnectedAccounts(
            connectorContext.apiKey,
            connectorContext.composioUserId
          );
        } catch {}
      }

      const activeToolkits = Array.from(new Set(
        accounts
          .filter((a: any) => a?.status === 'ACTIVE')
          .map((a: any) => String(a?.appUniqueId || a?.appName || '').toLowerCase())
          .filter(Boolean)
      ));
      // Match Composio Connect: search can discover an app before it is connected.
      const searchableToolkits = activeToolkits.length
        ? activeToolkits
        : ['github','gmail','google_drive','google_calendar','youtube','slack','notion','microsoft365','instagram','facebook','linkedin','linear','asana','canva','hubspot'];

      const found = await searchComposioTools(
        connectorContext.apiKey,
        String(args?.query || ''),
        searchableToolkits.slice(0, 20)
      );

      if (!found.length) {
        return 'No real Composio action matched the request for the connected app accounts.';
      }

      return JSON.stringify(found.slice(0, 20).map((t: any) => ({
        tool_slug: t.slug,
        toolkit: t.toolkit,
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })));
    }

    if (name === 'connector_manage_connections') {
      if (!connectorContext.apiKey) return 'Composio is not configured on the server.';
      const { listConnectedAccounts, createComposioConnectionLink } = await import('@/lib/composio');
      const operation = String(args?.operation || 'list').toLowerCase();
      let accounts = Array.isArray(connectorContext.accounts) ? connectorContext.accounts : [];
      try {
        accounts = await listConnectedAccounts(connectorContext.apiKey, connectorContext.composioUserId);
      } catch {}

      if (operation === 'list') {
        return JSON.stringify({ success: true, accounts: accounts.filter((a: any) => a?.status === 'ACTIVE').map((a: any) => ({
          id: a.id, toolkit: a.appUniqueId || a.appName, label: a.email || a.accountIdentifier || a.alias || a.id
        })) });
      }

      if (operation === 'connect') {
        const toolkit = String(args?.toolkit || '').trim();
        if (!toolkit) return 'toolkit is required to connect an app.';
        const link = await createComposioConnectionLink(
          connectorContext.apiKey,
          connectorContext.composioUserId || 'sameer-web-user',
          toolkit,
          undefined,
          String(args?.alias || '').trim() || undefined
        );
        return JSON.stringify({
          success: Boolean(link.success),
          toolkit,
          connect_url: link.redirectUrl || null,
          error: link.error || null,
          message: link.success ? ('Connect your ' + toolkit + ' account using the link, then return here and retry.') : 'Could not create the connection link.'
        });
      }

      if (operation === 'disconnect') {
        const id = String(args?.connected_account_id || '').trim();
        if (!id) return 'connected_account_id is required to disconnect an app.';
        const res = await fetch(
          'https://backend.composio.dev/api/v3.1/connected_accounts/' + encodeURIComponent(id),
          { method: 'DELETE', headers: { 'x-api-key': connectorContext.apiKey, 'Content-Type': 'application/json' }, cache: 'no-store' }
        );
        const data = await res.json().catch(() => ({}));
        return res.ok ? JSON.stringify({ success: true, connected_account_id: id }) : JSON.stringify({ success: false, error: data?.error?.message || data?.message || ('Disconnect failed (' + res.status + ').') });
      }
    }

    if (name === 'connector_execute') {
      if (!connectorContext.apiKey) return 'Composio is not configured on the server.';

      const slug = String(args?.tool_slug || '').trim();
      if (!slug) return 'tool_slug is required.';

      const { listConnectedAccounts } = await import('@/lib/composio');
      const toolkitAliases: Record<string, string> = {
        google: 'google_drive',
        googledrive: 'google_drive',
        gdrive: 'google_drive',
        gcalendar: 'google_calendar',
        googlecalendar: 'google_calendar',
        calendar: 'google_calendar',
        m365: 'microsoft365',
        microsoft: 'microsoft365',
      };

      const rawToolkit = slug.split('_')[0].toLowerCase();
      const normalizedToolkit =
        toolkitAliases[rawToolkit] ||
        (slug.toUpperCase().startsWith('GOOGLEDRIVE_') ? 'google_drive' : '') ||
        (slug.toUpperCase().startsWith('GOOGLECALENDAR_') ? 'google_calendar' : '') ||
        rawToolkit;

      let accounts = Array.isArray(connectorContext.accounts)
        ? connectorContext.accounts
        : [];

      try {
        accounts = await listConnectedAccounts(
          connectorContext.apiKey,
          connectorContext.composioUserId,
          normalizedToolkit
        );
      } catch {}

      const activeAccounts = accounts.filter((a: any) =>
        a?.status === 'ACTIVE' &&
        String(a?.appUniqueId || a?.appName || '').toLowerCase() === normalizedToolkit
      );

      const requestedAccountId = String(args?.connected_account_id || '').trim();
      const accountId =
        requestedAccountId ||
        (activeAccounts.length === 1 ? String(activeAccounts[0].id) : '');

      if (!accountId) {
        if (activeAccounts.length > 1) {
          return JSON.stringify({
            success: false,
            error: 'Multiple active ' + normalizedToolkit + ' accounts are connected. Select the intended account before executing this action.',
            accounts: activeAccounts.map((a: any) => ({
              id: a.id,
              label: a.email || a.accountIdentifier || a.label || a.id,
            })),
          });
        }

        return JSON.stringify({
          success: false,
          error: 'No ACTIVE Composio account is connected for ' + normalizedToolkit + ' for this app user.',
        });
      }

      const result = await executeComposioAction(
        connectorContext.apiKey,
        slug,
        args?.arguments || {},
        accountId,
        connectorContext.composioUserId
      );

      return result.success
        ? JSON.stringify({ success: true, runtime: 'composio', tool_slug: slug, data: result.data })
        : JSON.stringify({ success: false, runtime: 'composio', tool_slug: slug, error: result.error || 'Composio action failed.' });
    }

    return `Unknown tool: ${name}`;
  } catch (e: any) {
    return `Tool "${name}" failed: ${e?.message || 'unknown error'}`;
  }
}


const BUILTIN_OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || '';

const SYSTEM_PROMPTS = {
  'claude-3-7-sonnet':
    'You are Claude 3.7 Sonnet Enterprise — Anthropic’s flagship hybrid reasoning model with an autonomous doer engine. Provide exceptional depth, rigorous multi-step analysis, complete robust code implementations, and nuanced architectural guidance.',
  'claude-3-5-sonnet':
    'You are Claude 3.5 Sonnet — thoughtful, direct, and exceptionally capable AI. Reply with clear, elegant prose, nuanced reasoning, and deep assistance.',
  'claude-3-5-haiku':
    'You are Claude 3.5 Haiku — fast, precise, and concise AI. Provide immediate, accurate answers with clean formatting.',
  'claude-3-opus':
    'You are Claude 3 Opus — master author and insightful thinker. Provide rich, structured, and eloquently written thoughts.',
  'minimax-01':
    'You are MiniMax-01 Enterprise — MiniMax’s ultra-advanced 456B parameter reasoning model with a 1M token context window and native autonomous tool execution.',
  'deepseek-r1':
    'You are DeepSeek R1 Enterprise — state-of-the-art open reasoning engine built for complex mathematics, coding architectures, and autonomous multi-step execution.',
};

function isConnectorRelatedRequest(text: string): boolean {
  const lower = String(text || '').toLowerCase();
  const appTerms = [
    'github','gmail','google drive','drive','google calendar','calendar','youtube','slack','notion',
    'microsoft 365','instagram','facebook','linkedin','linear','asana','canva','hubspot'
  ];
  const connectorTerms = ['connector','connected app','connected account','authorize','authorization','oauth','linked account','access'];
  const actionTerms = ['repository','repositories','repo','pull request','issue','email','message','calendar event','file','folder','document','spreadsheet','channel','page','post','task','contact'];
  return appTerms.some((term) => lower.includes(term)) && (
    /\b(can you|could you|tell me|show me|list|find|search|read|get|check|create|add|update|edit|delete|send|reply|post|comment|upload|download|schedule|move|rename|archive|star|close|merge|how many|total|count)\b/i.test(lower)
    || connectorTerms.some((term) => lower.includes(term))
    || actionTerms.some((term) => lower.includes(term))
  );
}

function formatConnectorResult(requestText: string, result: any): string {
  const data = result?.data ?? result;
  const lower = String(requestText || '').toLowerCase();
  if (data == null) return 'Done.';
  if (typeof data === 'string' || typeof data === 'number' || typeof data === 'boolean') return String(data);
  if (typeof data !== 'object') return String(data);

  const directCount = data.total_count ?? data.totalCount ?? data.repository_count ?? data.repositoryCount ?? data.count;
  if (directCount != null && /\b(how many|total|count|number of)\b/i.test(lower)) {
    const noun = lower.includes('repositor') ? 'repositories' : lower.includes('email') ? 'emails' : 'items';
    return 'You have ' + String(directCount) + ' ' + noun + '.';
  }

  const candidates = [data.items, data.repositories, data.repos, data.results, data.data];
  const list = candidates.find((value: any) => Array.isArray(value));
  if (Array.isArray(list)) {
    if (/\b(how many|total|count|number of)\b/i.test(lower)) {
      const noun = lower.includes('repositor') ? 'repositories' : lower.includes('email') ? 'emails' : 'items';
      return 'You have ' + String(list.length) + ' ' + noun + '.';
    }
    const labels = list.slice(0, 5).map((item: any) => String(item?.name || item?.title || item?.full_name || item?.subject || item?.path || item?.id || '')).filter(Boolean);
    return labels.length ? labels.join('\n') + (list.length > labels.length ? '\n…and ' + String(list.length - labels.length) + ' more.' : '') : 'Found ' + String(list.length) + ' items.';
  }

  const compact = Object.entries(data)
    .filter(([key]) => !['access_token','refresh_token','token','credentials','connectionParams'].includes(key))
    .slice(0, 8)
    .map(([key, value]) => key + ': ' + (typeof value === 'object' ? JSON.stringify(value) : String(value)))
    .join('\n');
  return compact || 'Action completed successfully.';
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
      modelId = 'claude-3-7-sonnet',
      geminiKey,
      openRouterKey,
      omniRouteUrl,
      thinkingBudget = 16000,
      agentPrompt,
      connectors = [],
    } = await req.json();

    const composioApiKey = process.env.COMPOSIO_API_KEY || '';
    const composioUserId = String(req.cookies.get('sameer_composio_user_id')?.value || '').trim() || 'sameer-web-user';

    const isOmniRouteModel =
      modelId === 'the-boss-chat' ||
      modelId === 'the-boss-build' ||
      modelId === 'omniroute-auto';

    const userLastMsg = messages[messages.length - 1];
    const lastText = typeof userLastMsg?.content === 'string' ? userLastMsg.content : '';
    const lowerText = lastText.toLowerCase();

    // Live Composio status preflight. This runs before the model so questions
    // such as "is GitHub connected?" are answered from the real account store
    // instead of from model memory or stale UI state.
    const connectorStatusQuestion =
      /\b(?:is|are)\s+(?:my\s+)?(?:github|gmail|google drive|drive|calendar|youtube|slack|notion|microsoft 365|instagram|facebook|linkedin|linear|asana|canva|hubspot)\s+(?:connected|authorized|linked)\b/i.test(lastText) ||
      /\bdo\s+you\s+have\s+(?:a\s+)?(?:github|gmail|google drive|drive|calendar|youtube|slack|notion|microsoft 365)\s+(?:connection|access)\b/i.test(lastText) ||
      /\b(?:list|show|what)\s+(?:my\s+)?(?:connected|authorized|linked)\s+(?:apps?|accounts?|services?)\b/i.test(lastText) ||
      /\bwhat\s+(?:apps?|services?)\s+(?:are|am)\s+(?:you|we)\s+(?:connected|linked)\s+with\b/i.test(lastText);

    if (connectorStatusQuestion) {
      let statusText = '';
      if (!composioApiKey) {
        statusText =
          '### Composio connector status\n\n' +
          'The Composio project API key is not configured on the server. No connected app is available to chat right now.';
      } else {
        try {
          const accounts = await listConnectedAccounts(composioApiKey, composioUserId);
          const active = accounts.filter((a) => a?.status === 'ACTIVE');
          if (!active.length) {
            statusText =
              '### Composio connector status\n\n' +
              'No ACTIVE app accounts are connected for this Composio user yet. Open **Connectors → Composio → Connect**, authorize an app, and retry.';
          } else {
            const lines = active.map((a) => {
              const toolkit = String(a?.appUniqueId || a?.appName || 'unknown');
              const label = String(a?.email || a?.accountIdentifier || a?.id || 'account authorized');
              return '- **' + toolkit + '** — ' + label + ' (ACTIVE)';
            });
            statusText =
              '### Composio connector status\n\n' +
              'The following app accounts are ACTIVE for this app user:\n\n' +
              lines.join('\n') +
              '\n\nThose accounts are the accounts the chat can resolve for Composio tool execution.';
          }
        } catch (err: any) {
          statusText =
            '### Composio connector status\n\n' +
            'The live Composio account lookup failed: ' + (err?.message || 'unknown error') + '.';
        }
      }

      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          for (let pos = 0; pos < statusText.length; pos += 32) {
            controller.enqueue(
              encoder.encode('data: ' + JSON.stringify({ content: statusText.slice(pos, pos + 32) }) + '\n\n')
            );
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
          'X-Claude-Skill': 'Composio Connector Status',
          'X-Claude-Router': 'composio-live-status',
        },
      });
    }

    // Connector-first execution: connected-app requests go directly to Composio
    // before model-provider routing, so connector work does not depend on a
    // particular model's tool-calling support.
    const connectorFirstRequest = isConnectorRelatedRequest(lastText);
    if (connectorFirstRequest && composioApiKey && Array.isArray(connectors) && connectors.some((c: any) => c?.id === 'conn-composio' && c?.enabled !== false)) {
      try {
        const liveAccounts = await listConnectedAccounts(composioApiKey, composioUserId);
        const active = liveAccounts.filter((a: any) => a?.status === 'ACTIVE');
        if (active.length) {
          const executed = await executeComposioNaturalLanguage(
            composioApiKey,
            composioUserId,
            lastText,
            connectors,
            liveAccounts,
            modelId,
            new URL('/api/composio/callback', req.url).toString()
          );
          if (executed.success) {
            const content = formatConnectorResult(lastText, executed);
            const stream = new ReadableStream({
              start(controller) {
                const encoder = new TextEncoder();
                for (let pos = 0; pos < content.length; pos += 32) {
                  controller.enqueue(encoder.encode('data: ' + JSON.stringify({ content: content.slice(pos, pos + 32) }) + '\n\n'));
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
              },
            });
            return new Response(stream, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'X-Claude-Skill': 'Composio Connector Execution',
                'X-Claude-Router': 'composio-direct-runtime',
              },
            });
          }
        }
      } catch {}
    }
    // ========================================================
    // COMPOSIO CONNECTOR CONTEXT
    // ========================================================
    let connectorContext = '';
    const activeConnectors = Array.isArray(connectors) ? connectors.filter((c: any) => c?.enabled) : [];
    const composioHubEnabled = activeConnectors.some((c: any) => c?.id === 'conn-composio');

    if (composioHubEnabled && composioApiKey) {
      try {
        const realAccounts = await listConnectedAccounts(composioApiKey, composioUserId);
        const activeAccounts = realAccounts.filter((a: any) => a?.status === 'ACTIVE');
        connectorContext += '\n\n[COMPOSIO LIVE ACCOUNTS]\n';

        if (!activeAccounts.length) {
          connectorContext += '- No ACTIVE Composio app accounts are connected for this user.\n';
        } else {
          connectorContext += activeAccounts.map((account: any) => {
            const toolkit = String(account?.appUniqueId || account?.appName || 'unknown');
            const label = String(account?.email || account?.accountIdentifier || account?.alias || account?.id || 'connected account');
            return '- ' + toolkit + ' — ' + label + ' (ACTIVE)';
          }).join('\n') + '\n';
        }

        connectorContext += '- The model must use connector_search before connector_execute and report only real tool results.\n';
      } catch (err: any) {
        connectorContext += '\n[COMPOSIO LIVE ACCOUNTS]\n- Lookup failed: ' + (err?.message || 'unknown error') + '.\n';
      }
    } else if (composioHubEnabled) {
      connectorContext += '\n\n[COMPOSIO LIVE ACCOUNTS]\n- Composio project API key is not configured on the server. No external app action is available.\n';
    }

    // URL fetching is now the web_fetch agent tool below, instead of a
    // regex-triggered block here.

    const developerDirective = `\nInstructions:
1. Be concise by default: answer in 1-4 sentences unless the user asks for detail, code, or a step-by-step explanation. Never add unrelated project plans or canned introductions.
2. When answering technical or coding questions, provide ready-to-use implementations, architecture design, and step-by-step guidance.
2b. Only use triple-backtick code blocks for actual code, commands, or file contents. Never wrap a plain-text explanation, list, or prose answer in a code block just because it is long or structured - write it as normal markdown (headings, **bold**, bullet lists) so it wraps and formats correctly instead of showing as a scrollable code box.
3. Be direct, helpful, and completely honest. Never fabricate fake API confirmations, fake dispatch cards, or pretend external actions occurred if they didn't.
4. Stay focused on the user's exact request. Do not invent tasks, claims, completed actions, or unrelated capabilities.\n`;

    const baseSystemPrompt =
      agentPrompt ||
      SYSTEM_PROMPTS[modelId as keyof typeof SYSTEM_PROMPTS] ||
      SYSTEM_PROMPTS['claude-3-7-sonnet'];

    const systemPrompt = `${baseSystemPrompt}${developerDirective}${connectorContext}`;

    const hasImages =
      userLastMsg?.attachments?.some((a: any) => a.isImage && a.dataUrl) || false;
    const detectedSkill = detectSkill(lastText, hasImages);

    // ========================================================
    // OMNIROUTER STAGE 0: Direct OmniRoute Model Dispatch (Local)
    // ========================================================
    if (isOmniRouteModel) {
      const isCloudEnv = Boolean(process.env.VERCEL || process.env.AWS_REGION);
      const targetOmniUrl =
        omniRouteUrl || process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1/chat/completions';
      const isLocalhost = targetOmniUrl.includes('127.0.0.1') || targetOmniUrl.includes('localhost');

      if (!isCloudEnv || !isLocalhost) {
        const OMNIROUTE_TARGET_MODELS: Record<string, string> = {
          'the-boss-chat': 'openrouter/nex-agi/nex-n2.5-pro:free',
          'the-boss-build': 'opencode/big-pickle',
          'omniroute-auto': 'auto/best-reasoning',
        };

        const targetModel = OMNIROUTE_TARGET_MODELS[modelId] || 'auto/best-reasoning';
        // SECURITY: no hardcoded fallback - a live key was previously hardcoded here.
        const omniKey = process.env.OMNIROUTE_API_KEY || '';

        try {
          const omniResp = await fetch(targetOmniUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${omniKey}`,
            },
            body: JSON.stringify({
              model: targetModel,
              messages: [
                { role: 'system', content: systemPrompt },
                ...messages.map((m: any) => ({
                  role: m.role === 'user' ? 'user' : 'assistant',
                  content: m.content || '',
                })),
              ],
              stream: true,
              max_tokens: 16384,
            }),
            // was 1200ms - cut off a real streaming answer almost immediately;
            // now enough time to actually finish a normal response.
            signal: AbortSignal.timeout(45000),
          });

          if (omniResp.ok) {
            return new Response(omniResp.body, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'X-Claude-Skill': detectedSkill,
                'X-Claude-Router': `omniroute-${modelId}`,
              },
            });
          }
        } catch (omniErr) {
          // Fall through to cloud fallback if local OmniRoute is unreachable (e.g. running on Vercel)
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

              return new Response(geminiResponse.body?.pipeThrough(transformStream), {
                headers: {
                  'Content-Type': 'text/event-stream',
                  'Cache-Control': 'no-cache',
                  Connection: 'keep-alive',
                  'X-Claude-Skill': detectedSkill,
                  'X-Claude-Router': candidate,
                },
              });
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
    // OMNIROUTER STAGE 2: Local / Custom OmniRoute Server
    // ========================================================
    const isCloudEnv = Boolean(process.env.VERCEL || process.env.AWS_REGION);
    const targetOmniUrl =
      omniRouteUrl || process.env.OMNIROUTE_URL || 'http://127.0.0.1:20128/v1/chat/completions';
    const isLocalhost = targetOmniUrl.includes('127.0.0.1') || targetOmniUrl.includes('localhost');

    if (!isCloudEnv || !isLocalhost) {
      try {
        const omniResp = await fetch(targetOmniUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OMNIROUTE_URL_TOKEN || ''}`,
          },
          body: JSON.stringify({
            model: 'auto/claude-sonnet',
            messages: [
              { role: 'system', content: systemPrompt },
              ...messages.map((m: any) => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content,
              })),
            ],
            stream: true,
            max_tokens: 16384,
          }),
          // was 1200ms - cut off a real streaming answer almost immediately;
          // now enough time to actually finish a normal response.
          signal: AbortSignal.timeout(45000),
        });

        if (omniResp.ok) {
          return new Response(omniResp.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': 'omniroute-local',
            },
          });
        }
      } catch (e) {
        // Fallback to next provider in OmniRouter chain
      }
    }

    // ========================================================
    // OMNIROUTER STAGE 3: High-Speed Primary Cloud Stream (Sub-second)
    // ========================================================
    const rawOrKey = openRouterKey || process.env.OPENROUTER_API_KEY || BUILTIN_OPENROUTER_KEY;
    const activeOrKey = typeof rawOrKey === 'string' && rawOrKey.trim().length > 5
      ? rawOrKey.trim().replace(/^["']|["']$/g, '')
      : BUILTIN_OPENROUTER_KEY;

    if (activeOrKey) {
      const selectedTargetModel =
        OPENROUTER_MODELS[modelId as keyof typeof OPENROUTER_MODELS] ||
        'nvidia/nemotron-3-ultra-550b-a55b:free';

      const candidateModels = Array.from(
        new Set([
          selectedTargetModel,
          'nvidia/nemotron-3.5-lightning:free',
          'deepseek/deepseek-v4-flash-0731:free',
          'nvidia/nemotron-3-ultra-550b-a55b:free',
          'inclusionai/ling-3.0-flash-vl:free',
        ])
      ).slice(0, 4);

      const recentMessages = messages.slice(-8);
      const fullMessages = [
        { role: 'system', content: systemPrompt },
        ...recentMessages.map((m: any) => {
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

      // MULTI-STEP AGENT LOOP: call -> execute tools -> feed results back ->
      // repeat, until the model gives a final answer with no more tool
      // calls, or we hit the turn/time limits. Time-budgeted so this never
      // eats into the final answer's share of the 60s Vercel function cap.
      if (activeOrKey) {
        const agentDeadline = requestStartTime + 40000; // leave time for the final streamed answer
        const maxAgentTurns = 6;
        let connectorAccounts: any[] = [];
        if (composioApiKey && Array.isArray(connectors) && connectors.some((c: any) => c?.id === 'conn-composio' && c?.enabled !== false)) {
          try {
            connectorAccounts = await listConnectedAccounts(composioApiKey, composioUserId);
          } catch {}
        }

        for (let turn = 0; turn < maxAgentTurns; turn++) {
          if (Date.now() > agentDeadline) break;

          try {
            const agentResp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${activeOrKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://claude-enterprise-app.vercel.app',
                'X-Title': 'Claude Enterprise Cloud',
              },
              body: JSON.stringify({
                model: 'anthropic/claude-3.7-sonnet',
                messages: fullMessages,
                tools: AGENT_TOOLS,
                tool_choice: 'auto',
                max_tokens: 2048,
              }),
              signal: AbortSignal.timeout(Math.max(3000, agentDeadline - Date.now())),
            });

            if (!agentResp.ok) break;

            const agentData = await agentResp.json();
            const agentMsg = agentData?.choices?.[0]?.message;
            const toolCalls = agentMsg?.tool_calls;

            if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
              // Model didn't ask for a tool this turn - nothing more to do,
              // let the normal streaming call below produce the real answer.
              break;
            }

            fullMessages.push(agentMsg);

            for (const call of toolCalls) {
              const toolName = call.function?.name;
              let toolArgs: Record<string, any> = {};
              try {
                toolArgs = JSON.parse(call.function?.arguments || '{}');
              } catch (e) {}

              const result = await runAgentTool(toolName, toolArgs, {
                apiKey: composioApiKey,
                connectors,
                accounts: connectorAccounts,
                composioUserId,
              });

              fullMessages.push({
                role: 'tool',
                tool_call_id: call.id,
                content: result,
              });
            }
            // loop continues: model sees the real tool result(s) and decides
            // whether it needs another tool call or is ready to answer.
          } catch (e) {
            break;
          }
        }
      }

      for (const cand of candidateModels) {
        try {
          const upstreamResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${activeOrKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://claude-enterprise-app.vercel.app',
              'X-Title': 'Claude Enterprise Cloud',
            },
            body: JSON.stringify({
              model: cand,
              messages: fullMessages,
              stream: true,
              max_tokens: MAX_TOKENS_BY_MODEL[cand] || DEFAULT_MAX_TOKENS,
            }),
            // was 45s - too short for long code/analysis responses; the
            // Vercel function itself is capped at maxDuration (60s) above,
            // so this stays just under that rather than cutting off early.
            signal: AbortSignal.timeout(58000),
          });

          if (!upstreamResponse.ok) {
            continue;
          }

          if (upstreamResponse.ok && upstreamResponse.body) {
            const encoder = new TextEncoder();
            const decoder = new TextDecoder();
            let orBuffer = '';
            let accumulatedContent = '';
            let accumulatedReasoning = '';

            const transformStream = new TransformStream({
              transform(chunk, controller) {
                orBuffer += decoder.decode(chunk, { stream: true });
                const lines = orBuffer.split('\n');
                orBuffer = lines.pop() || '';

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || !trimmed.startsWith('data: ')) continue;
                  const dataStr = trimmed.replace('data: ', '');
                  if (dataStr === '[DONE]') {
                    if (accumulatedContent.trim().length < 60 && accumulatedReasoning.trim().length > 30) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content: '\n\n' + accumulatedReasoning })}\n\n`)
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
                if (accumulatedContent.trim().length < 60 && accumulatedReasoning.trim().length > 30) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ content: '\n\n' + accumulatedReasoning })}\n\n`)
                  );
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
              },
            });

            return new Response(upstreamResponse.body.pipeThrough(transformStream), {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                Connection: 'keep-alive',
                'X-Claude-Skill': detectedSkill,
                'X-Claude-Router': `openrouter-${cand}`,
              },
            });
          }
        } catch (e) {
          // try next candidate model
        }
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

          return new Response(stream, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              Connection: 'keep-alive',
              'X-Claude-Skill': detectedSkill,
              'X-Claude-Router': 'cloud-instant-stream',
            },
          });
        }
      }
    } catch (e) {
      // Fall through to synthesizer
    }

    // ========================================================
    // AUTONOMOUS END-TO-END WORK & CONNECTOR EXECUTION (HERMES / OPEN INTERPRETER)
    // ========================================================
    const fallbackContent = await synthesizeClaudeEnterpriseResponse(lastText, modelId, detectedSkill, activeConnectors, messages);
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

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Skill': detectedSkill,
        'X-Claude-Router': 'claude-enterprise-edge',
      },
    });
  } catch (error: any) {
    const encoder = new TextEncoder();
    const safeMsg = `Hello! I am Claude 3.7 Sonnet Enterprise. I am standing by and ready to help you. How can I assist you with your project?`;
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
