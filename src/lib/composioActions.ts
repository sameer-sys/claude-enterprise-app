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

  // ── YouTube ────────────────────────────────────────────────────────────
  if (has('youtube', 'yt', 'playlist', 'video') && has('playlist', 'playlists')) {
    if (has('create', 'make', 'new')) {
      return { slug: ACTION_SLUGS.youtubeCreatePlaylist, args: {}, label: 'create a YouTube playlist', app: 'youtube' };
    }
    if (has('add', 'insert', 'put') && has('video', 'song', 'music')) {
      return { slug: ACTION_SLUGS.youtubeInsertPlaylistItem, args: {}, label: 'add a video to a YouTube playlist', app: 'youtube' };
    }
    return { slug: ACTION_SLUGS.youtubeListPlaylists, args: {}, label: 'your YouTube playlists', app: 'youtube' };
  }

  // ── Gmail ──────────────────────────────────────────────────────────────
  if (has('gmail', 'email', 'mail', 'inbox', 'message', 'thread')) {
    if (has('send', 'compose', 'reply')) {
      return { slug: ACTION_SLUGS.gmailSendEmail, args: {}, label: 'send an email', app: 'gmail' };
    }
    return { slug: ACTION_SLUGS.gmailListThreads, args: { max_results: 5 }, label: 'your latest Gmail messages', app: 'gmail' };
  }

  // ── GitHub ─────────────────────────────────────────────────────────────
  if (has('github', 'repo', 'repository', 'repos')) {
    if (has('create', 'open', 'new') && has('issue')) {
      return { slug: ACTION_SLUGS.githubCreateIssue, args: {}, label: 'create a GitHub issue', app: 'github' };
    }
    return { slug: ACTION_SLUGS.githubListRepos, args: {}, label: 'your GitHub repositories', app: 'github' };
  }

  // ── Google Calendar ────────────────────────────────────────────────────
  if (has('calendar', 'event', 'meeting', 'schedule', 'appointment')) {
    if (has('create', 'add', 'schedule')) {
      return { slug: ACTION_SLUGS.calendarCreateEvent, args: {}, label: 'create a calendar event', app: 'googlecalendar' };
    }
    return { slug: ACTION_SLUGS.calendarListEvents, args: {}, label: 'your calendar events', app: 'googlecalendar' };
  }

  return null;
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
    if (Array.isArray(candidate)) return candidate;
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

  const items = extractResultItems(payload);

  if (items.length === 0) {
    const summary = String(payload?.summary || payload?.message || '').trim();
    return summary
      ? `I checked ${detected.label}. ${summary}`
      : `I checked ${detected.label} but found nothing to show.`;
  }

  const lines: string[] = [];

  for (const item of items.slice(0, 12)) {
    if (detected.app === 'youtube') {
      const title = cleanText(item.title || item.name || item.snippet?.title || item.snippet?.channelTitle);
      const id = cleanText(item.id || item.playlistId || item.videoId);
      const count = item.itemCount != null ? ` (${item.itemCount} videos)` : '';
      if (title) lines.push(`- **${title}**${count}${id ? ` — \`${id}\`` : ''}`);
    } else if (detected.app === 'gmail') {
      const subject = cleanText(item.subject || item.snippet || item.title || item.message?.subject);
      const from = cleanText(item.from || item.sender || item.fromEmail || item.message?.from);
      const date = cleanText(item.date || item.internalDate || item.message?.date);
      if (subject) lines.push(`- **${subject}**${from ? ` — from ${from}` : ''}${date ? ` (${date})` : ''}`);
    } else if (detected.app === 'github') {
      const name = cleanText(item.name || item.full_name || item.title);
      const url = cleanText(item.html_url || item.url);
      if (name) lines.push(`- **${name}**${url ? ` — ${url}` : ''}`);
    } else if (detected.app === 'googlecalendar') {
      const summary = cleanText(item.summary || item.title || item.name);
      const start = cleanText(item.start?.dateTime || item.start?.date || item.start);
      const end = cleanText(item.end?.dateTime || item.end?.date || item.end);
      if (summary) lines.push(`- **${summary}**${start ? ` — ${start}` : ''}${end ? ` to ${end}` : ''}`);
    } else {
      const name = cleanText(item.name || item.title || item.id || item.summary);
      if (name) lines.push(`- ${name}`);
    }
  }

  if (lines.length === 0) {
    return `I checked ${detected.label} and got a response, but couldn't parse the items. Raw result:\n\n\`\`\`json\n${String(rawResult).slice(0, 2000)}\n\`\`\``;
  }

  const header =
    detected.app === 'youtube' ? `Here are ${detected.label}:\n\n` :
    detected.app === 'gmail' ? `Here are ${detected.label}:\n\n` :
    detected.app === 'github' ? `Here are ${detected.label}:\n\n` :
    detected.app === 'googlecalendar' ? `Here are ${detected.label}:\n\n` :
    `Here is ${detected.label}:\n\n`;

  return header + lines.join('\n');
}