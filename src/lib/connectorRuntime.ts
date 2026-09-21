import {
  getConnectionFromCookieHeader,
  getValidConnection,
} from '@/lib/connectorAuth';

export interface DirectToolDefinition {
  tool_slug: string;
  toolkit: string;
  name: string;
  description: string;
  input_schema: Record<string, any>;
}

export interface DirectExecutionResult {
  success: boolean;
  tool_slug?: string;
  data?: any;
  error?: string;
}

const DIRECT_TOOL_DEFINITIONS: DirectToolDefinition[] = [
  {
    tool_slug: 'GMAIL_LIST_MESSAGES',
    toolkit: 'gmail',
    name: 'List recent Gmail messages',
    description: 'Read the authenticated Gmail inbox and return recent message metadata.',
    input_schema: {
      type: 'object',
      properties: { maxResults: { type: 'number', minimum: 1, maximum: 20 } },
    },
  },
  {
    tool_slug: 'GMAIL_SEND_EMAIL',
    toolkit: 'gmail',
    name: 'Send Gmail message',
    description: 'Send an email through the authenticated Gmail account.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        subject: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    tool_slug: 'DRIVE_LIST_FILES',
    toolkit: 'google_drive',
    name: 'List Google Drive files',
    description: 'List recent or matching files from the authenticated Google Drive.',
    input_schema: {
      type: 'object',
      properties: {
        query: { type: 'string' },
        pageSize: { type: 'number', minimum: 1, maximum: 20 },
      },
    },
  },
  {
    tool_slug: 'CALENDAR_LIST_EVENTS',
    toolkit: 'google_calendar',
    name: 'List Google Calendar events',
    description: 'Read upcoming events from the authenticated primary Google Calendar.',
    input_schema: {
      type: 'object',
      properties: { maxResults: { type: 'number', minimum: 1, maximum: 20 } },
    },
  },
  {
    tool_slug: 'YOUTUBE_LIST_PLAYLISTS',
    toolkit: 'youtube',
    name: 'List YouTube playlists',
    description: 'Read playlists belonging to the authenticated YouTube channel.',
    input_schema: {
      type: 'object',
      properties: { maxResults: { type: 'number', minimum: 1, maximum: 25 } },
    },
  },
  {
    tool_slug: 'GITHUB_LIST_REPOSITORIES',
    toolkit: 'github',
    name: 'List GitHub repositories',
    description: 'List repositories available to the authenticated GitHub account.',
    input_schema: {
      type: 'object',
      properties: { perPage: { type: 'number', minimum: 1, maximum: 30 } },
    },
  },
  {
    tool_slug: 'GITHUB_LIST_ISSUES',
    toolkit: 'github',
    name: 'List GitHub issues',
    description: 'List open issues for a repository accessible by the authenticated GitHub account.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'owner/repo' },
        perPage: { type: 'number', minimum: 1, maximum: 30 },
      },
      required: ['repo'],
    },
  },
  {
    tool_slug: 'GITHUB_CREATE_ISSUE',
    toolkit: 'github',
    name: 'Create GitHub issue',
    description: 'Create an issue in a repository accessible by the authenticated GitHub account.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'owner/repo' },
        title: { type: 'string' },
        body: { type: 'string' },
      },
      required: ['repo', 'title'],
    },
  },
];

function base64Url(input: string): string {
  return Buffer.from(input, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function cleanRepo(value: string): string {
  return String(value || '')
    .trim()
    .replace(/^https?:\/\/github\.com\//i, '')
    .replace(/\/$/, '');
}

function extractEmail(text: string): string {
  const match = String(text || '').match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : '';
}

function extractAfter(text: string, pattern: RegExp): string {
  const match = String(text || '').match(pattern);
  return match && match[1] ? match[1].trim() : '';
}

function gmailRawMessage(to: string, subject: string, body: string): string {
  const safeSubject = subject.replace(/[\r\n]+/g, ' ').trim();
  const safeTo = to.replace(/[\r\n]+/g, ' ').trim();
  const message =
    'To: ' + safeTo + '\r\n' +
    'Subject: ' + safeSubject + '\r\n' +
    'MIME-Version: 1.0\r\n' +
    'Content-Type: text/plain; charset="UTF-8"\r\n' +
    'Content-Transfer-Encoding: 8bit\r\n\r\n' +
    String(body || '').replace(/\r?\n/g, '\r\n');
  return base64Url(message);
}

async function providerFetch(
  connectorId: string,
  cookieHeader: string,
  url: string,
  init: RequestInit = {}
): Promise<{ response: Response; refreshed: boolean }> {
  const current = getConnectionFromCookieHeader(cookieHeader, connectorId);
  if (!current || !current.accessToken) {
    throw new Error(
      'The ' + connectorId + ' account is not connected. Connect it from the Connectors panel first.'
    );
  }

  const valid = await getValidConnection(connectorId, cookieHeader);
  const token = valid.connection && valid.connection.accessToken
    ? valid.connection.accessToken
    : current.accessToken;

  const headers = new Headers(init.headers || {});
  headers.set('Authorization', 'Bearer ' + token);
  headers.set('Accept', 'application/json');

  let response = await fetch(url, {
    ...init,
    headers,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });

  if (
    response.status === 401 &&
    valid.connection &&
    valid.connection.accessToken &&
    valid.connection.accessToken !== current.accessToken
  ) {
    headers.set('Authorization', 'Bearer ' + valid.connection.accessToken);
    response = await fetch(url, {
      ...init,
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
  }

  return { response, refreshed: valid.refreshed };
}

export function searchDirectConnectorTools(connectors: any[], query: string): DirectToolDefinition[] {
  const q = String(query || '').toLowerCase();
  const enabled = new Set(
    (Array.isArray(connectors) ? connectors : [])
      .filter((c: any) => c && c.enabled)
      .map((c: any) => String(c.id || ''))
  );

  return DIRECT_TOOL_DEFINITIONS.filter((tool) => {
    const supported =
      (tool.toolkit === 'gmail' && enabled.has('conn-gmail')) ||
      (tool.toolkit === 'google_drive' && enabled.has('conn-gdrive')) ||
      (tool.toolkit === 'google_calendar' && enabled.has('conn-gcalendar')) ||
      (tool.toolkit === 'youtube' && enabled.has('conn-youtube')) ||
      (tool.toolkit === 'github' && enabled.has('conn-github'));

    if (!supported) return false;
    if (!q) return true;

    const haystack = (tool.name + ' ' + tool.description + ' ' + tool.tool_slug).toLowerCase();
    return haystack.includes(q);
  });
}

function ok(tool_slug: string, data: any): DirectExecutionResult {
  return { success: true, tool_slug, data };
}

function fail(tool_slug: string, error: string): DirectExecutionResult {
  return { success: false, tool_slug, error };
}

export async function executeDirectConnectorTool(
  cookieHeader: string,
  toolSlug: string,
  args: Record<string, any> = {}
): Promise<DirectExecutionResult> {
  const slug = String(toolSlug || '').trim().toUpperCase();

  try {
    if (slug === 'GMAIL_LIST_MESSAGES') {
      const maxResults = Math.min(Math.max(Number(args.maxResults) || 5, 1), 20);
      const listResult = await providerFetch(
        'conn-gmail',
        cookieHeader,
        'https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=' + maxResults
      );
      const data = await listResult.response.json().catch(() => ({}));
      if (!listResult.response.ok) {
        return fail(slug, String(data && data.error && data.error.message
          ? data.error.message
          : 'Gmail API returned HTTP ' + listResult.response.status + '.'));
      }

      const messages = Array.isArray(data && data.messages) ? data.messages : [];
      const details: any[] = [];

      for (const item of messages.slice(0, maxResults)) {
        const detail = await providerFetch(
          'conn-gmail',
          cookieHeader,
          'https://gmail.googleapis.com/gmail/v1/users/me/messages/' +
            encodeURIComponent(String(item.id)) +
            '?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date'
        );
        if (!detail.response.ok) continue;

        const message = await detail.response.json().catch(() => ({}));
        const headers = Array.isArray(message && message.payload && message.payload.headers)
          ? message.payload.headers
          : [];
        const getHeader = (name: string) => {
          const header = headers.find((h: any) =>
            String(h && h.name || '').toLowerCase() === name.toLowerCase()
          );
          return header && header.value ? header.value : '';
        };

        details.push({
          id: message.id,
          threadId: message.threadId,
          from: getHeader('From'),
          subject: getHeader('Subject'),
          date: getHeader('Date'),
          snippet: message.snippet || '',
        });
      }

      return ok(slug, {
        messages: details,
        resultSizeEstimate: data && data.resultSizeEstimate ? data.resultSizeEstimate : details.length,
      });
    }

    if (slug === 'GMAIL_SEND_EMAIL') {
      const to = extractEmail(String(args.to || ''));
      const subject = String(args.subject || 'Message from Sameer AI Workspace').trim();
      const body = String(args.body || '').trim();

      if (!to) return fail(slug, 'A real recipient email address is required.');
      if (!body) return fail(slug, 'A non-empty email body is required.');

      const result = await providerFetch(
        'conn-gmail',
        cookieHeader,
        'https://gmail.googleapis.com/gmail/v1/users/me/messages/send',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ raw: gmailRawMessage(to, subject, body) }),
        }
      );
      const data = await result.response.json().catch(() => ({}));

      if (!result.response.ok) {
        return fail(slug, String(data && data.error && data.error.message
          ? data.error.message
          : 'Gmail send returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, {
        messageId: data && data.id,
        threadId: data && data.threadId,
        to: to,
        subject: subject,
      });
    }

    if (slug === 'DRIVE_LIST_FILES') {
      const pageSize = Math.min(Math.max(Number(args.pageSize) || 10, 1), 20);
      const query = String(args.query || '').trim();
      const params = new URLSearchParams({
        pageSize: String(pageSize),
        fields: 'files(id,name,mimeType,modifiedTime,webViewLink,size),nextPageToken',
        orderBy: 'modifiedTime desc',
      });

      if (query) {
        const escapedQuery = query.replace(/'/g, "\\'");
        params.set('q', "name contains '" + escapedQuery + "' and trashed = false");
      } else {
        params.set('q', 'trashed = false');
      }

      const result = await providerFetch(
        'conn-gdrive',
        cookieHeader,
        'https://www.googleapis.com/drive/v3/files?' + params.toString()
      );
      const data = await result.response.json().catch(() => ({}));

      if (!result.response.ok) {
        return fail(slug, String(data && data.error && data.error.message
          ? data.error.message
          : 'Drive API returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, {
        files: Array.isArray(data && data.files) ? data.files : [],
      });
    }

    if (slug === 'CALENDAR_LIST_EVENTS') {
      const maxResults = Math.min(Math.max(Number(args.maxResults) || 10, 1), 20);
      const params = new URLSearchParams({
        maxResults: String(maxResults),
        singleEvents: 'true',
        orderBy: 'startTime',
        timeMin: new Date().toISOString(),
      });

      const result = await providerFetch(
        'conn-gcalendar',
        cookieHeader,
        'https://www.googleapis.com/calendar/v3/calendars/primary/events?' + params.toString()
      );
      const data = await result.response.json().catch(() => ({}));

      if (!result.response.ok) {
        return fail(slug, String(data && data.error && data.error.message
          ? data.error.message
          : 'Calendar API returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, {
        events: Array.isArray(data && data.items) ? data.items : [],
      });
    }

    if (slug === 'YOUTUBE_LIST_PLAYLISTS') {
      const maxResults = Math.min(Math.max(Number(args.maxResults) || 10, 1), 25);
      const params = new URLSearchParams({
        part: 'snippet,contentDetails,status',
        mine: 'true',
        maxResults: String(maxResults),
      });

      const result = await providerFetch(
        'conn-youtube',
        cookieHeader,
        'https://www.googleapis.com/youtube/v3/playlists?' + params.toString()
      );
      const data = await result.response.json().catch(() => ({}));

      if (!result.response.ok) {
        return fail(slug, String(data && data.error && data.error.message
          ? data.error.message
          : 'YouTube API returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, {
        playlists: (Array.isArray(data && data.items) ? data.items : []).map((item: any) => ({
          id: item.id,
          title: item.snippet && item.snippet.title,
          description: item.snippet && item.snippet.description,
          privacyStatus: item.status && item.status.privacyStatus,
          itemCount: item.contentDetails && item.contentDetails.itemCount,
          url: item.id ? 'https://www.youtube.com/playlist?list=' + item.id : undefined,
        })),
      });
    }

    if (slug === 'GITHUB_LIST_REPOSITORIES') {
      const perPage = Math.min(Math.max(Number(args.perPage) || 10, 1), 30);
      const result = await providerFetch(
        'conn-github',
        cookieHeader,
        'https://api.github.com/user/repos?per_page=' + perPage + '&sort=updated&direction=desc'
      );
      const data = await result.response.json().catch(() => []);

      if (!result.response.ok) {
        return fail(slug, String(data && data.message
          ? data.message
          : 'GitHub API returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, {
        repositories: Array.isArray(data)
          ? data.map((repo: any) => ({
              fullName: repo.full_name,
              private: repo.private,
              defaultBranch: repo.default_branch,
              description: repo.description,
              updatedAt: repo.updated_at,
              url: repo.html_url,
            }))
          : [],
      });
    }

    if (slug === 'GITHUB_LIST_ISSUES') {
      const repo = cleanRepo(args.repo);
      if (!repo || !repo.includes('/')) return fail(slug, 'repo must be in owner/repo format.');

      const perPage = Math.min(Math.max(Number(args.perPage) || 10, 1), 30);
      const result = await providerFetch(
        'conn-github',
        cookieHeader,
        'https://api.github.com/repos/' + repo + '/issues?state=open&per_page=' + perPage
      );
      const data = await result.response.json().catch(() => []);

      if (!result.response.ok) {
        return fail(slug, String(data && data.message
          ? data.message
          : 'GitHub API returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, { issues: Array.isArray(data) ? data : [] });
    }

    if (slug === 'GITHUB_CREATE_ISSUE') {
      const repo = cleanRepo(args.repo);
      const title = String(args.title || '').trim();
      if (!repo || !repo.includes('/')) return fail(slug, 'repo must be in owner/repo format.');
      if (!title) return fail(slug, 'Issue title is required.');

      const body = String(args.body || '').trim();
      const result = await providerFetch(
        'conn-github',
        cookieHeader,
        'https://api.github.com/repos/' + repo + '/issues',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Sameer-AI-Workspace',
          },
          body: JSON.stringify({ title, body }),
        }
      );
      const data = await result.response.json().catch(() => ({}));

      if (!result.response.ok) {
        return fail(slug, String(data && data.message
          ? data.message
          : 'GitHub issue creation returned HTTP ' + result.response.status + '.'));
      }

      return ok(slug, {
        id: data && data.id,
        number: data && data.number,
        title: data && data.title,
        url: data && data.html_url,
        state: data && data.state,
      });
    }

    return fail(slug, 'Direct connector tool ' + slug + ' is not implemented.');
  } catch (error: any) {
    return fail(slug, error && error.message ? error.message : 'Direct connector execution failed.');
  }
}

export async function executeDirectConnectorRequest(
  cookieHeader: string,
  connectors: any[],
  text: string
): Promise<DirectExecutionResult & { handled: boolean }> {
  const lower = String(text || '').toLowerCase();
  const enabled = (Array.isArray(connectors) ? connectors : []).filter((c: any) => c && c.enabled);

  const directIds = new Set(
    enabled
      .filter((c: any) =>
        c.provider === 'direct' || c.config && c.config.connectionType === 'direct'
      )
      .map((c: any) => String(c.id || ''))
  );

  if (
    directIds.has('conn-gmail') &&
    (
      (/(send|mail|email|reply|draft)/i.test(lower) && /@/.test(text)) ||
      /(inbox|check.*mail|latest.*mail|read.*mail)/i.test(lower)
    )
  ) {
    const to = extractEmail(text);
    if (/(send|mail|email|reply)/i.test(lower) && to) {
      const subject =
        extractAfter(
          text,
          /subject(?:\s*[:=-]\s*|\s+is\s+)([^\n]+?)(?:\s+(?:body|saying|says|message)\s*[:=-]?|$)/i
        ) || 'Message from Sameer AI Workspace';

      const body =
        extractAfter(text, /(?:saying|says|message|body)\s*[:=-]?\s*([\s\S]+)$/i) ||
        text
          .replace(to, '')
          .replace(/^.*?(?:send|email|mail|reply)\s+(?:an?\s+)?(?:email|mail)?\s*/i, '')
          .trim();

      const sent = await executeDirectConnectorTool(cookieHeader, 'GMAIL_SEND_EMAIL', {
        to: to,
        subject: subject,
        body: body,
      });
      return { ...sent, handled: true };
    }

    const read = await executeDirectConnectorTool(cookieHeader, 'GMAIL_LIST_MESSAGES', { maxResults: 5 });
    return { ...read, handled: true };
  }

  if (
    directIds.has('conn-gdrive') &&
    (lower.includes('drive') || lower.includes('google doc') || lower.includes('google sheet') || lower.includes('google slide')) &&
    /(list|show|find|search|check|get|files?)/i.test(lower)
  ) {
    const query = extractAfter(text, /(?:find|search)\s+(?:for\s+)?["']?([^"']+)["']?/i);
    const result = await executeDirectConnectorTool(cookieHeader, 'DRIVE_LIST_FILES', { query: query });
    return { ...result, handled: true };
  }

  if (
    directIds.has('conn-gcalendar') &&
    (lower.includes('calendar') || lower.includes('upcoming event') || lower.includes('schedule')) &&
    /(list|show|check|upcoming|what|next)/i.test(lower)
  ) {
    const result = await executeDirectConnectorTool(cookieHeader, 'CALENDAR_LIST_EVENTS', { maxResults: 10 });
    return { ...result, handled: true };
  }

  if (
    directIds.has('conn-youtube') &&
    (lower.includes('youtube') || lower.includes('playlist')) &&
    /(playlist|list|show|check|my channel)/i.test(lower)
  ) {
    const result = await executeDirectConnectorTool(cookieHeader, 'YOUTUBE_LIST_PLAYLISTS', { maxResults: 20 });
    return { ...result, handled: true };
  }

  if (
    directIds.has('conn-github') &&
    lower.includes('github') &&
    /(my repositories|my repos|list repositories|list repos)/i.test(lower)
  ) {
    const result = await executeDirectConnectorTool(cookieHeader, 'GITHUB_LIST_REPOSITORIES', { perPage: 10 });
    return { ...result, handled: true };
  }

  if (
    directIds.has('conn-github') &&
    /(github|repo|issue)/i.test(lower) &&
    /create\s+(an?\s+)?issue/i.test(lower)
  ) {
    const repo = cleanRepo(
      extractAfter(text, /(?:in|for|repo(?:sitory)?)\s+([\w.-]+\/[\w.-]+)/i)
    );
    const title =
      extractAfter(text, /(?:title)\s*[:=-]?\s*(.+?)(?:\s+body\s*[:=-]|$)/i) ||
      text.replace(/.*?create\s+(?:an?\s+)?issue\s+(?:in\s+)?/i, '').slice(0, 100).trim();
    const body = extractAfter(text, /body\s*[:=-]?\s*([\s\S]+)$/i);

    const result = await executeDirectConnectorTool(cookieHeader, 'GITHUB_CREATE_ISSUE', {
      repo: repo,
      title: title,
      body: body,
    });
    return { ...result, handled: true };
  }

  return { handled: false, success: false };
}

export function hasDirectOAuthForConnector(connectorId: string): boolean {
  return new Set([
    'conn-gmail',
    'conn-gdrive',
    'conn-gcalendar',
    'conn-youtube',
    'conn-github',
    'conn-slack',
    'conn-notion',
    'conn-m365',
  ]).has(String(connectorId || ''));
}
