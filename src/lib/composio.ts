/**
 * DEPRECATED: Composio Platform SDK & API key integration.
 * The application has fully migrated to Composio "For You" MCP (OAuth 2.0 PKCE).
 * All live tool discovery and execution are handled via src/lib/composioMcp.ts
 * targeting https://connect.composio.dev/mcp.
 */

export interface ComposioConnectedAccount {
  id: string;
  appUniqueId: string;
  appName: string;
  status: 'ACTIVE' | 'INITIATED' | 'FAILED' | 'DISABLED';
  email?: string;
  accountIdentifier?: string;
}

export const COMPOSIO_SUPPORTED_TOOLKITS: string[] = [
  'github',
  'gmail',
  'google_drive',
  'google_calendar',
  'youtube',
  'slack',
  'notion',
  'discord',
  'linear',
  'asana',
  'jira',
  'trello',
  'hubspot',
  'salesforce',
  'shopify',
  'reddit',
  'telegram',
  'whatsapp',
  'microsoft365',
];

export const COMPOSIO_APP_MAP: Record<string, string> = {
  github: 'github',
  gmail: 'gmail',
  gdrive: 'google_drive',
  googledrive: 'google_drive',
  google_drive: 'google_drive',
  gcalendar: 'google_calendar',
  googlecalendar: 'google_calendar',
  google_calendar: 'google_calendar',
  youtube: 'youtube',
  slack: 'slack',
  notion: 'notion',
  discord: 'discord',
  linear: 'linear',
  asana: 'asana',
  jira: 'jira',
  trello: 'trello',
  hubspot: 'hubspot',
  salesforce: 'salesforce',
  shopify: 'shopify',
  reddit: 'reddit',
  telegram: 'telegram',
  whatsapp: 'whatsapp',
  m365: 'microsoft365',
  microsoft365: 'microsoft365',
};
