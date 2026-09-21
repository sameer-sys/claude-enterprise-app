import { NextRequest, NextResponse } from 'next/server';
import { getConnectorLaunchUrl } from '@/lib/connectorRegistry';
import {
  buildDirectOAuthUrl,
  createOAuthState,
  getConnectorCookieName,
  getDirectOAuthConfig,
  oauthStateCookieOptions,
} from '@/lib/connectorAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const connectorId = String(new URL(req.url).searchParams.get('connector') || '').trim();
  if (!connectorId) return NextResponse.json({ error: 'connector is required' }, { status: 400 });

  const config = getDirectOAuthConfig(connectorId);

  if (!config) {
    const fallback = getConnectorLaunchUrl({ id: connectorId });
    if (!fallback) return NextResponse.json({ error: 'No provider URL is configured for this connector.' }, { status: 404 });
    return NextResponse.redirect(fallback);
  }

  try {
    const origin = new URL(req.url).origin;
    const redirectUri = new URL('/api/connectors/oauth/callback', origin).toString();
    const { state, cookieValue } = createOAuthState(connectorId);
    const authorizationUrl = buildDirectOAuthUrl(connectorId, redirectUri, state);

    const response = NextResponse.redirect(authorizationUrl);
    response.cookies.set('sameer_connector_oauth_state', cookieValue, oauthStateCookieOptions());
    return response;
  } catch (error: any) {
    const url = new URL('/', req.url);
    url.searchParams.set('connector', connectorId);
    url.searchParams.set('connection', 'error');
    url.searchParams.set('reason', String(error?.message || 'OAuth configuration is incomplete').slice(0, 180));
    return NextResponse.redirect(url);
  }
}
