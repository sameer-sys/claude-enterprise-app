import crypto from 'crypto';

export const COMPOSIO_API_BASE = 'https://backend.composio.dev/api/v3.1';

export interface ComposioCatalogItem {
  slug: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  provider?: string;
}

export const COMPOSIO_APP_CATALOG: ComposioCatalogItem[] = [
  { slug: 'github', name: 'GitHub', description: 'Repositories, issues, pull requests, commits and code workflows.', category: 'Developer tools', icon: 'github' },
  { slug: 'gmail', name: 'Gmail', description: 'Search, read, draft and send email.', category: 'Communication', icon: 'gmail' },
  { slug: 'googledrive', name: 'Google Drive', description: 'Search, read and manage files in Drive.', category: 'Productivity', icon: 'drive' },
  { slug: 'googlecalendar', name: 'Google Calendar', description: 'Read and manage calendar events.', category: 'Productivity', icon: 'calendar' },
  { slug: 'youtube', name: 'YouTube', description: 'Read channels, videos and playlists and manage supported content.', category: 'Media', icon: 'youtube' },
  { slug: 'slack', name: 'Slack', description: 'Read and send messages and work with channels.', category: 'Communication', icon: 'slack' },
  { slug: 'notion', name: 'Notion', description: 'Search and manage pages, databases and workspace content.', category: 'Productivity', icon: 'notion' },
  { slug: 'discord', name: 'Discord', description: 'Work with servers, channels and messages.', category: 'Communication', icon: 'discord' },
  { slug: 'linear', name: 'Linear', description: 'Manage issues, projects and teams.', category: 'Project management', icon: 'linear' },
  { slug: 'asana', name: 'Asana', description: 'Manage tasks, projects and workspaces.', category: 'Project management', icon: 'asana' },
  { slug: 'jira', name: 'Jira', description: 'Manage issues and project workflows.', category: 'Project management', icon: 'jira' },
  { slug: 'trello', name: 'Trello', description: 'Manage boards, lists and cards.', category: 'Project management', icon: 'trello' },
  { slug: 'hubspot', name: 'HubSpot', description: 'Work with CRM contacts, companies and deals.', category: 'CRM', icon: 'hubspot' },
  { slug: 'salesforce', name: 'Salesforce', description: 'Work with CRM records and sales workflows.', category: 'CRM', icon: 'salesforce' },
  { slug: 'shopify', name: 'Shopify', description: 'Work with store data and supported commerce actions.', category: 'Commerce', icon: 'shopify' },
  { slug: 'reddit', name: 'Reddit', description: 'Search and interact with supported Reddit content.', category: 'Social', icon: 'reddit' },
  { slug: 'telegram', name: 'Telegram', description: 'Work with supported Telegram actions.', category: 'Communication', icon: 'telegram' },
  { slug: 'whatsapp', name: 'WhatsApp', description: 'Work with supported WhatsApp actions.', category: 'Communication', icon: 'whatsapp' },
  { slug: 'microsoft365', name: 'Microsoft 365', description: 'Connect supported Microsoft 365 services.', category: 'Productivity', icon: 'microsoft365' },
  { slug: 'zoom', name: 'Zoom', description: 'Work with supported meeting and account actions.', category: 'Communication', icon: 'zoom' },
];

function getApiKey(): string {
  return String(process.env.COMPOSIO_API_KEY || '').trim();
}

export function hasComposioPlatformKey(): boolean {
  return Boolean(getApiKey());
}

async function composioFetch(path: string, init: RequestInit = {}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('COMPOSIO_API_KEY is not configured on the server.');
  }

  const response = await fetch(COMPOSIO_API_BASE + path, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      ...(init.headers || {}),
    },
    cache: 'no-store',
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.error?.message || body?.message || body?.detail || `Composio API request failed (${response.status}).`;
    throw new Error(String(message));
  }
  return body;
}

export function ensureComposioUserId(raw?: string | null): string {
  const value = String(raw || '').trim();
  return value || `sameer_${crypto.randomUUID()}`;
}

export async function listConnectedAccounts(userId: string): Promise<any[]> {
  const params = new URLSearchParams({
    user_ids: userId,
    statuses: 'ACTIVE',
    limit: '200',
  });
  const data = await composioFetch(`/connected_accounts?${params.toString()}`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function listConnectedAccountsForToolkit(userId: string, toolkit: string): Promise<any[]> {
  const params = new URLSearchParams({
    user_ids: userId,
    toolkit_slugs: toolkit,
    statuses: 'ACTIVE',
    limit: '50',
  });
  const data = await composioFetch(`/connected_accounts?${params.toString()}`);
  return Array.isArray(data?.items) ? data.items : [];
}

export async function getManagedOrDefaultAuthConfig(toolkit: string): Promise<any> {
  const params = new URLSearchParams({
    toolkit_slug: toolkit,
    show_disabled: 'false',
    limit: '50',
  });

  const data = await composioFetch(`/auth_configs?${params.toString()}`);
  const items = Array.isArray(data?.items) ? data.items : [];

  const managed = items.find((item: any) =>
    item?.status !== 'DISABLED' && Boolean(item?.is_composio_managed)
  );
  if (managed) return managed;

  const enabled = items.find((item: any) => item?.status !== 'DISABLED');
  if (enabled) return enabled;

  throw new Error(`No enabled Composio auth configuration was found for "${toolkit}".`);
}

export async function createConnectLink(
  userId: string,
  toolkit: string,
  callbackUrl: string,
  alias?: string
): Promise<{ redirectUrl: string; connectedAccountId?: string; linkToken?: string }> {
  const authConfig = await getManagedOrDefaultAuthConfig(toolkit);
  const data = await composioFetch('/connected_accounts/link', {
    method: 'POST',
    body: JSON.stringify({
      auth_config_id: authConfig.id,
      user_id: userId,
      alias: alias || toolkit,
      callback_url: callbackUrl,
    }),
  });

  if (!data?.redirect_url) {
    throw new Error('Composio did not return a connection link.');
  }

  return {
    redirectUrl: String(data.redirect_url),
    connectedAccountId: data.connected_account_id ? String(data.connected_account_id) : undefined,
    linkToken: data.link_token ? String(data.link_token) : undefined,
  };
}

export async function createSession(userId: string): Promise<{ sessionId: string }> {
  const data = await composioFetch('/tool_router/session', {
    method: 'POST',
    body: JSON.stringify({
      user_id: userId,
      search: { enable: true },
      execute: { enable_multi_execute: true },
      manage_connections: { enable: true, enable_wait_for_connections: false, enable_connection_removal: true },
      multi_account: { enable: true, require_explicit_selection: false },
    }),
  });

  if (!data?.session_id) {
    throw new Error('Composio did not return a session id.');
  }
  return { sessionId: String(data.session_id) };
}

export async function searchSessionTools(sessionId: string, requestText: string): Promise<any> {
  return composioFetch(`/tool_router/session/${encodeURIComponent(sessionId)}/search`, {
    method: 'POST',
    body: JSON.stringify({
      queries: [{ use_case: requestText }],
      search_strategy: 'tool_search',
    }),
  });
}

export async function getSessionTools(sessionId: string, limit = 80): Promise<any[]> {
  const data = await composioFetch(
    `/tool_router/session/${encodeURIComponent(sessionId)}/tools?limit=${Math.min(Math.max(limit, 1), 500)}`
  );
  return Array.isArray(data?.items) ? data.items : [];
}

export async function executeSessionTool(
  sessionId: string,
  toolSlug: string,
  arguments_: Record<string, any> = {},
  account?: string
): Promise<any> {
  const payload: Record<string, any> = {
    tool_slug: toolSlug,
    arguments: arguments_,
  };
  if (account) payload.account = account;

  return composioFetch(`/tool_router/session/${encodeURIComponent(sessionId)}/execute`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function toolkitSlugFromTool(toolSlug: string): string {
  return String(toolSlug || '').split('_')[0].toLowerCase();
}

export function connectorForToolkit(toolkit: string): ComposioCatalogItem | undefined {
  return COMPOSIO_APP_CATALOG.find((item) => item.slug.toLowerCase() === toolkit.toLowerCase());
}

export function toOpenAITool(tool: any): any {
  const slug = String(tool?.slug || '');
  const input = tool?.input_parameters || tool?.input_schema || tool?.inputSchema || {};
  const properties: Record<string, any> = {};
  const required: string[] = [];

  if (input && typeof input === 'object') {
    for (const [key, value] of Object.entries(input)) {
      const v: any = value || {};
      properties[key] = {
        type: v.type || 'string',
        description: String(v.description || '').slice(0, 500),
        ...(v.enum ? { enum: v.enum } : {}),
        ...(v.items ? { items: v.items } : {}),
      };
      if (v.required === true) required.push(key);
    }
  }

  return {
    type: 'function',
    function: {
      name: slug,
      description: String(tool?.description || tool?.name || slug).slice(0, 700),
      parameters: {
        type: 'object',
        properties,
        ...(required.length ? { required } : {}),
        additionalProperties: true,
      },
    },
  };
}

export function extractSearchTools(searchResult: any): any[] {
  const slugs: string[] = [];
  const schemas = searchResult?.tool_schemas && typeof searchResult.tool_schemas === 'object'
    ? searchResult.tool_schemas
    : {};
  for (const key of Object.keys(schemas)) {
    const entry = schemas[key];
    const slug = String(entry?.tool_slug || key);
    if (slug) slugs.push(slug);
  }

  const primary = Array.isArray(searchResult?.results)
    ? searchResult.results.flatMap((item: any) => [
        ...(Array.isArray(item?.primary_tool_slugs) ? item.primary_tool_slugs : []),
        ...(Array.isArray(item?.related_tool_slugs) ? item.related_tool_slugs : []),
      ])
    : [];

  const allSlugs = Array.from(new Set([...slugs, ...primary].map(String).filter(Boolean))).slice(0, 12);
  return allSlugs.map((slug) => {
    const schema = schemas[slug] || schemas[Object.keys(schemas).find((key) => String(schemas[key]?.tool_slug) === slug) || ''];
    return {
      slug,
      toolkit: String(schema?.toolkit || toolkitSlugFromTool(slug)),
      name: String(schema?.name || slug),
      description: String(schema?.description || ''),
      input_parameters: schema?.input_schema || schema?.input_parameters || {},
    };
  });
}

export function connectedToolkitSlugs(accounts: any[]): string[] {
  return Array.from(new Set(
    (Array.isArray(accounts) ? accounts : [])
      .map((a: any) => String(a?.toolkit?.slug || a?.toolkit_slug || '').toLowerCase())
      .filter(Boolean)
  ));
}

export function safeJsonText(value: any): string {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  try { return JSON.stringify(value); } catch { return String(value); }
}
