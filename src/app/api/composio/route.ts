import { NextRequest, NextResponse } from 'next/server';
import {
  listConnectedAccounts,
  initiateAppConnection,
  executeComposioAction,
  getComposioApiKey,
  COMPOSIO_APP_MAP,
} from '@/lib/composio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

async function resolveKey() {
  return getComposioApiKey();
}

function resolveUserId(req: NextRequest): string {
  return req.cookies.get('sameer_composio_user_id')?.value || `sameer_${crypto.randomUUID()}`;
}

function withUserCookie(response: NextResponse, userId: string): NextResponse {
  response.cookies.set('sameer_composio_user_id', userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

async function accountBelongsToUser(apiKey: string, userId: string, accountId: string): Promise<boolean> {
  try {
    const accounts = await listConnectedAccounts(apiKey, userId);
    return accounts.some((account) => String(account?.id || '') === String(accountId || ''));
  } catch {
    return false;
  }
}


export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const entityId = resolveUserId(req);
    const apiKey = await resolveKey();

    if (!apiKey) {
      return withUserCookie(NextResponse.json({
        configured: false,
        apiKeyConfigured: false,
        connectedAccounts: [],
        supportedApps: Object.keys(COMPOSIO_APP_MAP),
        message: 'COMPOSIO_API_KEY is not configured.',
      }), entityId);
    }

    const accounts = await listConnectedAccounts(apiKey, entityId);
    return withUserCookie(NextResponse.json({
      configured: true,
      apiKeyConfigured: true,
      userId: entityId,
      connectedAccounts: accounts,
      supportedApps: Object.keys(COMPOSIO_APP_MAP),
    }), entityId);
  } catch (err: any) {
    return NextResponse.json({ configured: false, error: err?.message || 'Composio status lookup failed.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      action,
      appName,
      redirectUrl,
      actionName,
      input,
      connectedAccountId,
    } = body || {};

    const entityId = resolveUserId(req);
    const apiKey = await resolveKey();
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Composio is not configured. Set COMPOSIO_API_KEY in Vercel Environment Variables.',
      }, { status: 503 });
    }

    if (action === 'connect') {
      if (!appName || !entityId) {
        return NextResponse.json({ success: false, error: 'appName is required.' }, { status: 400 });
      }
      const result = await initiateAppConnection(
        apiKey,
        String(appName),
        String(entityId),
        redirectUrl || new URL('/api/composio/callback', req.url).toString()
      );
      return withUserCookie(NextResponse.json(result, { status: result.success ? 200 : 502 }), entityId);
    }

    if (action === 'disconnect') {
      if (!connectedAccountId) {
        return NextResponse.json({ success: false, error: 'connectedAccountId is required.' }, { status: 400 });
      }
      if (!(await accountBelongsToUser(apiKey, entityId, String(connectedAccountId)))) {
        return NextResponse.json({ success: false, error: 'Connected account is not owned by this app user.' }, { status: 403 });
      }
      const res = await fetch(
        'https://backend.composio.dev/api/v3.1/connected_accounts/' + encodeURIComponent(String(connectedAccountId)),
        {
          method: 'DELETE',
          headers: { 'x-api-key': apiKey, 'Content-Type': 'application/json' },
          cache: 'no-store',
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return NextResponse.json({ success: false, error: data?.error?.message || data?.message || 'Composio disconnect failed.' }, { status: res.status });
      }
      return NextResponse.json({ success: true, connectedAccountId });
    }

    if (action === 'execute') {
      if (!actionName) {
        return NextResponse.json({ success: false, error: 'actionName is required.' }, { status: 400 });
      }
      if (connectedAccountId && !(await accountBelongsToUser(apiKey, entityId, String(connectedAccountId)))) {
        return NextResponse.json({ success: false, error: 'Connected account is not owned by this app user.' }, { status: 403 });
      }
      const result = await executeComposioAction(
        apiKey,
        String(actionName),
        input || {},
        connectedAccountId,
        String(entityId)
      );
      return NextResponse.json(result, { status: result.success ? 200 : 502 });
    }

    return NextResponse.json({ success: false, error: 'Unknown Composio action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || 'Composio request failed.' }, { status: 500 });
  }
}
