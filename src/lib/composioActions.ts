/**
 * Deterministic Composio "For You" action dispatcher.
 *
 * The model agent loop is slow (multiple LLM round-trips) and flaky for
 * connector requests, which caused timeouts/500s on Vercel. These helpers
 * detect the user's intent from plain text and execute the real Composio MCP
 * action directly — one round-trip, real data, clean formatting.
 */

export interface DetectedComposioAction {
  slug: string;
  args: Record<string, any>;
  label: string;
  app: string;
  /** Connected account ids to execute against (one MULTI_EXECUTE entry each). */
  accountIds?: string[];
  /** Fields that must be present in args before the action can execute. */
  requiredFields?: string[];
}

const ACTION_SLUGS = {
  youtubeListPlaylists: 'YOUTUBE_LIST_USER_PLAYLISTS',
  youtubeCreatePlaylist: 'YOUTUBE_CREATE_PLAYLIST',
  youtubeInsertPlaylistItem: 'YOUTUBE_INSERT_PLAYLIST_ITEM',
  githubListRepos: 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
  githubCreateIssue: 'GITHUB_CREATE_AN_ISSUE',
  gmailListThreads: 'GMAIL_LIST_THREADS',
  gmailSendEmail: 'GMAIL_SEND_EMAIL',
  calendarListEvents: 'GOOGLECALENDAR_LIST_EVENTS',
  calendarCreateEvent: 'GOOGLECALENDAR_CREATE_EVENT',
} as const;

/**
 * Detect a supported connector action from the user's request text.
 * Returns null when the intent is not confidently recognized so the caller
 * can fall back to the model agent loop.
 */
export function detectComposioAction(text: string): DetectedComposioAction | null {
  const lower = String(text || '').toLowerCase();

  const has = (...words: string[]) => words.some((w) => lower.includes(w));

  // Create/write intents are handled by the real agent loop, which asks the
  // user for required fields (e.g. playlist title) and then executes. The
  // deterministic dispatcher only handles fast read actions.
  if (/\b(create|make|add|send|compose|reply|schedule|insert|update|edit|delete|remove|post|upload)\b/i.test(lower)) {
    return null;
  }

  // ── YouTube ────────────────────────────────────────────────────────────
  if (has('youtube', 'yt', 'playlist', 'video') && has('playlist', 'playlists')) {
    return { slug: ACTION_SLUGS.youtubeListPlaylists, args: { max_results: 50 }, label: 'your YouTube playlists', app: 'youtube' };
  }

  // ── Gmail ──────────────────────────────────────────────────────────────
  if (has('gmail', 'email', 'mail', 'inbox', 'message', 'thread')) {
    return { slug: ACTION_SLUGS.gmailListThreads, args: { max_results: 10 }, label: 'your latest Gmail messages', app: 'gmail' };
  }

  // ── GitHub ─────────────────────────────────────────────────────────────
  if (has('github', 'repo', 'repository', 'repos')) {
    return { slug: ACTION_SLUGS.githubListRepos, args: { per_page: 50 }, label: 'your GitHub repositories', app: 'github' };
  }

  // ── Google Calendar ────────────────────────────────────────────────────
  if (has('calendar', 'event', 'meeting', 'schedule', 'appointment')) {
    return { slug: ACTION_SLUGS.calendarListEvents, args: { max_results: 20 }, label: 'your calendar events', app: 'googlecalendar' };
  }

  return null;
}

/**
 * Resolve which connected account(s) to use for an app.
 *
 * Composio refuses to execute a tool when an app has multiple connected
 * accounts and no `connected_account_id` is supplied ("multiple ... accounts
 * connected"). When the user names a specific account (email or id substring)
 * only that account is used; otherwise ALL matching accounts are returned so
 * "total repos we have" covers every account in one MULTI_EXECUTE call.
 */
export function resolveComposioAccounts(text: string, accounts: any[], app: string): string[] {
  const lower = String(text || '').toLowerCase();
  const matching = (Array.isArray(accounts) ? accounts : []).filter(
    (a: any) => String(a?.app_name || a?.appName || a?.app || a?.name || '').toLowerCase() === String(app).toLowerCase()
  );
  if (matching.length === 0) return [];

  const mentioned = matching.filter((a: any) => {
    const id = String(a?.id || a?.connected_account_id || '');
    const email = String(a?.email || a?.user_id || a?.account_identifier || '');
    if ((id && lower.includes(id.toLowerCase())) || (email && lower.includes(email.toLowerCase()))) return true;
    // Match on meaningful tokens of the account id/email (e.g. "breva" in
    // "github_breva-inwith" or "rangey" in "rangey@example.com").
    const tokens = `${id} ${email}`.toLowerCase().split(/[^a-z0-9]+/).filter((t: string) => t.length >= 4);
    return tokens.some((t: string) => lower.includes(t));
  });
  if (mentioned.length > 0) {
    return mentioned.map((a: any) => String(a?.id || a?.connected_account_id || '')).filter(Boolean);
  }
  return matching.map((a: any) => String(a?.id || a?.connected_account_id || '')).filter(Boolean);
}

/** Human-friendly names for required fields when asking the user. */
export const COMPOSIO_FIELD_NAMES: Record<string, string> = {
  title: 'a title',
  summary: 'a title',
  subject: 'a subject',
  to: 'the recipient email',
  body: 'the message body',
};

/** Return the required fields that are still missing from the action args. */
export function missingRequiredFields(detected: DetectedComposioAction): string[] {
  return (detected.requiredFields || []).filter((f) => !detected.args[f] || !String(detected.args[f]).trim());
}

/**
 * Extract a field value from natural language. Handles "call it X",
 * "called X", "title is X", "send to a@b.com", "body: ...", etc.
 */
export function extractFieldFromText(text: string, field: string): string | null {
  const source = String(text || '').trim();
  if (!source) return null;
  const grab = (re: RegExp): string | null => {
    const m = source.match(re);
    return m && m[1] ? m[1].trim() : null;
  };
  switch (field) {
    case 'title':
    case 'summary':
    case 'subject':
      return (
        grab(/(?:call|name|title|named|called|titled|subject)\s+(?:it|the playlist|the repo|the issue|the event|the email|the video)?\s*(?:as\s+)?["'`]?([^"'`\n]{2,120})["'`]?/i) ||
        grab(/(?:title|name|subject|summary)\s*(?:is|:)\s*["'`]?([^"'`\n]{2,120})["'`]?/i)
      );
    case 'to':
      return grab(/(?:to|send to|email)\s*[: ]\s*([^\s,;]+@[^\s,;]+)/i) || grab(/\b([a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i);
    case 'body':
      return grab(/(?:body|message|content)\s*(?:is|:)?\s*["'`]?([^"'`\n]{2,500})["'`]?/i);
    default:
      return null;
  }
}

/**
 * Detect follow-up verification requests like "check closely", "check again",
 * "verify", "look carefully". These should re-run the last executed action
 * deterministically instead of falling into the flaky model agent loop.
 */
export function isFollowUpCheck(text: string): boolean {
  const lower = String(text || '').toLowerCase();
  return (
    /\b(check|verify|confirm|recheck|double[- ]check|look|see|review|inspect)\b.*\b(closely|again|carefully|properly|once more|now)\b/i.test(lower) ||
    /\b(check|verify|confirm)\b.*\b(again|now|please|that|it|this|them)\b/i.test(lower) ||
    /\b(are you sure|is that right|is this right|really|seriously|double check)\b/i.test(lower)
  );
}

/**
 * Unwrap the Composio MCP response envelope and return the inner data object.
 * Handles: MCP content blocks, { data: {...} } envelopes, and raw JSON.
 */
export function unwrapComposioPayload(raw: any): any {
  if (raw == null) return raw;

  // MCP content blocks: [{ type: 'text', text: '...' }]
  if (Array.isArray(raw) && raw.length > 0 && raw.every((b) => b && typeof b === 'object' && typeof b.text === 'string')) {
    const text = raw.map((b) => b.text).join('\n').trim();
    if (text.startsWith('{') || text.startsWith('[')) {
      try {
        raw = JSON.parse(text);
      } catch {
        return raw;
      }
    }
  }

  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        raw = JSON.parse(trimmed);
      } catch {
        return raw;
      }
    }
  }

  // { data: {...}, error, log_id, successful } envelope
  if (raw && typeof raw === 'object' && !Array.isArray(raw) && raw.data && typeof raw.data === 'object' && !Array.isArray(raw.data)) {
    const inner = raw.data;
    if (inner.results !== undefined || inner.items !== undefined || inner.data !== undefined || inner.output !== undefined || inner.response !== undefined || inner.message !== undefined) {
      raw = inner;
    }
  }

  return raw;
}

/**
 * Extract the first array of result items from a Composio action payload.
 *
 * MULTI_EXECUTE wraps each action result as
 *   { results: [ { response: { data: { items: [...] } } } ] }
 * so nested items must be flattened before formatting.
 */
export function extractResultItems(payload: any): any[] {
  if (payload == null) return [];
  if (Array.isArray(payload)) return payload;

  const candidates = [
    payload.results,
    payload.items,
    payload.data,
    payload.output,
    payload.response,
    payload.playlists,
    payload.messages,
    payload.threads,
    payload.repositories,
    payload.events,
    payload.connections,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      // Flatten MULTI_EXECUTE wrapper entries: { response: { data: { items } } }
      const nested = candidate
        .map((entry: any) => {
          if (entry && typeof entry === 'object') {
            const inner = entry.response || entry.data || entry.result || entry.output;
            if (inner && typeof inner === 'object') {
              const innerData = inner.data || inner;
              if (Array.isArray(innerData.items)) return innerData.items;
              if (Array.isArray(innerData.results)) return innerData.results;
              if (Array.isArray(innerData)) return innerData;
            }
            if (Array.isArray(entry.items)) return entry.items;
          }
          return null;
        })
        .filter(Boolean)
        .flat();
      if (nested.length > 0) return nested;
      return candidate;
    }
    if (candidate && typeof candidate === 'object') {
      // results may be keyed by toolkit: { youtube: { ... } } or { data: [...] }
      if (Array.isArray(candidate.data)) return candidate.data;
      if (Array.isArray(candidate.items)) return candidate.items;
      if (Array.isArray(candidate.results)) return candidate.results;
      const firstArray = Object.values(candidate).find((v) => Array.isArray(v));
      if (firstArray) return firstArray as any[];
    }
  }

  return [];
}

function cleanText(value: any): string {
  if (value == null) return '';
  return String(value).replace(/\s+/g, ' ').trim();
}

/**
 * Format a raw Composio action result into a clean user-facing answer.
 */
export function formatComposioActionResult(detected: DetectedComposioAction, rawResult: string): string {
  const payload = unwrapComposioPayload(rawResult);

  // Surface upstream errors honestly instead of pretending success.
  const errorText = String(payload?.error || payload?.message || '').trim();
  if (errorText && !Array.isArray(payload)) {
    return `I tried to fetch ${detected.label} but Composio returned an error: ${errorText}\n\nReconnect the app in **Connectors** and try again.`;
  }

  // Multi-account execution: MULTI_EXECUTE returns one result entry per tool,
  // in the same order as the requested accounts.
  if (detected.accountIds && detected.accountIds.length > 1) {
    const perAccount = extractPerResultItems(payload, detected.accountIds);
    const sections: string[] = [];
    let total = 0;
    for (const { accountId, items } of perAccount) {
      total += items.length;
      const lines = formatItemsForApp(detected.app, items);
      const label = accountId || 'account';
      sections.push(lines.length === 0 ? `**${label}** — no results` : `**${label}** (${items.length}):\n${lines.join('\n')}`);
    }
    if (sections.length === 0) {
      return `I checked ${detected.label} but found nothing to show.`;
    }
    return `Here are ${detected.label} across your connected accounts (${total} total):\n\n` + sections.join('\n\n');
  }

  const items = extractResultItems(payload);

  if (items.length === 0) {
    const summary = String(payload?.summary || payload?.message || '').trim();
    return summary
      ? `I checked ${detected.label}. ${summary}`
      : `I checked ${detected.label} but found nothing to show.`;
  }

  const lines = formatItemsForApp(detected.app, items);

  if (lines.length === 0) {
    return `I checked ${detected.label} and got a response, but couldn't parse the items. Raw result:\n\n\`\`\`json\n${String(rawResult).slice(0, 2000)}\n\`\`\``;
  }

  const header =
    detected.app === 'youtube' ? `You have **${items.length} playlist${items.length === 1 ? '' : 's'}** on YouTube:\n\n` :
    detected.app === 'gmail' ? `Here are ${detected.label}:\n\n` :
    detected.app === 'github' ? `Here are ${detected.label}:\n\n` :
    detected.app === 'googlecalendar' ? `Here are ${detected.label}:\n\n` :
    `Here is ${detected.label}:\n\n`;

  return header + lines.join('\n');
}

/**
 * Extract per-account result items from a MULTI_EXECUTE payload.
 * Returns entries in the same order as the requested account ids.
 */
export function extractPerResultItems(payload: any, accountIds: string[]): { accountId: string; items: any[] }[] {
  if (payload == null) return [];
  const results = Array.isArray(payload.results)
    ? payload.results
    : Array.isArray(payload?.data?.results)
      ? payload.data.results
      : [];
  if (results.length === 0) return [];
  return results.map((entry: any, idx: number) => ({
    accountId: accountIds[idx] || '',
    items: extractItemsFromResultEntry(entry),
  }));
}

function extractItemsFromResultEntry(entry: any): any[] {
  if (entry == null) return [];
  if (Array.isArray(entry)) return entry;
  const inner = entry.response || entry.data || entry.result || entry.output || entry;
  if (inner && typeof inner === 'object') {
    const innerData = inner.data || inner;
    if (Array.isArray(innerData.items)) return innerData.items;
    if (Array.isArray(innerData.results)) return innerData.results;
    if (Array.isArray(innerData)) return innerData;
    if (Array.isArray(inner.items)) return inner.items;
    if (Array.isArray(inner.results)) return inner.results;
  }
  return [];
}

function formatItemsForApp(app: string, items: any[]): string[] {
  const lines: string[] = [];
  for (const item of items.slice(0, 12)) {
    if (app === 'youtube') {
      const title = cleanText(item.title || item.name || item.snippet?.title || item.snippet?.channelTitle);
      const id = cleanText(item.id || item.playlistId || item.videoId);
      const count = item.itemCount != null ? ` (${item.itemCount} videos)` : '';
      if (title) lines.push(`- **${title}**${count}${id ? ` — \`${id}\`` : ''}`);
    } else if (app === 'gmail') {
      const subject = cleanText(item.subject || item.snippet || item.title || item.message?.subject);
      const from = cleanText(item.from || item.sender || item.fromEmail || item.message?.from);
      const date = cleanText(item.date || item.internalDate || item.message?.date);
      if (subject) lines.push(`- **${subject}**${from ? ` — from ${from}` : ''}${date ? ` (${date})` : ''}`);
    } else if (app === 'github') {
      const name = cleanText(item.name || item.full_name || item.title);
      const url = cleanText(item.html_url || item.url);
      if (name) lines.push(`- **${name}**${url ? ` — ${url}` : ''}`);
    } else if (app === 'googlecalendar') {
      const summary = cleanText(item.summary || item.title || item.name);
      const start = cleanText(item.start?.dateTime || item.start?.date || item.start);
      const end = cleanText(item.end?.dateTime || item.end?.date || item.end);
      if (summary) lines.push(`- **${summary}**${start ? ` — ${start}` : ''}${end ? ` to ${end}` : ''}`);
    } else {
      const name = cleanText(item.name || item.title || item.id || item.summary);
      if (name) lines.push(`- ${name}`);
    }
  }
  return lines;
}