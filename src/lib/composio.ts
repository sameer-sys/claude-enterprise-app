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
  isDefault?: boolean;
}

export const COMPOSIO_SUPPORTED_TOOLKITS = [
  'github','gmail','google_drive','google_calendar','youtube','slack','notion',
  'microsoft365','instagram','facebook','linkedin','linear','asana','canva','hubspot'
] as const;

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

const composioToolsCache = new Map<string, { timestamp: number; tools: any[] }>();

export async function fetchComposioToolsForToolkits(
  apiKey: string,
  toolkitSlugs: string[]
): Promise<any[]> {
  const tools: any[] = [];
  const targets = Array.from(new Set(toolkitSlugs.map(s => normalizeComposioToolkitSlug(s)).filter(Boolean)));

  for (const toolkit of targets.slice(0, 10)) {
    const cacheKey = `${apiKey.slice(-8)}_${toolkit}`;
    const cached = composioToolsCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < 300000) {
      tools.push(...cached.tools);
      continue;
    }

    try {
      const url = new URL(`${COMPOSIO_V31_BASE}/tools`);
      url.searchParams.set('toolkit_slug', toolkit);
      url.searchParams.set('toolkit_versions', 'latest');
      url.searchParams.set('limit', '15');
      const res = await fetch(url.toString(), {
        headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
        cache: 'no-store',
        signal: AbortSignal.timeout(6000),
      });
      if (!res.ok) continue;
      const data = await res.json();
      const tkTools: any[] = [];
      for (const item of (Array.isArray(data.items) ? data.items : [])) {
        if (!item.slug || item.is_deprecated) continue;
        const schema = normaliseComposioSchema(item.input_schema || item.inputSchema || item.input_parameters);
        tkTools.push({
          type: 'function',
          function: {
            name: String(item.slug),
            description: item.human_description || item.description || item.name || item.slug,
            parameters: schema,
          },
        });
      }
      composioToolsCache.set(cacheKey, { timestamp: Date.now(), tools: tkTools });
      tools.push(...tkTools);
    } catch {}
  }
  return tools;
}

const COMPOSIO_V3_BASE = 'https://backend.composio.dev/api/v3';
const COMPOSIO_V31_BASE = 'https://backend.composio.dev/api/v3.1';

export async function getComposioApiKey(userKey?: string): Promise<string | null> {
  return (
    userKey ||
    process.env.COMPOSIO_API_KEY ||
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
    // Match Composio Connect: discover supported app tools before an account
    // exists, then let connection management request OAuth when execution needs it.
    return Array.from(new Set([
      ...COMPOSIO_SUPPORTED_TOOLKITS,
      ...accounts
        .filter((account) => String(account?.status || '').toUpperCase() === 'ACTIVE')
        .map((account) => normalizeComposioToolkitSlug(String(account?.appUniqueId || account?.appName || '')))
        .filter(Boolean),
    ]));
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
    const defaultAccount = active.find((a: any) => a?.isDefault === true);
    if (selected && active.some((a) => String(a.id) === selected)) {
      connectedAccounts[toolkit] = [selected];
    } else if (defaultAccount) {
      connectedAccounts[toolkit] = [String(defaultAccount.id)];
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
      body: JSON.stringify({ queries: [{ use_case: String(query || '') }], model, search_strategy: 'auto' }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
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
        text: String(text || ''),
        version: 'latest',
        system_prompt: 'Translate the user request into exact tool arguments. Preserve explicit IDs, names, emails, repositories, dates, and requested values. Never invent missing required values.',
        custom_description: `Execute only against the connected account selected for the current chat.`,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(15000),
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
  apiKey: string,
  userId: string,
  requestText: string,
  connectors: any[] = [],
  accounts: ComposioConnectedAccount[] = [],
  model: string = 'claude-3-7-sonnet',
  callbackUrl?: string
): Promise<{ success: boolean; toolSlug?: string; arguments?: Record<string, any>; data?: any; error?: string; sessionId?: string; connectUrl?: string }> {
  try {
    if (!apiKey) return { success: false, error: 'Missing Composio API key.' };

    const normalizedUserId = String(userId || '').trim() || 'sameer-web-user';

    // Fetch only accounts scoped to this Composio user. Do not use a project-wide
    // account as a fallback: Composio validates that connected_account_id belongs
    // to the user_id used for execution.
    let userAccounts = accounts.filter((a: any) =>
      String(a?.status || '').toUpperCase() === 'ACTIVE' &&
      (!a?.userUuid || String(a.userUuid) === normalizedUserId)
    );

    if (!userAccounts.length) {
      try {
        userAccounts = (await listConnectedAccounts(apiKey, normalizedUserId))
          .filter((a: any) => String(a?.status || '').toUpperCase() === 'ACTIVE');
      } catch {}
    }

    const activeToolkits = Array.from(new Set(
      userAccounts
        .map((a: any) => normalizeComposioToolkitSlug(String(a?.appUniqueId || a?.appName || '')))
        .filter(Boolean)
    ));

    // If the conversation connector configuration names a specific app, include
    // that app in discovery even before account metadata is fully hydrated.
    const configuredToolkits = connectors
      .filter((c: any) => c?.enabled !== false)
      .map((c: any) => normalizeComposioToolkitSlug(String(c?.id || '')))
      .filter(Boolean);

    const targetToolkits = Array.from(new Set([...activeToolkits, ...configuredToolkits]));

    if (!targetToolkits.length) {
      return {
        success: false,
        error: 'No Composio-connected toolkit is available for this user. Reconnect the app through the Connectors panel.'
      };
    }

    // 1) Ask Composio's live tool catalog which real action matches the request.
    const found = await searchComposioTools(apiKey, requestText, targetToolkits);
    if (!found.length) {
      return {
        success: false,
        error: 'Composio could not find a real executable action for this request.'
      };
    }

    // Prefer an action from an actually connected toolkit.
    const connectedFound = found.find((tool) =>
      activeToolkits.includes(normalizeComposioToolkitSlug(String(tool.toolkit || toolkitFromComposioToolSlug(tool.slug))))
    );
    const selected = connectedFound || found[0];
    const toolSlug = String(selected.slug || '').trim();
    if (!toolSlug) {
      return { success: false, error: 'Composio returned a tool without a valid tool slug.' };
    }

    const toolkit = normalizeComposioToolkitSlug(
      String(selected.toolkit || toolkitFromComposioToolSlug(toolSlug))
    );

    // 2) Have Composio translate the user's natural-language request into the
    // exact argument object required by that real tool schema.
    const generated = await generateComposioToolInput(apiKey, toolSlug, requestText, model);
    if (!generated.success || !generated.arguments) {
      return {
        success: false,
        toolSlug,
        error: generated.error || 'Composio could not build valid arguments for the selected action.'
      };
    }

    // 3) Resolve the authenticated account belonging to this same Composio user.
    const configuredConnector = connectors.find((c: any) =>
      c?.enabled !== false &&
      normalizeComposioToolkitSlug(String(c?.id || '')) === toolkit
    );
    const requestedAccountId = String(configuredConnector?.config?.connectedAccountId || '').trim();

    const matchingAccounts = userAccounts.filter((a: any) =>
      normalizeComposioToolkitSlug(String(a?.appUniqueId || a?.appName || '')) === toolkit
    );

    const defaultAccount = matchingAccounts.find((a: any) => a?.isDefault === true);
    const resolvedAccountId =
      (requestedAccountId && matchingAccounts.some((a: any) => String(a.id) === requestedAccountId)
        ? requestedAccountId
        : '') ||
      (defaultAccount ? String(defaultAccount.id) : '') ||
      (matchingAccounts.length === 1 ? String(matchingAccounts[0].id) : '');

    if (!resolvedAccountId) {
      if (!matchingAccounts.length) {
        const link = await createComposioConnectionLink(apiKey, normalizedUserId, toolkit, callbackUrl);
        if (link.success && link.redirectUrl) {
          return {
            success: true,
            toolSlug,
            data: 'Authorization required for ' + toolkit + '. Open this link to connect your account: ' + link.redirectUrl,
            connectUrl: link.redirectUrl,
          };
        }
        return {
          success: false,
          toolSlug,
          error: 'No active ' + toolkit + ' account is connected to this Composio user.'
        };
      }

      return {
        success: false,
        toolSlug,
        error: 'Multiple active ' + toolkit + ' accounts are connected. Select the intended account before executing this request.'
      };
    }

    // 4) Execute the REAL Composio tool directly. This is the actual source of
    // connected-app data/actions; there is no LLM fallback in this function.
    const executed = await executeComposioAction(
      apiKey,
      toolSlug,
      generated.arguments,
      resolvedAccountId,
      normalizedUserId
    );

    if (!executed.success) {
      return {
        success: false,
        toolSlug,
        arguments: generated.arguments,
        error: executed.error || 'Composio tool execution failed.'
      };
    }

    return {
      success: true,
      toolSlug,
      arguments: generated.arguments,
      data: executed.data
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Composio natural-language execution failed.'
    };
  }
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
        let rawList = Array.isArray(data.items)
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
            isDefault: Boolean(item.is_default ?? item.isDefault ?? false),
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

export async function createComposioConnectionLink(
  apiKey: string,
  userId: string,
  toolkit: string,
  callbackUrl?: string,
  alias?: string
): Promise<{ success: boolean; redirectUrl?: string; sessionId?: string; error?: string }> {
  void alias;
  const result = await initiateAppConnection(apiKey, toolkit, userId, callbackUrl);
  return {
    success: result.success,
    redirectUrl: result.redirectUrl,
    sessionId: result.connectionId,
    error: result.error,
  };
}

async function ensureManagedAuthConfig(apiKey: string, toolkit: string): Promise<{ id?: string; error?: string }> {
  const normalizedToolkit = normalizeComposioToolkitSlug(toolkit);
  try {
    const url = new URL(COMPOSIO_V31_BASE + '/auth_configs');
    url.searchParams.set('toolkit_slug', normalizedToolkit);
    url.searchParams.set('is_composio_managed', 'true');
    url.searchParams.set('show_disabled', 'false');
    url.searchParams.set('limit', '50');
    const res = await fetch(url.toString(), {
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.error?.message || data?.message || ('Auth config lookup failed (' + res.status + ').') };
    const existing = Array.isArray(data?.items) ? data.items.find((item: any) =>
      item?.is_composio_managed === true && String(item?.status || '').toUpperCase() !== 'DISABLED'
    ) : null;
    if (existing?.id) return { id: String(existing.id) };

    const createRes = await fetch(COMPOSIO_V31_BASE + '/auth_configs', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ toolkit: { slug: normalizedToolkit } }),
      cache: 'no-store',
      signal: AbortSignal.timeout(10000),
    });
    const createData = await createRes.json().catch(() => ({}));
    if (!createRes.ok || !createData?.auth_config?.id) {
      return { error: createData?.error?.message || createData?.message || ('Managed auth config creation failed (' + createRes.status + ').') };
    }
    return { id: String(createData.auth_config.id) };
  } catch (err: any) {
    return { error: err?.message || 'Managed auth configuration failed.' };
  }
}

export async function initiateAppConnection(
  apiKey: string,
  appName: string,
  entityId: string = 'default',
  redirectUrl?: string
): Promise<{ success: boolean; redirectUrl?: string; connectionId?: string; error?: string }> {
  const toolkit = normalizeComposioToolkitSlug(COMPOSIO_APP_MAP[appName] || appName);
  const auth = await ensureManagedAuthConfig(apiKey, toolkit);
  if (!auth.id) return { success: false, error: auth.error || ('No managed auth configuration is available for ' + toolkit + '.') };

  try {
    const res = await fetch(COMPOSIO_V31_BASE + '/connected_accounts/link', {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        auth_config_id: auth.id,
        user_id: String(entityId),
        callback_url: redirectUrl || 'https://claude-enterprise-app.vercel.app/api/composio/callback',
        allow_multiple: true,
      }),
      cache: 'no-store',
      signal: AbortSignal.timeout(12000),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error?.message || data?.message || ('Composio OAuth link failed (' + res.status + ').') };
    }
    const link = data?.redirect_url || data?.redirectUrl;
    if (!link) return { success: false, error: 'Composio returned no OAuth redirect URL.' };
    return {
      success: true,
      redirectUrl: String(link),
      connectionId: data?.connected_account_id ? String(data.connected_account_id) : undefined,
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
  entityId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let resolvedUserId = entityId && entityId !== 'default' && entityId !== 'sameer-web-user' ? entityId : undefined;

    if (connectedAccountId) {
      try {
        const all = await listConnectedAccounts(apiKey);
        const found = all.find((a: any) => String(a.id) === String(connectedAccountId));
        if (found?.userUuid) {
          resolvedUserId = found.userUuid;
        }
      } catch {}

      if (!resolvedUserId) {
        try {
          const accRes = await fetch(COMPOSIO_V31_BASE + '/connected_accounts/' + encodeURIComponent(connectedAccountId), {
            headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
            cache: 'no-store',
            signal: AbortSignal.timeout(6000),
          });
          if (accRes.ok) {
            const accData = await accRes.json();
            resolvedUserId = accData?.user_id || accData?.userUuid || accData?.clientUniqueUserId || accData?.data?.user_id || resolvedUserId;
          }
        } catch {}
      }
    }

    const url = COMPOSIO_V31_BASE + '/tools/execute/' + encodeURIComponent(actionName);
    const body: Record<string, any> = {
      arguments: input,
      version: 'latest',
    };
    if (connectedAccountId) {
      body.connected_account_id = connectedAccountId;
    }
    if (resolvedUserId) {
      body.user_id = resolvedUserId;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(20000),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data?.successful === false) {
      const rawError =
        data?.error?.message ||
        data?.error ||
        data?.message ||
        data?.detail ||
        ('Composio tool execution failed (' + res.status + ').');
      const suffix = data?.log_id ? ' [log_id: ' + String(data.log_id) + ']' : '';
      return {
        success: false,
        error: String(rawError) + suffix,
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
