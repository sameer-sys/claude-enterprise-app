import { NextRequest, NextResponse } from 'next/server';
import { getConnectorCookieName, connectionCookieOptions } from '@/lib/connectorAuth';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  let connectorId = '';
  try {
    const body = await req.json();
    connectorId = String(body?.connector || '').trim();
  } catch {}

  if (!connectorId) {
    connectorId = String(new URL(req.url).searchParams.get('connector') || '').trim();
  }

  if (!connectorId) return NextResponse.json({ error: 'connector is required' }, { status: 400 });

  const response = NextResponse.json({ success: true, connector: connectorId });
  response.cookies.set(getConnectorCookieName(connectorId), '', { ...connectionCookieOptions(), maxAge: 0 });
  return response;
}
