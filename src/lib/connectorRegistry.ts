/**
 * Provider-neutral connector registry.
 *
 * Built-in connectors use their own first-party web URLs. This file intentionally
 * contains no Composio/Zapier runtime dependency, so a future provider adapter can
 * be attached without changing the connector UI or session model.
 */

export type ConnectorConnectionType =
  | 'direct'
  | 'mcp'
  | 'webhook'
  | 'zapier'
  | 'composio'
  | 'custom-api';

export interface ConnectorRegistryEntry {
  id: string;
  url: string;
  connectionType: ConnectorConnectionType;
  provider: 'direct' | 'mcp' | 'zapier' | 'composio' | 'custom-api';
  actionLabel?: string;
  authUrl?: string;
}

export const DIRECT_CONNECTOR_REGISTRY: Record<string, ConnectorRegistryEntry> = {
  'conn-gmail': {
    id: 'conn-gmail',
    url: 'https://mail.google.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Gmail',
  },
  'conn-gdrive': {
    id: 'conn-gdrive',
    url: 'https://drive.google.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Drive',
  },
  'conn-gcalendar': {
    id: 'conn-gcalendar',
    url: 'https://calendar.google.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Calendar',
  },
  'conn-github': {
    id: 'conn-github',
    url: 'https://github.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open GitHub',
  },
  'conn-youtube': {
    id: 'conn-youtube',
    url: 'https://studio.youtube.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open YouTube Studio',
  },
  'conn-instagram': {
    id: 'conn-instagram',
    url: 'https://www.instagram.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Instagram',
  },
  'conn-facebook': {
    id: 'conn-facebook',
    url: 'https://business.facebook.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Meta Business',
  },
  'conn-twitter': {
    id: 'conn-twitter',
    url: 'https://x.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open X',
  },
  'conn-linkedin': {
    id: 'conn-linkedin',
    url: 'https://www.linkedin.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open LinkedIn',
  },
  'conn-tiktok': {
    id: 'conn-tiktok',
    url: 'https://www.tiktok.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open TikTok',
  },
  'conn-slack': {
    id: 'conn-slack',
    url: 'https://app.slack.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Slack',
  },
  'conn-notion': {
    id: 'conn-notion',
    url: 'https://www.notion.so/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Notion',
  },
  'conn-figma': {
    id: 'conn-figma',
    url: 'https://www.figma.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Figma',
  },
  'conn-canva': {
    id: 'conn-canva',
    url: 'https://www.canva.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Canva',
  },
  'conn-m365': {
    id: 'conn-m365',
    url: 'https://www.office.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Microsoft 365',
  },
  'conn-rovo': {
    id: 'conn-rovo',
    url: 'https://www.atlassian.com/software/rovo',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Rovo',
  },
  'conn-hubspot': {
    id: 'conn-hubspot',
    url: 'https://app.hubspot.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open HubSpot',
  },
  'conn-asana': {
    id: 'conn-asana',
    url: 'https://app.asana.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Asana',
  },
  'conn-linear': {
    id: 'conn-linear',
    url: 'https://linear.app/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Linear',
  },
  'conn-shopify': {
    id: 'conn-shopify',
    url: 'https://admin.shopify.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Shopify',
  },
  'conn-salesforce': {
    id: 'conn-salesforce',
    url: 'https://login.salesforce.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Salesforce',
  },
  'conn-apollo': {
    id: 'conn-apollo',
    url: 'https://app.apollo.io/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Apollo',
  },
  'conn-zoominfo': {
    id: 'conn-zoominfo',
    url: 'https://www.zoominfo.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open ZoomInfo',
  },
  'conn-reddit': {
    id: 'conn-reddit',
    url: 'https://www.reddit.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Reddit',
  },
  'conn-discord': {
    id: 'conn-discord',
    url: 'https://discord.com/app',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Discord',
  },
  'conn-telegram': {
    id: 'conn-telegram',
    url: 'https://web.telegram.org/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Telegram',
  },
  'conn-whatsapp': {
    id: 'conn-whatsapp',
    url: 'https://web.whatsapp.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open WhatsApp',
  },
  'conn-gamma': {
    id: 'conn-gamma',
    url: 'https://gamma.app/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Gamma',
  },
  'conn-windsor': {
    id: 'conn-windsor',
    url: 'https://windsor.ai/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Windsor.ai',
  },
  'conn-vanguard': {
    id: 'conn-vanguard',
    url: 'https://investor.vanguard.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Vanguard',
  },
  'conn-blackrock': {
    id: 'conn-blackrock',
    url: 'https://www.blackrock.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open BlackRock',
  },
  'conn-rome2rio': {
    id: 'conn-rome2rio',
    url: 'https://www.rome2rio.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Rome2Rio',
  },
  'conn-helena': {
    id: 'conn-helena',
    url: 'https://enrichlabs.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Helena',
  },
  'conn-links': {
    id: 'conn-links',
    url: 'https://links.com/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Links',
  },
  'conn-maryland': {
    id: 'conn-maryland',
    url: 'https://www.maryland.gov/',
    connectionType: 'direct',
    provider: 'direct',
    actionLabel: 'Open Maryland',
  },
};

export function getConnectorDefinition(id: string): ConnectorRegistryEntry | undefined {
  return DIRECT_CONNECTOR_REGISTRY[String(id || '').trim()];
}

export function getConnectorLaunchUrl(connector: {
  id: string;
  url?: string;
  config?: Record<string, any>;
}): string | undefined {
  const authUrl = String(connector?.config?.authUrl || '').trim();
  if (authUrl) return authUrl;

  const configuredUrl = String(connector?.url || '').trim();
  if (configuredUrl) return configuredUrl;

  return getConnectorDefinition(connector?.id)?.url;
}
