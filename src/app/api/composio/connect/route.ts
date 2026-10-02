import { NextRequest, NextResponse } from 'next/server';
import { getMcpOAuthUrl } from '@/lib/composioMcp';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * One-click Composio "For You" reconnect.
 *
 * GET /api/composio/connect
 *
 * Generates a fresh PKCE OAuth URL, stores the verifier/state cookies, and
 * redirects the browser straight to the Composio authorize page. After the
 * user authorizes, the existing /api/composio/callback exchanges the code and
 * sets the access + refresh token cookies. This lets the chat's
 * "session expired" message link directly to a working reconnect flow.
 */
export async function GET(req: NextRequest) {
  try {
    const origin = new URL(req.url).origin;
    const { authUrl, codeVerifier, state } = getMcpOAuthUrl(origin);

    const res = NextResponse.redirect(authUrl, 302);
    res.cookies.set('composio_pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    res.cookies.set('composio_pkce_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600,
    });
    return res;
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Could not start Composio sign-in.' },
      { status: 500 }
    );
  }
}