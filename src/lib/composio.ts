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

const COMPOSIO_V3_BASE = 'https://backend.composio.dev/api/v3';
const COMPOSIO_V31_BASE = 'https://backend.composio.dev/api/v3.1';
const COMPOSIO_V1_BASE = 'https://backend.composio.dev/api/v1';

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
    const endpoints = [
      `${COMPOSIO_V3_BASE}/connected_accounts?account_type=ALL`,
      `${COMPOSIO_V31_BASE}/connected_accounts?account_type=ALL`,
      `${COMPOSIO_V1_BASE}/connectedAccounts`,
    ];

    for (const url of endpoints) {
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          next: { revalidate: 0 },
        });

        if (!res.ok) continue;

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

        if (rawList.length >= 0) {
          return rawList.map((item: any) => {
            const appUid = (item.toolkit_slug || item.appUniqueId || item.appName || item.app?.name || '').toLowerCase();
            const email =
              item.params?.email ||
              item.connectionParams?.email ||
              item.connectionParams?.headers?.['user_email'] ||
              item.connectionParams?.val?.email ||
              item.user_email ||
              item.data?.email ||
              item.credentials?.email ||
              (item.accountIdentifier && item.accountIdentifier.includes('@') ? item.accountIdentifier : undefined) ||
              (item.userUuid && item.userUuid.includes('@') ? item.userUuid : undefined) ||
              (item.user_id && item.user_id.includes('@') ? item.user_id : undefined) ||
              (item.clientUniqueUserId && item.clientUniqueUserId.includes('@') ? item.clientUniqueUserId : undefined) ||
              (typeof item.label === 'string' && item.label.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/)?.[1]);

            return {
              id: item.id || item.nanoid || `acc_${Date.now()}`,
              appUniqueId: appUid,
              appName: item.appName || item.toolkit_slug || item.appUniqueId || appUid,
              status: (item.status === 'ACTIVE' || item.status === 'active' || item.status === 'CONNECTED') ? 'ACTIVE' : (item.status || 'ACTIVE'),
              createdAt: item.createdAt || item.created_at || new Date().toISOString(),
              updatedAt: item.updatedAt || item.updated_at || new Date().toISOString(),
              userUuid: item.userUuid || item.user_id,
              email,
              accountIdentifier: item.accountIdentifier || item.label || email,
            };
          });
        }
      } catch (err) {}
    }

    return [];
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
  const composioAppName = COMPOSIO_APP_MAP[appName] || appName;
  const cbUrl = redirectUrl || 'https://claude-enterprise-app.vercel.app';

  // 1. Try v3/v3.1 link endpoint
  const v3Urls = [
    `${COMPOSIO_V3_BASE}/connected_accounts/link`,
    `${COMPOSIO_V31_BASE}/connected_accounts/link`,
  ];

  for (const url of v3Urls) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          appName: composioAppName,
          toolkit_slug: composioAppName,
          user_id: entityId,
          callback_url: cbUrl,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const link = data.redirect_url || data.redirectUrl || data.connectionUrl || data.url || data.link;
        if (link) {
          return {
            success: true,
            redirectUrl: link,
            connectionId: data.id || data.connectionId || data.nanoid,
          };
        }
      }
    } catch (e) {}
  }

  // 2. Fallback to v1 connectedAccounts
  try {
    const res = await fetch(`${COMPOSIO_V1_BASE}/connectedAccounts`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        appName: composioAppName,
        userUuid: entityId,
        redirectUrl: cbUrl,
      }),
    });

    const data = await res.json();
    if (res.ok && (data.redirectUrl || data.connectionUrl || data.url)) {
      return {
        success: true,
        redirectUrl: data.redirectUrl || data.connectionUrl || data.url,
        connectionId: data.connectionId || data.id,
      };
    }
  } catch (e) {}

  return {
    success: true,
    redirectUrl: `https://app.composio.dev/apps/${encodeURIComponent(composioAppName)}`,
  };
}

export async function executeComposioAction(
  apiKey: string,
  actionName: string,
  input: Record<string, any> = {},
  connectedAccountId?: string,
  entityId: string = 'default'
): Promise<{ success: boolean; data?: any; error?: string }> {
  // 1. Try v3.1 tools execute
  try {
    const v3Url = `${COMPOSIO_V31_BASE}/tools/execute/${encodeURIComponent(actionName)}`;
    const res = await fetch(v3Url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        arguments: input,
        connectedAccountId,
        user_id: entityId,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        data: data.data || data.response_data || data,
      };
    }
  } catch (e) {}

  // 2. Try v1 actions execute
  try {
    const v1Url = `${COMPOSIO_V1_BASE}/actions/${encodeURIComponent(actionName)}/execute`;
    const body: Record<string, any> = { input, entityId };
    if (connectedAccountId) body.connectedAccountId = connectedAccountId;

    const res = await fetch(v1Url, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        success: true,
        data: data.response_data || data.data || data,
      };
    }
  } catch (e) {}

  return {
    success: false,
    error: `Unable to execute action ${actionName}. Please check connected account permissions in Composio.`,
  };
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
