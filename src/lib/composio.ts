export interface ComposioConnectedAccount {
  id: string;
  appUniqueId: string;
  appName?: string;
  status: 'ACTIVE' | 'INITIATED' | 'FAILED' | 'EXPIRED';
  createdAt: string;
  updatedAt: string;
  email?: string;
  userUuid?: string;
  accountIdentifier?: string;
}

export const COMPOSIO_APP_MAP: Record<string, string> = {
  'conn-gmail': 'gmail',
  'conn-gdrive': 'google_drive',
  'conn-gcalendar': 'google_calendar',
  'conn-youtube': 'youtube',
  'conn-instagram': 'instagram',
  'conn-facebook': 'facebook',
  'conn-slack': 'slack',
  'conn-github': 'github',
  'conn-notion': 'notion',
  'conn-twitter': 'twitter',
  'conn-linear': 'linear',
  'conn-asana': 'asana',
  'conn-composio': 'composio',
};

export interface ComposioToolDefinition {
  slug: string;
  name?: string;
  description?: string;
  toolkit?: string;
  inputSchema: Record<string, any>;
  outputSchema?: Record<string, any>;
}

function normaliseComposioSchema(raw: any): Record<string, any> {
  if (!raw || typeof raw !== 'object') return { type: 'object', properties: {}, additionalProperties: true };
  if (raw.type === 'object' || raw.properties) {
    return { type: 'object', properties: raw.properties || {}, ...(raw.required ? { required: raw.required } : {}) };
  }
  const properties: Record<string, any> = {};
  const required: string[] = [];
  for (const [key, value] of Object.entries(raw)) {
    const v: any = value || {};
    properties[key] = {
      type: v.type || 'string',
      ...(v.description ? { description: v.description } : {}),
      ...(v.enum ? { enum: v.enum } : {}),
      ...(v.items ? { items: v.items } : {}),
    };
    if (v.required === true) required.push(key);
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}), additionalProperties: false };
}

function connectorToolkitSlug(connector: any): string {
  const raw = String(connector?.id || '').replace(/^conn-/, '').toLowerCase();
  const aliases: Record<string, string> = {
    gdrive: 'google_drive',
    gcalendar: 'google_calendar',
    m365: 'microsoft365',
  };
  return aliases[raw] || raw;
}

export async function searchComposioTools(
  apiKey: string,
  query: string,
  toolkitSlugs: string[] = []
): Promise<ComposioToolDefinition[]> {
  const results: ComposioToolDefinition[] = [];
  const targets = Array.from(new Set(toolkitSlugs.filter(Boolean)));
  for (const toolkit of (targets.length ? targets : ['github']).slice(0, 12)) {
    try {
      const url = new URL(`${COMPOSIO_V31_BASE}/tools`);
      url.searchParams.set('toolkit_slug', toolkit);
      url.searchParams.set('toolkit_versions', 'latest');
      url.searchParams.set('limit', '12');
      url.searchParams.set('query', String(query || '').slice(0, 180));
      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      for (const item of (Array.isArray(data.items) ? data.items : [])) {
        if (!item.slug || item.is_deprecated) continue;
        results.push({
          slug: String(item.slug),
          name: item.name,
          description: item.human_description || item.description || item.name || item.slug,
          toolkit: item.toolkit?.slug || toolkit,
          inputSchema: normaliseComposioSchema(item.input_schema || item.inputSchema || item.input_parameters),
          outputSchema: normaliseComposioSchema(item.output_schema || item.outputSchema || item.output_parameters),
        });
      }
    } catch {}
  }
  return results;
}

const COMPOSIO_V3_BASE = 'https://backend.composio.dev/api/v3';
const COMPOSIO_V31_BASE = 'https://backend.composio.dev/api/v3.1';

export async function getComposioApiKey(userKey?: string): Promise<string | null> {
  return (
    userKey ||
    process.env.COMPOSIO_API_KEY ||
    process.env.NEXT_PUBLIC_COMPOSIO_API_KEY ||
    null
  );
}
export function normalizeComposioToolkitSlug(value: string): string {
  const raw = String(value || '')
    .replace(/^conn-/i, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const aliases: Record<string, string> = {
    github: 'github', gmail: 'gmail', gdrive: 'google_drive', googledrive: 'google_drive',
    google_drive: 'google_drive', gcalendar: 'google_calendar', googlecalendar: 'google_calendar',
    google_calendar: 'google_calendar', m365: 'microsoft365', microsoft365: 'microsoft365',
    youtube: 'youtube', instagram: 'instagram', facebook: 'facebook', twitter: 'twitter',
    linkedin: 'linkedin', tiktok: 'tiktok', slack: 'slack', notion: 'notion', linear: 'linear',
    asana: 'asana', canva: 'canva', hubspot: 'hubspot', salesforce: 'salesforce', shopify: 'shopify',
    reddit: 'reddit', discord: 'discord', telegram: 'telegram', whatsapp: 'whatsapp',
  };
  return aliases[raw] || raw;
}

export function toolkitFromComposioToolSlug(toolSlug: string): string {
  const raw = String(toolSlug || '').trim().toUpperCase();
  const prefix = raw.split('_')[0] || '';
  const compactAliases: Record<string, string> = {
    GOOGLEDRIVE: 'google_drive',
    GOOGLECALENDAR: 'google_calendar',
    MICROSOFT365: 'microsoft365',
    M365: 'microsoft365',
    OUTLOOK: 'microsoft365',
    GMAIL: 'gmail',
    GITHUB: 'github',
    YOUTUBE: 'youtube',
    INSTAGRAM: 'instagram',
    FACEBOOK: 'facebook',
    TWITTER: 'twitter',
    LINKEDIN: 'linkedin',
    TIKTOK: 'tiktok',
    SLACK: 'slack',
    NOTION: 'notion',
    LINEAR: 'linear',
    ASANA: 'asana',
    CANVA: 'canva',
    HUBSPOT: 'hubspot',
    SALESFORCE: 'salesforce',
    SHOPIFY: 'shopify',
    REDDIT: 'reddit',
    DISCORD: 'discord',
    TELEGRAM: 'telegram',
    WHATSAPP: 'whatsapp',
  };
  if (compactAliases[prefix]) return compactAliases[prefix];

  const normalized = normalizeComposioToolkitSlug(prefix);
  return normalized;
}

function enabledComposioToolkits(
  connectors: any[] = [],
  accounts: ComposioConnectedAccount[] = []
): string[] {
  // The workspace has one built-in connector: Composio. In that mode,
  // every ACTIVE toolkit attached to the current Composio user becomes
  // available to the Tool Router session.
  const hasComposioHub = connectors.some(
    (c: any) => String(c?.id || '') === 'conn-composio' && c?.enabled !== false
  );

  if (hasComposioHub) {
    return Array.from(new Set(
      accounts
        .filter((account) => String(account?.status || '').toUpperCase() === 'ACTIVE')
        .map((account) => String(account?.appUniqueId || account?.appName || '').toLowerCase())
        .filter(Boolean)
    ));
  }

  const builtInComposioIds = new Set([
    'conn-github', 'conn-gmail', 'conn-gdrive', 'conn-gcalendar', 'conn-m365',
    'conn-youtube', 'conn-instagram', 'conn-facebook', 'conn-twitter',
    'conn-linkedin', 'conn-tiktok', 'conn-slack', 'conn-notion', 'conn-linear',
    'conn-asana', 'conn-canva', 'conn-hubspot', 'conn-salesforce', 'conn-shopify',
    'conn-reddit', 'conn-discord', 'conn-telegram', 'conn-whatsapp',
  ]);

  return Array.from(new Set(
    connectors
      .filter((c: any) => {
        if (c?.enabled === false) return false;
        return !c?.isCustom || builtInComposioIds.has(String(c?.id || ''));
      })
      .map((c: any) => normalizeComposioToolkitSlug(String(c?.id || '')))
      .filter(Boolean)
  ));
}

export async function createComposioToolRouterSession(
  apiKey: string,
  userId: string,
  connectors: any[] = [],
  accounts: ComposioConnectedAccount[] = []
): Promise<{ success: boolean; sessionId?: string; error?: string }> {
  const toolkits = enabledComposioToolkits(connectors, accounts);
  if (!apiKey) return { success: false, error: 'Missing Composio API key.' };
  if (!toolkits.length) return { success: false, error: 'No Composio-backed connectors are enabled for this chat.' };

  const connectedAccounts: Record<string, string[]> = {};
  for (const toolkit of toolkits) {
    const connector = connectors.find((c: any) =>
      c?.enabled !== false &&
      String(c?.id || '') !== 'conn-composio' &&
      normalizeComposioToolkitSlug(String(c?.id || '')) === toolkit
    );
    const selected = String(connector?.config?.connectedAccountId || '').trim();
    const active = accounts.filter((a) => String(a.appUniqueId || '').toLowerCase() === toolkit && a.status === 'ACTIVE');
    if (selected && active.some((a) => String(a.id) === selected)) {
      connectedAccounts[toolkit] = [selected];
    } else if (active.length === 1) {
      connectedAccounts[toolkit] = [String(active[0].id)];
    }
  }

  try {
    const res = await fetch(`${COMPOSIO_V31_BASE}/tool_router/session`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: String(userId || 'default'),
        // Composio's create-session request uses "enable" for the toolkit
        // allowlist (the response normalizes this to "enabled").
        toolkits: { enabled: toolkits },
        ...(Object.keys(connectedAccounts).length ? { connected_accounts: connectedAccounts } : {}),
        multi_account: { enable: true, max_accounts_per_toolkit: 0, require_explicit_selection: true },
        search: { enable: true },
        execute: { enable_multi_execute: true },
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.session_id) {
      return { success: false, error: data?.error?.message || data?.message || `Composio Tool Router session failed (${res.status}).` };
    }
    return { success: true, sessionId: String(data.session_id) };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Composio Tool Router session failed.' };
  }
}

export async function searchComposioToolRouter(
  apiKey: string, sessionId: string, query: string, model: string = 'claude-3-7-sonnet'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const res = await fetch(`${COMPOSIO_V31_BASE}/tool_router/session/${encodeURIComponent(sessionId)}/search`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ queries: [{ use_case: String(query || '').slice(0, 500) }], model, search_strategy: 'auto' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { success: false, error: data?.error?.message || data?.message || `Composio tool search failed (${res.status}).` };
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Composio tool search failed.' };
  }
}

export async function generateComposioToolInput(
  apiKey: string, toolSlug: string, text: string, model: string = 'claude-3-7-sonnet'
): Promise<{ success: boolean; arguments?: Record<string, any>; error?: string }> {
  try {
    const res = await fetch(`${COMPOSIO_V31_BASE}/tools/execute/${encodeURIComponent(toolSlug)}/input`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: String(text || '').slice(0, 3000),
        version: 'latest',
        system_prompt: 'Translate the user request into exact tool arguments. Preserve explicit IDs, names, emails, repositories, dates, and requested values. Never invent missing required values.',
        custom_description: `Execute only against the connected account selected for the current chat. Model: ${model}.`,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.arguments) return { success: false, error: data?.error?.message || data?.error || data?.message || `Argument generation failed (${res.status}).` };
    return { success: true, arguments: data.arguments };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Argument generation failed.' };
  }
}

export async function executeComposioToolRouter(
  apiKey: string, sessionId: string, toolSlug: string, args: Record<string, any> = {}, accountId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const body: Record<string, any> = { tool_slug: toolSlug, arguments: args };
    if (accountId) body.account = accountId;
    const res = await fetch(`${COMPOSIO_V31_BASE}/tool_router/session/${encodeURIComponent(sessionId)}/execute`, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.successful === false) return { success: false, error: data?.error?.message || data?.error || data?.message || `Composio execution failed (${res.status}).`, data };
    return { success: true, data: data?.data ?? data?.response_data ?? data };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Composio execution failed.' };
  }
}

export async function executeComposioNaturalLanguage(
  apiKey: string, userId: string, requestText: string, connectors: any[] = [], accounts: ComposioConnectedAccount[] = [], model: string = 'claude-3-7-sonnet'
): Promise<{ success: boolean; toolSlug?: string; arguments?: Record<string, any>; data?: any; error?: string; sessionId?: string }> {
  const session = await createComposioToolRouterSession(apiKey, userId, connectors, accounts);
  if (!session.success || !session.sessionId) return { success: false, error: session.error || 'Unable to create Composio session.' };
  const search = await searchComposioToolRouter(apiKey, session.sessionId, requestText, model);
  if (!search.success) return { success: false, sessionId: session.sessionId, error: search.error };
  const result = Array.isArray(search.data?.results) ? search.data.results[0] : null;
  const schemas = search.data?.tool_schemas || {};
  const toolSlug = result?.primary_tool_slugs?.[0] || result?.tool_slugs?.[0] || Object.keys(schemas)[0];
  if (!toolSlug) return { success: false, sessionId: session.sessionId, error: 'Composio could not find an executable tool for that request.' };
  const toolkit = toolkitFromComposioToolSlug(toolSlug);
  const status = Array.isArray(search.data?.toolkit_connection_statuses)
    ? search.data.toolkit_connection_statuses.find((s: any) => String(s?.toolkit || '').toLowerCase() === toolkit)
    : null;
  if (status?.has_active_connection === false) return { success: false, sessionId: session.sessionId, toolSlug, error: status.status_message || `No active connection is available for ${toolkit}.` };
  const generated = await generateComposioToolInput(apiKey, toolSlug, requestText, model);
  if (!generated.success || !generated.arguments) return { success: false, sessionId: session.sessionId, toolSlug, error: generated.error || `Could not generate arguments for ${toolSlug}.` };
  const connector = connectors.find((c: any) => c?.enabled !== false && normalizeComposioToolkitSlug(String(c?.id || '')) === toolkit);
  const selectedId = String(connector?.config?.connectedAccountId || '').trim();
  const executed = await executeComposioToolRouter(apiKey, session.sessionId, toolSlug, generated.arguments, selectedId || undefined);
  return { ...executed, toolSlug, arguments: generated.arguments, sessionId: session.sessionId };
}

export async function listConnectedAccounts(
  apiKey: string,
  entityId?: string,
  toolkitSlug?: string
): Promise<ComposioConnectedAccount[]> {
  try {
    const params = new URLSearchParams();
    params.set('limit', '100');
    // Composio v3.1 documents these filters as arrays. Append each value
    // so the API receives the same wire shape as the SDK (userIds/toolkitSlugs).
    if (entityId && entityId !== 'default') params.append('user_ids', entityId);
    if (toolkitSlug) params.append('toolkit_slugs', toolkitSlug);

    const urls = [
      `${COMPOSIO_V31_BASE}/connected_accounts?${params.toString()}`,
      `${COMPOSIO_V3_BASE}/connected_accounts?${params.toString()}`,
    ];

    let lastError = '';
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
          cache: 'no-store',
        });
        if (!res.ok) {
          lastError = `Composio connected-account lookup failed (${res.status}).`;
          continue;
        }
        const data = await res.json();
        const rawList = Array.isArray(data.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : Array.isArray(data.connectedAccounts)
          ? data.connectedAccounts
          : Array.isArray(data.data)
          ? data.data
          : [];

        return rawList.map((item: any) => {
          const appUid = String(
            item.toolkit?.slug || item.toolkit_slug || item.appUniqueId ||
            item.appName || item.app?.name || ''
          ).toLowerCase();

          const email =
            item.state?.val?.email ||
            item.state?.val?.user_email ||
            item.params?.email ||
            item.connectionParams?.email ||
            item.connectionParams?.headers?.['user_email'] ||
            item.connectionParams?.val?.email ||
            item.user_email ||
            item.data?.email ||
            item.credentials?.email ||
            (item.accountIdentifier && String(item.accountIdentifier).includes('@') ? item.accountIdentifier : undefined) ||
            (item.userUuid && String(item.userUuid).includes('@') ? item.userUuid : undefined) ||
            (item.user_id && String(item.user_id).includes('@') ? item.user_id : undefined) ||
            (item.clientUniqueUserId && String(item.clientUniqueUserId).includes('@') ? item.clientUniqueUserId : undefined) ||
            (typeof item.label === 'string' && item.label.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1]);

          return {
            id: item.id || item.nanoid || `acc_${Date.now()}`,
            appUniqueId: appUid,
            appName: item.toolkit?.name || item.appName || item.toolkit_slug || item.appUniqueId || appUid,
            status:
              item.status === 'ACTIVE' || item.status === 'active' || item.status === 'CONNECTED'
                ? 'ACTIVE'
                : item.status === 'INITIALIZING' || item.status === 'init'
                ? 'idle'
                : 'idle',
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
            userUuid: item.user_id || item.userUuid,
            email,
            accountIdentifier: item.alias || item.accountIdentifier || item.label || email,
          };
        });
      } catch (err) {}
    }
    if (lastError) throw new Error(lastError);
    return [];
  } catch (err) {
    throw err;
  }
}

export async function initiateAppConnection(
  apiKey: string,
  appName: string,
  entityId: string = 'default',
  redirectUrl?: string
): Promise<{ success: boolean; redirectUrl?: string; connectionId?: string; error?: string }> {
  const composioAppName = normalizeComposioToolkitSlug(COMPOSIO_APP_MAP[appName] || appName);
  const cbUrl = redirectUrl || 'https://claude-enterprise-app.vercel.app/api/composio/callback';

  try {
    const authUrl = new URL(COMPOSIO_V31_BASE + '/auth_configs');
    authUrl.searchParams.set('toolkit_slug', composioAppName);
    authUrl.searchParams.set('is_composio_managed', 'true');
    authUrl.searchParams.set('show_disabled', 'false');
    authUrl.searchParams.set('limit', '50');

    const authRes = await fetch(authUrl.toString(), {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const authData = await authRes.json().catch(() => ({}));

    if (!authRes.ok) {
      return {
        success: false,
        error: authData?.error?.message || authData?.message || 'Composio auth configuration lookup failed (' + authRes.status + ').',
      };
    }

    const authConfigs = Array.isArray(authData?.items) ? authData.items : [];
    const authConfig = authConfigs.find((item: any) =>
      item?.is_composio_managed === true &&
      String(item?.status || '').toUpperCase() !== 'DISABLED'
    );

    if (!authConfig?.id) {
      return {
        success: false,
        error: 'No enabled Composio-managed OAuth configuration exists for ' + composioAppName + '. Enable its managed auth config in your Composio project.',
      };
    }

    const linkRes = await fetch(COMPOSIO_V31_BASE + '/connected_accounts/link', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_config_id: authConfig.id,
        user_id: String(entityId),
        callback_url: cbUrl,
        allow_multiple: true,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const linkData = await linkRes.json().catch(() => ({}));

    if (!linkRes.ok) {
      return {
        success: false,
        error: linkData?.error?.message || linkData?.message || 'Composio could not create the OAuth link (' + linkRes.status + ').',
      };
    }

    const link = linkData?.redirect_url || linkData?.redirectUrl;
    if (!link) {
      return { success: false, error: 'Composio returned no OAuth redirect URL.' };
    }

    return {
      success: true,
      redirectUrl: String(link),
      connectionId: linkData?.connected_account_id ? String(linkData.connected_account_id) : undefined,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Composio OAuth link creation failed.' };
  }
}

export async function executeComposioAction(
  apiKey: string,
  actionName: string,
  input: Record<string, any> = {},
  connectedAccountId?: string,
  entityId: string = 'default'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const url = COMPOSIO_V31_BASE + '/tools/execute/' + encodeURIComponent(actionName);
    const body: Record<string, any> = {
      arguments: input,
      user_id: entityId,
      version: 'latest',
    };
    if (connectedAccountId) body.connected_account_id = connectedAccountId;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.successful === false) {
      return {
        success: false,
        error: data?.error?.message || data?.error || data?.message || 'Composio tool execution failed (' + res.status + ').',
      };
    }

    return {
      success: true,
      data: data?.data ?? data?.response_data ?? data,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Composio tool execution failed.' };
  }
}

/**
 * Real-time helper: Fetch live YouTube playlists from user's authenticated channel
 */
export async function fetchLiveYouTubePlaylists(
  apiKey: string,
  connectedAccountId?: string
): Promise<{ success: boolean; playlists?: any[]; error?: string }> {
  const attempts = [
    'YOUTUBE_LIST_USER_PLAYLISTS',
    'YOUTUBE_LIST_MY_PLAYLISTS',
    'YOUTUBE_LIST_PLAYLISTS',
  ];

  for (const action of attempts) {
    const res = await executeComposioAction(apiKey, action, { mine: true, maxResults: 25 }, connectedAccountId);
    if (res.success && res.data) {
      const items = res.data.items || res.data.playlists || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(items)) {
        return {
          success: true,
          playlists: items.map((p: any) => ({
            id: p.id || p.playlistId,
            title: p.snippet?.title || p.title || 'Untitled Playlist',
            description: p.snippet?.description || p.description || '',
            itemCount: p.contentDetails?.itemCount || p.itemCount || 0,
            privacyStatus: p.status?.privacyStatus || p.privacyStatus || 'public',
            url: `https://www.youtube.com/playlist?list=${p.id || p.playlistId}`,
          })),
        };
      }
    }
  }

  return {
    success: false,
    error: 'No playlists returned or YouTube permissions not granted for playlists.',
  };
}

/**
 * Real-time helper: Fetch live Google Drive files from user's authenticated account
 */
export async function fetchLiveDriveFiles(
  apiKey: string,
  connectedAccountId?: string
): Promise<{ success: boolean; files?: any[]; error?: string }> {
  const attempts = ['GOOGLEDRIVE_LIST_FILES', 'GOOGLEDRIVE_SEARCH_FILES'];
  for (const action of attempts) {
    const res = await executeComposioAction(apiKey, action, { pageSize: 10 }, connectedAccountId);
    if (res.success && res.data) {
      const items = res.data.files || res.data.items || (Array.isArray(res.data) ? res.data : []);
      if (Array.isArray(items) && items.length > 0) {
        return {
          success: true,
          files: items.map((f: any) => ({
            id: f.id,
            name: f.name || f.title,
            mimeType: f.mimeType,
            webViewLink: f.webViewLink || `https://drive.google.com/file/d/${f.id}/view`,
          })),
        };
      }
    }
  }
  return { success: false, error: 'Drive files fetch failed' };
}
