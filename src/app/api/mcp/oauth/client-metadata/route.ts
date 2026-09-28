import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = `${url.origin}/api/mcp/oauth/callback`;
  return NextResponse.json({
    client_name: 'Sameer AI Workspace',
    client_uri: url.origin,
    grant_types: ['authorization_code'],
    response_types: ['code'],
    redirect_uris: [base],
    token_endpoint_auth_method: 'none',
  }, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}