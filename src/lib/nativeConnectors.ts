import type { Connector } from '@/types/chat';

/**
 * Composio "For You" MCP endpoint.
 *
 * Google does not publish standalone MCP endpoints at gmailmcp.googleapis.com,
 * drivemcp.googleapis.com or calendarmcp.googleapis.com — those hosts answer 400
 * before any OAuth dialog opens. The one integration that provably reaches
 * Gmail / Drive / Calendar is Composio's hosted MCP server, which proxies to
 * whatever apps the signed-in user has linked in their Composio account.
 *
 * So every preset is served by Composio, and the UI runs a single OAuth for
 * the whole set. `composioApp` is the toolkit slug used to match a preset
 * against the accounts returned by /api/composio.
 */
export const COMPOSIO_MCP_URL = 'https://connect.composio.dev/mcp';

/** Toolkit slugs Composio reports in `connectedAccounts[].toolkit` / app name. */
export const COMPOSIO_APP_ALIASES: Record<string, string[]> = {
  github: ['github'],
  gmail: ['gmail', 'google_gmail', 'mail'],
  gdrive: ['google_drive', 'googledrive', 'drive'],
  gcalendar: ['google_calendar', 'googlecalendar', 'calendar'],
  slack: ['slack'],
  notion: ['notion'],
  linear: ['linear'],
  m365: ['microsoft365', 'microsoft_365', 'outlook'],
  canva: ['canva'],
  dropbox: ['dropbox'],
  atlassian: ['atlassian', 'jira', 'confluence'],
  youtube: ['youtube'],
};

/** True when the signed-in Composio account has this preset's app linked. */
export function isComposioAppLinked(composioApp: string, accounts: any[]): boolean {
  const aliases = (COMPOSIO_APP_ALIASES[composioApp] || [composioApp]).map((s) => s.toLowerCase());
  return (accounts || []).some((account: any) => {
    const candidates = [
      account?.toolkit,
      account?.app_name,
      account?.appName,
      account?.app,
      account?.name,
      account?.slug,
    ]
      .filter((v) => typeof v === 'string')
      .map((v) => String(v).toLowerCase());
    return candidates.some((c) => aliases.includes(c) || aliases.some((a) => c.includes(a)));
  });
}


export const NATIVE_CONNECTORS: Connector[] = [
  {
    id: 'conn-github', name: 'GitHub',
    description: 'Search repositories, issues, pull requests, code, and work with your GitHub account.',
    icon: 'github', enabled: false, status: 'ready', category: 'Developer tools', provider: 'mcp',
    isVerified: true, section: 'top',
    capabilities: ['Repositories', 'Issues', 'Pull Requests', 'Code'],
    config: { connectionType: 'mcp', providerName: 'GitHub', mcpUrl: 'https://api.githubcopilot.com/mcp/', toolAccess: 'auto', disabledTools: [], oauthAuthorizationEndpoint: 'https://github.com/login/oauth/authorize', oauthTokenEndpoint: 'https://github.com/login/oauth/access_token', oauthTokenEndpointAuthMethod: 'client_secret_post', resource: 'https://api.githubcopilot.com/mcp/' },
    url: 'https://api.githubcopilot.com/mcp/',
  },
  {
    id: 'conn-gmail', name: 'Gmail',
    description: 'Search, read, draft, reply to, and send messages in Gmail.',
    icon: 'gmail', enabled: false, status: 'ready', category: 'Communication', provider: 'composio',
    isVerified: true, section: 'top',
    capabilities: ['Search Email', 'Read Threads', 'Drafts', 'Send & Reply'],
    config: { connectionType: 'composio', providerName: 'Gmail', mcpUrl: COMPOSIO_MCP_URL, composioApp: 'gmail', toolAccess: 'auto', disabledTools: [] },
    composioApp: 'gmail',
    url: COMPOSIO_MCP_URL,
  },
  {
    id: 'conn-gdrive', name: 'Google Drive',
    description: 'Search, read, upload, update, share, and organize files in Google Drive.',
    icon: 'gdrive', enabled: false, status: 'ready', category: 'Data and productivity', provider: 'composio',
    isVerified: true, section: 'top',
    capabilities: ['Search Files', 'Read Files', 'Upload', 'Update'],
    config: { connectionType: 'composio', providerName: 'Google Drive', mcpUrl: COMPOSIO_MCP_URL, composioApp: 'gdrive', toolAccess: 'auto', disabledTools: [] },
    composioApp: 'gdrive',
    url: COMPOSIO_MCP_URL,
  },
  {
    id: 'conn-gcalendar', name: 'Google Calendar',
    description: 'View schedules, search events, find availability, and manage calendar events.',
    icon: 'gcalendar', enabled: false, status: 'ready', category: 'Productivity', provider: 'composio',
    isVerified: true, section: 'top',
    capabilities: ['Events', 'Availability', 'Scheduling', 'Calendar Management'],
    config: { connectionType: 'composio', providerName: 'Google Calendar', mcpUrl: COMPOSIO_MCP_URL, composioApp: 'gcalendar', toolAccess: 'auto', disabledTools: [] },
    composioApp: 'gcalendar',
    url: COMPOSIO_MCP_URL,
  },
  {
    id: 'conn-slack', name: 'Slack',
    description: 'Search channels and messages, read threads, send messages, and work with canvases.',
    icon: 'slack', enabled: false, status: 'ready', category: 'Communication', provider: 'mcp',
    isVerified: true, section: 'top',
    capabilities: ['Search Messages', 'Channels', 'Threads', 'Send Messages'],
    config: { connectionType: 'mcp', providerName: 'Slack', mcpUrl: 'https://mcp.slack.com/mcp', toolAccess: 'auto', disabledTools: [], oauthAuthorizationEndpoint: 'https://slack.com/oauth/v2_user/authorize', oauthTokenEndpoint: 'https://slack.com/api/oauth.v2.user.access', oauthTokenEndpointAuthMethod: 'client_secret_post' },
    url: 'https://mcp.slack.com/mcp',
  },
  {
    id: 'conn-notion', name: 'Notion',
    description: 'Search, read, create, update, and organize Notion pages and databases.',
    icon: 'notion', enabled: false, status: 'ready', category: 'Productivity', provider: 'mcp',
    isVerified: true, section: 'top',
    capabilities: ['Search', 'Pages', 'Databases', 'Comments'],
    config: { connectionType: 'mcp', providerName: 'Notion', mcpUrl: 'https://mcp.notion.com/mcp', toolAccess: 'auto', disabledTools: [] },
    url: 'https://mcp.notion.com/mcp',
  },
  {
    id: 'conn-linear', name: 'Linear',
    description: 'Manage issues, projects, cycles, teams, comments, and engineering workflows.',
    icon: 'linear', enabled: false, status: 'ready', category: 'Productivity', provider: 'mcp',
    isVerified: true, section: 'trending',
    capabilities: ['Issues', 'Projects', 'Cycles', 'Teams'],
    config: { connectionType: 'mcp', providerName: 'Linear', mcpUrl: 'https://mcp.linear.app/mcp', toolAccess: 'auto', disabledTools: [] },
    url: 'https://mcp.linear.app/mcp',
  },
  {
    id: 'conn-m365', name: 'Microsoft 365',
    description: 'Search SharePoint, OneDrive, Outlook, Teams, and calendar data for your work account.',
    icon: 'm365', enabled: false, status: 'ready', category: 'Communication and productivity', provider: 'mcp',
    isVerified: true, section: 'trending',
    capabilities: ['SharePoint', 'OneDrive', 'Outlook', 'Teams'],
    config: { connectionType: 'mcp', providerName: 'Microsoft 365', mcpUrl: 'https://microsoft365.mcp.claude.com/mcp', toolAccess: 'auto', disabledTools: [] },
    url: 'https://microsoft365.mcp.claude.com/mcp',
  },
  {
    id: 'conn-canva', name: 'Canva',
    description: 'Search, create, edit, autofill, and export Canva designs.',
    icon: 'canva', enabled: false, status: 'ready', category: 'Design', provider: 'mcp',
    isVerified: true, section: 'trending',
    capabilities: ['Search Designs', 'Generate Designs', 'Edit', 'Export'],
    config: { connectionType: 'mcp', providerName: 'Canva', mcpUrl: 'https://mcp.canva.com/mcp', toolAccess: 'auto', disabledTools: [], oauthAuthorizationEndpoint: 'https://mcp.canva.com/authorize', oauthTokenEndpoint: 'https://mcp.canva.com/token', oauthTokenEndpointAuthMethod: 'client_secret_post' },
    url: 'https://mcp.canva.com/mcp',
  },
  {
    id: 'conn-dropbox', name: 'Dropbox',
    description: 'Search, read, organize, upload, move, and share Dropbox content.',
    icon: 'dropbox', enabled: false, status: 'ready', category: 'Data and productivity', provider: 'mcp',
    isVerified: true, section: 'trending',
    capabilities: ['Search', 'Files', 'Folders', 'Sharing'],
    config: { connectionType: 'mcp', providerName: 'Dropbox', mcpUrl: 'https://mcp.dropbox.com/claude_app_mcp', toolAccess: 'auto', disabledTools: [] },
    url: 'https://mcp.dropbox.com/claude_app_mcp',
  },
  {
    id: 'conn-atlassian', name: 'Atlassian',
    description: 'Search and update Jira, Confluence, Bitbucket, Loom, and related Atlassian work.',
    icon: 'atlassian', enabled: false, status: 'ready', category: 'Developer tools', provider: 'mcp',
    isVerified: true, section: 'trending',
    capabilities: ['Jira', 'Confluence', 'Bitbucket', 'Loom'],
    config: { connectionType: 'mcp', providerName: 'Atlassian', mcpUrl: 'https://mcp.atlassian.com/v2/mcp', toolAccess: 'auto', disabledTools: [] },
    url: 'https://mcp.atlassian.com/v2/mcp',
  },
];

export function cloneNativeConnectors(): Connector[] {
  return NATIVE_CONNECTORS.map((connector) => ({
    ...connector,
    config: { ...(connector.config || {}), disabledTools: [...(connector.config?.disabledTools || [])] },
  }));
}
