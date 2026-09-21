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
      return NextResponse.json(result);
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
