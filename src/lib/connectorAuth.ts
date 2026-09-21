import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

export interface ConnectorAccountInfo {
  id?: string;
  email?: string;
  name?: string;
  username?: string;
  label?: string;
}

export interface StoredConnectorConnection {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scope?: string;
  expiresAt?: number;
  account?: ConnectorAccountInfo;
  connectedAt: number;
}

export interface DirectOAuthConfig {
  connectorIds: string[];
  provider: 'google' | 'github' | 'slack' | 'notion' | 'microsoft';
  authorizationEndpoint: string;
  tokenEndpoint: string;
  clientIdEnv: string[];
  clientSecretEnv: string[];
  scopes?: string;
  extraAuthorizeParams?: Record<string, string>;
  tokenAuth?: 'body' | 'basic';
  profileUrl?: string;
}

const GOOGLE_SCOPES: Record<string, string> = {
  'conn-gmail': 'openid email profile https://www.googleapis.com/auth/gmail.modify',
  'conn-gdrive': 'openid email profile https://www.googleapis.com/auth/drive',
  'conn-gcalendar': 'openid email profile https://www.googleapis.com/auth/calendar',
  'conn-youtube': 'openid email profile https://www.googleapis.com/auth/youtube.readonly',
};

const DIRECT_OAUTH_CONFIGS: DirectOAuthConfig[] = [
  {
    connectorIds: ['conn-gmail', 'conn-gdrive', 'conn-gcalendar', 'conn-youtube'],
    provider: 'google',
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    clientIdEnv: ['GOOGLE_OAUTH_CLIENT_ID', 'GOOGLE_CLIENT_ID', 'NEXT_PUBLIC_GOOGLE_CLIENT_ID'],
    clientSecretEnv: ['GOOGLE_OAUTH_CLIENT_SECRET', 'GOOGLE_CLIENT_SECRET'],
    tokenAuth: 'body',
    profileUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    extraAuthorizeParams: {
      access_type: 'offline',
      prompt: 'consent select_account',
      include_granted_scopes: 'true',
    },
  },
  {
    connectorIds: ['conn-github'],
    provider: 'github',
    authorizationEndpoint: 'https://github.com/login/oauth/authorize',
    tokenEndpoint: 'https://github.com/login/oauth/access_token',
    clientIdEnv: ['GITHUB_OAUTH_CLIENT_ID', 'GITHUB_CLIENT_ID'],
    clientSecretEnv: ['GITHUB_OAUTH_CLIENT_SECRET', 'GITHUB_CLIENT_SECRET'],
    scopes: 'read:user user:email repo',
    tokenAuth: 'body',
    profileUrl: 'https://api.github.com/user',
  },
  {
    connectorIds: ['conn-slack'],
    provider: 'slack',
    authorizationEndpoint: 'https://slack.com/oauth/v2/authorize',
    tokenEndpoint: 'https://slack.com/api/oauth.v2.access',
    clientIdEnv: ['SLACK_CLIENT_ID'],
    clientSecretEnv: ['SLACK_CLIENT_SECRET'],
    scopes: 'chat:write,channels:read,groups:read,users:read',
    tokenAuth: 'body',
    profileUrl: 'https://slack.com/api/auth.test',
  },
  {
    connectorIds: ['conn-notion'],
    provider: 'notion',
    authorizationEndpoint: 'https://api.notion.com/v1/oauth/authorize',
    tokenEndpoint: 'https://api.notion.com/v1/oauth/token',
    clientIdEnv: ['NOTION_CLIENT_ID'],
    clientSecretEnv: ['NOTION_CLIENT_SECRET'],
    tokenAuth: 'basic',
  },
  {
    connectorIds: ['conn-m365'],
    provider: 'microsoft',
    authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
    tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
    clientIdEnv: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_OAUTH_CLIENT_ID'],
    clientSecretEnv: ['MICROSOFT_CLIENT_SECRET', 'MICROSOFT_OAUTH_CLIENT_SECRET'],
    scopes: 'openid profile email offline_access User.Read Mail.ReadWrite Files.ReadWrite.All Calendars.ReadWrite',
    tokenAuth: 'body',
    profileUrl: 'https://graph.microsoft.com/v1.0/me',
  },
];

export function getDirectOAuthConfig(connectorId: string): DirectOAuthConfig | undefined {
  return DIRECT_OAUTH_CONFIGS.find((config) => config.connectorIds.includes(connectorId));
}

export function getDirectOAuthConnectorIds(): string[] {
  return DIRECT_OAUTH_CONFIGS.flatMap((config) => config.connectorIds);
}

function readEnv(names: string[]): string {
  for (const name of names) {
    const value = String(process.env[name] || '').trim();
    if (value) return value;
  }
  return '';
}

function getEncryptionSecret(): string {
  const secret =
    String(process.env.CONNECTOR_ENCRYPTION_SECRET || '').trim() ||
    String(process.env.NEXTAUTH_SECRET || '').trim();

  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') return 'sameer-local-development-secret-change-me';
  throw new Error('CONNECTOR_ENCRYPTION_SECRET is required in production.');
}

function keyFromSecret(): Buffer {
  return createHash('sha256').update(getEncryptionSecret()).digest();
}

export function sealConnection(connection: StoredConnectorConnection): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFromSecret(), iv);
  const plaintext = Buffer.from(JSON.stringify(connection), 'utf8');
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString('base64url');
}

export function unsealConnection(value: string | undefined): StoredConnectorConnection | null {
  if (!value) return null;
  try {
    const raw = Buffer.from(value, 'base64url');
    if (raw.length < 29) return null;
    const iv = raw.subarray(0, 12);
    const tag = raw.subarray(12, 28);
    const encrypted = raw.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', keyFromSecret(), iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
    const parsed = JSON.parse(plaintext);
    if (!parsed?.accessToken || typeof parsed.accessToken !== 'string') return null;
    return parsed as StoredConnectorConnection;
  } catch {
    return null;
  }
}

export function getConnectorCookieName(connectorId: string): string {
  return 'sameer_connector_' + String(connectorId || '').replace(/[^a-zA-Z0-9_-]/g, '_');
}

function parseCookieHeader(cookieHeader: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const segment of String(cookieHeader || '').split(';')) {
    const idx = segment.indexOf('=');
    if (idx <= 0) continue;
    const key = segment.slice(0, idx).trim();
    const value = segment.slice(idx + 1).trim();
    if (key) result[key] = decodeURIComponent(value);
  }
  return result;
}

export function getConnectionFromCookieHeader(
  cookieHeader: string,
  connectorId: string
): StoredConnectorConnection | null {
  return unsealConnection(parseCookieHeader(cookieHeader)[getConnectorCookieName(connectorId)]);
}

export function getAllConnectionsFromCookieHeader(
  cookieHeader: string
): Record<string, StoredConnectorConnection> {
  const cookies = parseCookieHeader(cookieHeader);
  const result: Record<string, StoredConnectorConnection> = {};

  for (const connectorId of getDirectOAuthConnectorIds()) {
    const connection = unsealConnection(cookies[getConnectorCookieName(connectorId)]);
    if (connection) result[connectorId] = connection;
  }

  return result;
}

export function getClientCredentials(connectorId: string): { clientId: string; clientSecret: string } {
  const config = getDirectOAuthConfig(connectorId);
  if (!config) throw new Error(`No direct OAuth provider is configured for ${connectorId}.`);

  const clientId = readEnv(config.clientIdEnv);
  const clientSecret = readEnv(config.clientSecretEnv);

  if (!clientId) {
    throw new Error(`Missing OAuth client ID. Set ${config.clientIdEnv.join(' or ')} in Vercel.`);
  }
  if (!clientSecret) {
    throw new Error(`Missing OAuth client secret. Set ${config.clientSecretEnv.join(' or ')} in Vercel.`);
  }

  return { clientId, clientSecret };
}

export function buildDirectOAuthUrl(
  connectorId: string,
  redirectUri: string,
  state: string
): string {
  const config = getDirectOAuthConfig(connectorId);
  if (!config) throw new Error(`No direct OAuth provider is configured for ${connectorId}.`);

  const { clientId } = getClientCredentials(connectorId);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    state,
  });

  const scopes = config.provider === 'google'
    ? GOOGLE_SCOPES[connectorId]
    : config.scopes;

  if (scopes) params.set('scope', scopes);

  if (config.extraAuthorizeParams) {
    for (const [key, value] of Object.entries(config.extraAuthorizeParams)) {
      params.set(key, value);
    }
  }

  if (config.provider === 'notion') params.set('owner', 'user');

  return config.authorizationEndpoint + '?' + params.toString();
}

async function parseTokenResponse(response: Response): Promise<any> {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json().catch(() => ({}));
  }

  const text = await response.text();
  return Object.fromEntries(new URLSearchParams(text));
}

export async function exchangeOAuthCode(
  connectorId: string,
  code: string,
  redirectUri: string
): Promise<StoredConnectorConnection> {
  const config = getDirectOAuthConfig(connectorId);
  if (!config) throw new Error(`No direct OAuth provider is configured for ${connectorId}.`);

  const { clientId, clientSecret } = getClientCredentials(connectorId);
  const params = new URLSearchParams({
    code,
    client_id: clientId,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });

  if (config.provider === 'notion') {
    const basic = Buffer.from(clientId + ':' + clientSecret).toString('base64');
    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + basic,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
      }),
      cache: 'no-store',
    });
    const data = await parseTokenResponse(response);
    if (!response.ok || data.error) {
      throw new Error(String(data.error_description || data.error || 'Notion OAuth token exchange failed.'));
    }
    return normalizeTokenResponse(data);
  }

  params.set('client_secret', clientSecret);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
    cache: 'no-store',
  });

  const data = await parseTokenResponse(response);
  if (!response.ok || data.error) {
    throw new Error(String(data.error_description || data.error || `${config.provider} OAuth token exchange failed.`));
  }

  return normalizeTokenResponse(data);
}

function normalizeTokenResponse(data: any): StoredConnectorConnection {
  const expiresIn = Number(data.expires_in);
  return {
    accessToken: String(data.access_token || ''),
    refreshToken: data.refresh_token ? String(data.refresh_token) : undefined,
    tokenType: data.token_type ? String(data.token_type) : undefined,
    scope: data.scope ? String(data.scope) : undefined,
    expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? Date.now() + expiresIn * 1000 : undefined,
    connectedAt: Date.now(),
  };
}

async function refreshConnection(
  connectorId: string,
  connection: StoredConnectorConnection
): Promise<StoredConnectorConnection | null> {
  if (!connection.refreshToken) return null;
  const config = getDirectOAuthConfig(connectorId);
  if (!config) return null;

  try {
    const { clientId, clientSecret } = getClientCredentials(connectorId);
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: connection.refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    const response = await fetch(config.tokenEndpoint, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      cache: 'no-store',
    });

    const data = await parseTokenResponse(response);
    if (!response.ok || data.error || !data.access_token) return null;

    const refreshed = normalizeTokenResponse(data);
    return {
      ...connection,
      ...refreshed,
      refreshToken: refreshed.refreshToken || connection.refreshToken,
      account: connection.account,
      connectedAt: connection.connectedAt,
    };
  } catch {
    return null;
  }
}

export async function getValidConnection(
  connectorId: string,
  cookieHeader: string
): Promise<{ connection: StoredConnectorConnection | null; refreshed: boolean }> {
  const current = getConnectionFromCookieHeader(cookieHeader, connectorId);
  if (!current) return { connection: null, refreshed: false };

  const expiry = Number(current.expiresAt || 0);
  if (!expiry || expiry > Date.now() + 60_000) return { connection: current, refreshed: false };

  const refreshed = await refreshConnection(connectorId, current);
  if (!refreshed) return { connection: null, refreshed: false };
  return { connection: refreshed, refreshed: true };
}

export async function fetchConnectorAccount(
  connectorId: string,
  accessToken: string,
  existing?: ConnectorAccountInfo
): Promise<ConnectorAccountInfo | undefined> {
  const config = getDirectOAuthConfig(connectorId);
  if (!config) return existing;

  try {
    if (config.provider === 'notion') return existing;

    const response = await fetch(config.profileUrl!, {
      headers: {
        Authorization: 'Bearer ' + accessToken,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });
    if (!response.ok) return existing;

    const data = await response.json().catch(() => ({}));

    if (config.provider === 'google') {
      return {
        id: data.sub,
        email: data.email,
        name: data.name,
        label: data.email || data.name,
      };
    }
    if (config.provider === 'github') {
      let email = data.email;
      if (!email) {
        const emailRes = await fetch('https://api.github.com/user/emails', {
          headers: {
            Authorization: 'Bearer ' + accessToken,
            Accept: 'application/vnd.github+json',
            'User-Agent': 'Sameer-AI-Workspace',
          },
          cache: 'no-store',
        });
        if (emailRes.ok) {
          const emails = await emailRes.json().catch(() => []);
          const primary = Array.isArray(emails)
            ? emails.find((e: any) => e.primary && e.verified) || emails.find((e: any) => e.verified)
            : null;
          email = primary?.email;
        }
      }
      return {
        id: data.id ? String(data.id) : undefined,
        email: email || undefined,
        name: data.name || data.login,
        username: data.login,
        label: data.login || email || data.name,
      };
    }
    if (config.provider === 'slack') {
      return {
        id: data.user_id || data.team_id,
        name: data.user || data.team || undefined,
        username: data.user || undefined,
        label: data.user || data.team || 'Slack workspace',
      };
    }
    if (config.provider === 'microsoft') {
      return {
        id: data.id,
        email: data.mail || data.userPrincipalName,
        name: data.displayName,
        label: data.mail || data.userPrincipalName || data.displayName,
      };
    }
  } catch {
    return existing;
  }

  return existing;
}

export function connectionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 90,
  };
}

export function oauthStateCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 10,
  };
}

export function createOAuthState(connectorId: string): { state: string; cookieValue: string } {
  const state = randomBytes(24).toString('base64url');
  return { state, cookieValue: connectorId + ':' + state };
}

export function parseOAuthStateCookie(value: string | undefined): { connectorId: string; state: string } | null {
  if (!value) return null;
  const separator = value.indexOf(':');
  if (separator <= 0) return null;
  return {
    connectorId: value.slice(0, separator),
    state: value.slice(separator + 1),
  };
}

export function getProviderAccountLabel(connection?: StoredConnectorConnection | null): string {
  const account = connection?.account;
  return String(account?.label || account?.email || account?.username || account?.name || '').trim();
}
