import { NextRequest, NextResponse } from 'next/server';
import {
  connectionCookieOptions,
  getAllConnectionsFromCookieHeader,
  getConnectorCookieName,
  getDirectOAuthConnectorIds,
  getProviderAccountLabel,
  getValidConnection,
  sealConnection,
} from '@/lib/connectorAuth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const cookieHeader = req.headers.get('cookie') || '';
  const connections: Record<string, any> = {};
  const refreshedCookies: Array<{ name: string; value: string }> = [];

  const current = getAllConnectionsFromCookieHeader(cookieHeader);

  for (const connectorId of getDirectOAuthConnectorIds()) {
    const { connection, refreshed } = await getValidConnection(connectorId, cookieHeader);
    if (!connection) continue;

    connections[connectorId] = {
      connected: true,
      status: 'connected',
      account: connection.account || null,
      connectedAt: connection.connectedAt,
      expiresAt: connection.expiresAt || null,
    };

    if (refreshed) {
      refreshedCookies.push({
        name: getConnectorCookieName(connectorId),
        value: sealConnection(connection),
      });
    }
  }

  const response = NextResponse.json({
    connections,
    supportedOAuthConnectors: getDirectOAuthConnectorIds(),
    hasAnyConnection: Object.keys(connections).length > 0,
  });

  for (const cookie of refreshedCookies) {
    response.cookies.set(cookie.name, cookie.value, connectionCookieOptions());
  }

  return response;
}
