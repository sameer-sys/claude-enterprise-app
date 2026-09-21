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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userApiKey = searchParams.get('apiKey') || undefined;
    const entityId = searchParams.get('entityId') || 'default';

    const apiKey = await getComposioApiKey(userApiKey);
    if (!apiKey) {
      return NextResponse.json({
        configured: false,
        message: 'Composio API Key not set. Enter your key from app.composio.dev to activate real connectors.',
        connectedAccounts: [],
      });
    }

    const accounts = await listConnectedAccounts(apiKey, entityId !== 'default' ? entityId : undefined);

    return NextResponse.json({
      configured: true,
      connectedAccounts: accounts,
      supportedApps: Array.from(new Set(Object.values(COMPOSIO_APP_MAP).filter((value) => value !== 'composio'))),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, appName, apiKey: userKey, entityId = 'default', redirectUrl, actionName, input, connectedAccountId } = body;

    const apiKey = await getComposioApiKey(userKey);
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing Composio API Key. Please provide your API key from app.composio.dev',
        },
        { status: 400 }
      );
    }

    if (action === 'connect') {
      if (!appName) {
        return NextResponse.json({ success: false, error: 'appName is required' }, { status: 400 });
      }

      const callback = redirectUrl || (
      new URL('/api/composio/callback', req.url).toString() +
      '?user_id=' + encodeURIComponent(String(entityId || 'default'))
    );
    const result = await initiateAppConnection(apiKey, appName, entityId, callback);
      const response = NextResponse.json(result);
      if (result?.success && result?.redirectUrl) {
        response.cookies.set('sameer_composio_user_id', String(entityId || 'default'), {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 60 * 15,
        });
      }
      return response;
    }

    if (action === 'disconnect') {
      if (!connectedAccountId) {
        return NextResponse.json({ success: false, error: 'connectedAccountId is required' }, { status: 400 });
      }

      try {
        const revokeUrl = `https://backend.composio.dev/api/v3.1/connected_accounts/${encodeURIComponent(String(connectedAccountId))}/revoke`;
        const revokeRes = await fetch(revokeUrl, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
        });

        if (!revokeRes.ok && revokeRes.status !== 404) {
          const errorData = await revokeRes.json().catch(() => ({}));
          return NextResponse.json(
            { success: false, error: errorData?.error?.message || errorData?.message || 'Composio could not revoke the provider grant.' },
            { status: revokeRes.status }
          );
        }
      } catch {}

      const deleteRes = await fetch(
        `https://backend.composio.dev/api/v3.1/connected_accounts/${encodeURIComponent(String(connectedAccountId))}`,
        {
          method: 'DELETE',
          headers: { 'x-api-key': apiKey },
          cache: 'no-store',
        }
      );

      const deleteData = await deleteRes.json().catch(() => ({}));
      if (!deleteRes.ok && deleteRes.status !== 404) {
        return NextResponse.json(
          { success: false, error: deleteData?.error?.message || deleteData?.message || 'Composio could not remove the connected account.' },
          { status: deleteRes.status }
        );
      }

      return NextResponse.json({
        success: true,
        connectedAccountId,
        message: 'Connected account removed.',
      });
    }

    if (action === 'execute') {
      if (!actionName) {
        return NextResponse.json({ success: false, error: 'actionName is required' }, { status: 400 });
      }

      const result = await executeComposioAction(apiKey, actionName, input || {}, connectedAccountId, entityId);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
