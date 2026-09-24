import {
  listConnectedAccounts,
  executeComposioAction,
  executeComposioNaturalLanguage,
  ComposioConnectedAccount,
} from './composio';

/**
 * STEP 1: Detect if user's prompt is asking for a connected service action
 */
export function isConnectorRelatedRequest(text: string): boolean {
  const lower = String(text || '').toLowerCase().trim();
  if (!lower) return false;

  // Specific high-intent questions
  if (
    /\b(playlist|playlists|youtube|channel)\b/i.test(lower) ||
    /\b(repo|repos|repository|repositories|github|commit|commits|pull request|issue)\b/i.test(lower) ||
    /\b(email|emails|gmail|inbox|unread|mail|threads)\b/i.test(lower) ||
    /\b(google drive|gdrive|drive file|drive files|google calendar|gcalendar|calendar event)\b/i.test(lower) ||
    /\b(slack message|slack channel|slack|notion page|notion database|notion)\b/i.test(lower)
  ) {
    return true;
  }

  const appTerms = [
    'youtube', 'github', 'git', 'gmail', 'google drive', 'drive',
    'google calendar', 'calendar', 'slack', 'notion', 'linear',
    'asana', 'canva', 'hubspot', 'salesforce', 'shopify', 'reddit',
    'discord', 'telegram', 'whatsapp', 'microsoft365', 'outlook',
  ];

  const actionTerms = [
    'list', 'show', 'get', 'find', 'search', 'read', 'check',
    'fetch', 'view', 'display', 'see', 'create', 'send', 'write',
    'update', 'delete', 'make', 'post', 'status', 'what', 'how many',
  ];

  const mentionsApp = appTerms.some((term) => lower.includes(term));
  const mentionsAction = actionTerms.some((term) => lower.includes(term));

  return mentionsApp && mentionsAction;
}

/**
 * STEP 2: Check Composio Setup & Discover All Connected Accounts
 */
export async function checkConnectorSetup(composioUserId?: string) {
  const composioApiKey = process.env.COMPOSIO_API_KEY || '';

  if (!composioApiKey) {
    return {
      success: false,
      error: 'Composio is not configured. Set COMPOSIO_API_KEY in environment variables.',
      apiKey: '',
      userId: composioUserId || 'sameer-web-user',
      accounts: [] as ComposioConnectedAccount[],
    };
  }

  // Load all accounts without user restriction so YouTube (ca_qz1qCgWwTdqd),
  // GitHub (ca_-xcAyBbqzGo_), and Gmail (ca_TvDJe0QjWKmk) are ALL discovered.
  const liveAccounts = await listConnectedAccounts(composioApiKey);

  return {
    success: true,
    apiKey: composioApiKey,
    userId: composioUserId || 'sameer-web-user',
    accounts: liveAccounts,
  };
}

/**
 * STEP 3: Execute the Connector Request directly with Composio
 */
export async function executeConnectorRequest(
  userPrompt: string,
  composioApiKey: string,
  composioUserId: string,
  connectedAccounts: ComposioConnectedAccount[]
): Promise<{ success: boolean; data?: any; error?: string; connectUrl?: string; app?: string }> {
  const lower = String(userPrompt || '').toLowerCase();

  // Find account helpers
  const findAccount = (app: string) => {
    return (
      connectedAccounts.find(
        (a) =>
          String(a.status || '').toUpperCase() === 'ACTIVE' &&
          String(a.appUniqueId || a.appName || '').toLowerCase().includes(app)
      ) ||
      connectedAccounts.find((a) =>
        String(a.appUniqueId || a.appName || '').toLowerCase().includes(app)
      )
    );
  };

  // 1. YouTube
  if (lower.includes('youtube') || lower.includes('playlist') || lower.includes('channel')) {
    const ytAccount = findAccount('youtube') || { id: 'ca_qz1qCgWwTdqd' };
    if (!ytAccount?.id) {
      return { success: false, error: 'YouTube account is not connected yet.' };
    }

    if (lower.includes('channel') && !lower.includes('playlist')) {
      const res = await executeComposioAction(
        composioApiKey,
        'YOUTUBE_LIST_CHANNELS',
        { mine: true, part: 'snippet,contentDetails,statistics' },
        ytAccount.id,
        composioUserId
      );
      return { ...res, app: 'youtube' };
    }

    // Default YouTube action: list playlists
    const res = await executeComposioAction(
      composioApiKey,
      'YOUTUBE_LIST_USER_PLAYLISTS',
      { mine: true, maxResults: 25 },
      ytAccount.id,
      composioUserId
    );
    return { ...res, app: 'youtube' };
  }

  // 2. GitHub
  if (lower.includes('github') || lower.includes('repo') || lower.includes('git')) {
    const ghAccount = findAccount('github') || { id: 'ca_-xcAyBbqzGo_' };
    if (!ghAccount?.id) {
      return { success: false, error: 'GitHub account is not connected yet.' };
    }

    if (lower.includes('repo') || lower.includes('list') || lower.includes('show') || lower.includes('my')) {
      const res = await executeComposioAction(
        composioApiKey,
        'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER',
        { per_page: 30 },
        ghAccount.id,
        composioUserId
      );
      return { ...res, app: 'github' };
    }
  }

  // 3. Gmail
  if (lower.includes('gmail') || lower.includes('email') || lower.includes('inbox') || lower.includes('mail')) {
    const gmAccount = findAccount('gmail') || { id: 'ca_TvDJe0QjWKmk' };
    if (!gmAccount?.id) {
      return { success: false, error: 'Gmail account is not connected yet.' };
    }

    if (lower.includes('send') && lower.includes('to')) {
      // Natural language router or direct action
      return await executeComposioNaturalLanguage(
        composioApiKey,
        composioUserId,
        userPrompt,
        [{ id: 'conn-composio', enabled: true }],
        connectedAccounts
      );
    }

    // Default Gmail: list recent threads / messages
    const res = await executeComposioAction(
      composioApiKey,
      'GMAIL_LIST_THREADS',
      { maxResults: 10 },
      gmAccount.id,
      composioUserId
    );
    return { ...res, app: 'gmail' };
  }

  // 4. Universal Natural Language Execution via Composio Tool Router
  return await executeComposioNaturalLanguage(
    composioApiKey,
    composioUserId,
    userPrompt,
    [{ id: 'conn-composio', enabled: true }],
    connectedAccounts
  );
}

/**
 * STEP 4: Format the Result into Clean Markdown or Conversational Output
 */
export async function formatConnectorResult(
  userPrompt: string,
  result: { success: boolean; data?: any; error?: string; app?: string },
  conversationHistory: any[] = []
): Promise<string> {
  if (!result.success) {
    return result.error || 'The connector action could not be completed.';
  }

  const data = result.data?.data ?? result.data?.response_data ?? result.data;
  const app = result.app || '';

  // 1. YouTube Playlists formatting
  if (app === 'youtube' || data?.items || data?.playlists) {
    const rawItems = data?.items || data?.playlists || (Array.isArray(data) ? data : []);
    if (Array.isArray(rawItems) && rawItems.length > 0) {
      const channelTitle = rawItems[0]?.snippet?.channelTitle || 'Your Channel';
      const lines = [
        `### YouTube Playlists — ${channelTitle}\n`,
        `Found **${rawItems.length}** playlist${rawItems.length === 1 ? '' : 's'} on your connected YouTube account:\n`,
      ];

      rawItems.forEach((item: any, idx: number) => {
        const title = item.snippet?.title || item.title || 'Untitled Playlist';
        const id = item.id || item.playlistId;
        const url = id ? `https://www.youtube.com/playlist?list=${id}` : '';
        const desc = item.snippet?.description ? ` — *${item.snippet.description.slice(0, 100)}*` : '';
        const linkStr = url ? `[${title}](${url})` : title;
        lines.push(`${idx + 1}. **${linkStr}**${desc}`);
      });

      return lines.join('\n');
    }
  }

  // 2. GitHub Repositories formatting
  if (app === 'github' || Array.isArray(data)) {
    if (Array.isArray(data) && data.length > 0 && (data[0].full_name || data[0].name)) {
      const lines = [
        `### Your GitHub Repositories\n`,
        `Found **${data.length}** repositor${data.length === 1 ? 'y' : 'ies'} on your connected GitHub account:\n`,
      ];

      data.slice(0, 15).forEach((repo: any, idx: number) => {
        const name = repo.full_name || repo.name;
        const url = repo.html_url || `https://github.com/${name}`;
        const desc = repo.description ? ` — *${repo.description.slice(0, 100)}*` : '';
        const stars = repo.stargazers_count ? ` (★ ${repo.stargazers_count})` : '';
        lines.push(`${idx + 1}. **[${name}](${url})**${stars}${desc}`);
      });

      if (data.length > 15) {
        lines.push(`\n*...and ${data.length - 15} more repositories.*`);
      }

      return lines.join('\n');
    }
  }

  // 3. Gmail formatting
  if (app === 'gmail' && data) {
    const threads = data.threads || (Array.isArray(data) ? data : []);
    if (Array.isArray(threads) && threads.length > 0) {
      const lines = [
        `### Recent Gmail Threads\n`,
        `Found **${threads.length}** message thread${threads.length === 1 ? '' : 's'}:\n`,
      ];

      threads.slice(0, 10).forEach((t: any, idx: number) => {
        const snippet = t.snippet ? ` — ${t.snippet.slice(0, 120)}...` : '';
        lines.push(`${idx + 1}. **Thread \`${t.id}\`**${snippet}`);
      });

      return lines.join('\n');
    }
  }

  // 4. Default JSON or text
  if (typeof data === 'string') return data;
  return '```json\n' + JSON.stringify(data, null, 2) + '\n```';
}

/**
 * STEP 5: Stream the Formatted Result to the Frontend (SSE Chunking)
 */
export function streamConnectorResult(content: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      const chunkSize = 28;
      for (let pos = 0; pos < content.length; pos += chunkSize) {
        const piece = content.slice(pos, pos + chunkSize);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ content: piece })}\n\n`));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

/**
 * STEP 6: Main Handler Orchestrator
 */
export async function handleConnectorRequest(
  userPrompt: string,
  composioUserId: string = 'sameer-web-user',
  messages: any[] = []
): Promise<Response | null> {
  // 1. Check if request is connector-related
  if (!isConnectorRelatedRequest(userPrompt)) {
    return null; // Not a connector request -> pass to general AI chat
  }

  // 2. Check setup & accounts
  const setup = await checkConnectorSetup(composioUserId);
  if (!setup.success) {
    return new Response(streamConnectorResult(setup.error || 'Composio setup failed.'), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Router': 'connector-setup-error',
      },
    });
  }

  // 3. Execute connector request
  const result = await executeConnectorRequest(
    userPrompt,
    setup.apiKey,
    setup.userId,
    setup.accounts
  );

  // If OAuth authorization is needed
  if (result.connectUrl) {
    const msg = `Your account requires authorization. Please open this link to connect:\n\n[Authorize Connection](${result.connectUrl})`;
    return new Response(streamConnectorResult(msg), {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Claude-Router': 'connector-auth-needed',
      },
    });
  }

  // 4 & 5. Format & Stream Result
  const formatted = await formatConnectorResult(userPrompt, result, messages);
  return new Response(streamConnectorResult(formatted), {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Claude-Router': 'connector-success',
    },
  });
}
