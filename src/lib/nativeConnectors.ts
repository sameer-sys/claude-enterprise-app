import type { Connector } from '@/types/chat';

export const NATIVE_CONNECTORS: Connector[] = [
  {
    id: 'conn-github',
    name: 'GitHub',
    description: 'Search repositories, issues, pull requests, code, and automate workflows with your GitHub account.',
    icon: 'github',
    enabled: true,
    status: 'connected',
    category: 'Developer tools',
    provider: 'mcp',
    isVerified: true,
    section: 'top',
    capabilities: ['Repositories', 'Issues', 'Pull Requests', 'Code Search', 'Branches', 'Commits'],
    config: {
      connectionType: 'mcp',
      providerName: 'GitHub',
      mcpUrl: 'https://api.githubcopilot.com/mcp/',
      toolAccess: 'auto',
      disabledTools: [],
      oauthClientId: process.env.GITHUB_OAUTH_CLIENT_ID || 'Ov23linTnwGsoApz1U9g',
      oauthClientSecret: process.env.GITHUB_OAUTH_CLIENT_SECRET || '',
      authToken: (process.env.GITHUB_PERSONAL_ACCESS_TOKEN || '').replace(/^[.\s"']+|[.\s"']+$/g, ''),
      oauthAuthorizationEndpoint: 'https://github.com/login/oauth/authorize',
      oauthTokenEndpoint: 'https://github.com/login/oauth/access_token',
      oauthTokenEndpointAuthMethod: 'client_secret_post',
      resource: 'https://api.githubcopilot.com/mcp/',
    },
    url: 'https://api.githubcopilot.com/mcp/',
  },
];

export function cloneNativeConnectors(): Connector[] {
  return JSON.parse(JSON.stringify(NATIVE_CONNECTORS));
}
