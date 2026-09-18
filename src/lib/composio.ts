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

const COMPOSIO_API_BASE = 'https://backend.composio.dev/api/v1';

export async function getComposioApiKey(userKey?: string): Promise<string | null> {
  return (
    userKey ||
    process.env.COMPOSIO_API_KEY ||
    process.env.NEXT_PUBLIC_COMPOSIO_API_KEY ||
    null
  );
}

export async function listConnectedAccounts(
  apiKey: string,
  entityId?: string
): Promise<ComposioConnectedAccount[]> {
  try {
    const url = `${COMPOSIO_API_BASE}/connectedAccounts`;

    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      return [];
    }

    const data = await res.json();
    const rawList = Array.isArray(data.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : Array.isArray(data.connectedAccounts)
      ? data.connectedAccounts
      : [];

    return rawList.map((item: any) => {
      const email =
        item.params?.email ||
        item.connectionParams?.email ||
        item.connectionParams?.headers?.['user_email'] ||
        item.connectionParams?.val?.email ||
        item.user_email ||
        item.data?.email ||
        (item.accountIdentifier && item.accountIdentifier.includes('@') ? item.accountIdentifier : undefined) ||
        (item.userUuid && item.userUuid.includes('@') ? item.userUuid : undefined) ||
        (item.clientUniqueUserId && item.clientUniqueUserId.includes('@') ? item.clientUniqueUserId : undefined) ||
        (typeof item.label === 'string' && item.label.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1]);

      return {
        id: item.id,
        appUniqueId: item.appUniqueId || item.appName || item.app?.name || '',
        appName: item.appName || item.appUniqueId || item.app?.name || '',
        status: item.status,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        userUuid: item.userUuid,
        email,
        accountIdentifier: item.accountIdentifier || email,
      };
    });
  } catch (err) {
    return [];
  }
}

export async function initiateAppConnection(
  apiKey: string,
  appName: string,
  entityId: string = 'default',
  redirectUrl?: string
): Promise<{ success: boolean; redirectUrl?: string; connectionId?: string; error?: string }> {
  try {
    const composioAppName = COMPOSIO_APP_MAP[appName] || appName;

    const res = await fetch(`${COMPOSIO_API_BASE}/connectedAccounts`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: composioAppName,
        userUuid: entityId,
        redirectUrl: redirectUrl || 'https://claude-enterprise-app.vercel.app',
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || `Failed to initiate Composio connection for ${appName}`,
      };
    }

    return {
      success: true,
      redirectUrl: data.redirectUrl || data.connectionUrl || data.url,
      connectionId: data.connectionId || data.id,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error communicating with Composio API',
    };
  }
}

export async function executeComposioAction(
  apiKey: string,
  actionName: string,
  input: Record<string, any>,
  connectedAccountId?: string,
  entityId: string = 'default'
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    const body: Record<string, any> = {
      input,
      entityId,
    };

    if (connectedAccountId) {
      body.connectedAccountId = connectedAccountId;
    }

    const res = await fetch(`${COMPOSIO_API_BASE}/actions/${encodeURIComponent(actionName)}/execute`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: data.message || `Failed to execute Composio action ${actionName}`,
      };
    }

    return {
      success: true,
      data: data.response_data || data.data || data,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Error executing Composio action',
    };
  }
}
