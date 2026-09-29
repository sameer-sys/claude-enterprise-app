import { NextRequest, NextResponse } from 'next/server';
import {
  COMPOSIO_APP_CATALOG,
  createConnectLink,
  ensureComposioUserId,
  hasComposioPlatformKey,
  listConnectedAccounts,
} from '@/lib/composioPlatform';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function setUserCookie(response: NextResponse, userId: string): NextResponse {
  response.cookies.set('sameer_composio_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365 * 5,
  });
  return response;
}

function getUserId(req: NextRequest): string {
  return ensureComposioUserId(req.cookies.get('sameer_composio_user_id')?.value);
}

function catalogWithStatus(accounts: any[]) {
  const activeByToolkit = new Map<string, any[]>();
  for (const account of accounts) {
    const slug = String(account?.toolkit?.slug || account?.toolkit_slug || '').toLowerCase();
    if (!slug) continue;
    const current = activeByToolkit.get(slug) || [];
    current.push({
      id: account?.id ? String(account.id) : undefined,
      alias: account?.alias ? String(account.alias) : undefined,
      status: String(account?.status || 'ACTIVE'),
      userId: account?.user_id ? String(account.user_id) : undefined,
    });
    activeByToolkit.set(slug, current);
  }

  return COMPOSIO_APP_CATALOG.map((app) => ({
    ...app,
    connected: (activeByToolkit.get(app.slug.toLowerCase()) || []).length > 0,
    accounts: activeByToolkit.get(app.slug.toLowerCase()) || [],
  }));
}

export async function GET(req: NextRequest) {
  const userId = getUserId(req);
  if (!hasComposioPlatformKey()) {
    const response = NextResponse.json({
      configured: false,
      userId,
      apps: COMPOSIO_APP_CATALOG.map((app) => ({ ...app, connected: false, accounts: [] })),
      error: 'COMPOSIO_API_KEY is not configured on the server.',
    }, { status: 503 });
    return setUserCookie(response, userId);
  }

  try {
    const accounts = await listConnectedAccounts(userId);
    const response = NextResponse.json({
      configured: true,
      userId,
      apps: catalogWithStatus(accounts),
    });
    return setUserCookie(response, userId);
  } catch (err: any) {
    const response = NextResponse.json({
      configured: false,
      userId,
      apps: COMPOSIO_APP_CATALOG.map((app) => ({ ...app, connected: false, accounts: [] })),
      error: String(err?.message || 'Unable to load connector status.'),
    }, { status: 502 });
    return setUserCookie(response, userId);
  }
}

export async function POST(req: NextRequest) {
  const userId = getUserId(req);

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    if (!hasComposioPlatformKey()) {
      const response = NextResponse.json({
        success: false,
        error: 'COMPOSIO_API_KEY is not configured on the server.',
      }, { status: 503 });
      return setUserCookie(response, userId);
    }

    if (action === 'connect') {
      const toolkit = String(body?.toolkit || '').trim().toLowerCase();
      const app = COMPOSIO_APP_CATALOG.find((item) => item.slug === toolkit);
      if (!app) {
        const response = NextResponse.json({ success: false, error: 'Unsupported connector.' }, { status: 400 });
        return setUserCookie(response, userId);
      }

      const callbackUrl = new URL('/api/composio/callback', req.url).toString();
      const link = await createConnectLink(userId, app.slug, callbackUrl, String(body?.alias || app.name));

      const response = NextResponse.json({
        success: true,
        toolkit: app.slug,
        redirectUrl: link.redirectUrl,
        connectedAccountId: link.connectedAccountId,
      });
      return setUserCookie(response, userId);
    }

    if (action === 'disconnect') {
      const accountId = String(body?.connectedAccountId || '').trim();
      if (!accountId) {
        const response = NextResponse.json({ success: false, error: 'connectedAccountId is required.' }, { status: 400 });
        return setUserCookie(response, userId);
      }

      const upstream = await fetch(
        'https://backend.composio.dev/api/v3.1/connected_accounts/' +
          encodeURIComponent(accountId) +
          '?revoke_on_delete=true',
        {
          method: 'DELETE',
          headers: {
            Accept: 'application/json',
            'x-api-key': String(process.env.COMPOSIO_API_KEY || ''),
          },
          cache: 'no-store',
        }
      );
      const payload = await upstream.json().catch(() => ({}));
      if (!upstream.ok) {
        const response = NextResponse.json({
          success: false,
          error: payload?.error?.message || payload?.message || 'Failed to disconnect the account.',
        }, { status: upstream.status });
        return setUserCookie(response, userId);
      }

      const response = NextResponse.json({ success: true, disconnected: accountId });
      return setUserCookie(response, userId);
    }

    if (action === 'refresh') {
      const accounts = await listConnectedAccounts(userId);
      const response = NextResponse.json({
        success: true,
        userId,
        apps: catalogWithStatus(accounts),
      });
      return setUserCookie(response, userId);
    }

    const response = NextResponse.json({ success: false, error: 'Unsupported connector action.' }, { status: 400 });
    return setUserCookie(response, userId);
  } catch (err: any) {
    const response = NextResponse.json({
      success: false,
      error: String(err?.message || 'Connector request failed.'),
    }, { status: 500 });
    return setUserCookie(response, userId);
  }
}
