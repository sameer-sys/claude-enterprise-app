import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  // Must match the origin used by /api/mcp when it builds redirect_uri,
  // otherwise GitHub sees two different callbacks and rejects the app.
  // APP_URL is the single source of truth; request headers are dev-only fallback.
  const configured = (process.env.APP_URL || '').trim().replace(/\/+$/, '');
  let origin: string;
  if (configured) {
    origin = configured;
  } else {
    const forwardedHost = req.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
    const forwardedProto = req.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
    const host = forwardedHost || req.headers.get('host') || url.host;
    const proto = forwardedProto || (host.endsWith('.app.github.dev') ? 'https' : url.protocol.replace(':', ''));
    origin = proto + '://' + host;
  }
  const base = origin + '/api/mcp/oauth/callback';
  return NextResponse.json({
    client_id: origin + '/api/mcp/oauth/client-metadata',
    client_name: 'Sameer AI Workspace',
    client_uri: origin,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    redirect_uris: [base],
    token_endpoint_auth_method: 'none',
  }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
