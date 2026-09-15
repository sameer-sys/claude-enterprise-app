import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const SYNC_ROOMS = new Map<string, { data: any; updatedAt: number }>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const roomId = searchParams.get('roomId');
  const supabaseUrl = searchParams.get('supabaseUrl');
  const supabaseKey = searchParams.get('supabaseKey');

  if (!roomId && !supabaseUrl) {
    return NextResponse.json({ error: 'Missing roomId or supabaseUrl' }, { status: 400 });
  }

  if (supabaseUrl && supabaseKey) {
    try {
      const cleanUrl = supabaseUrl.replace(/\/$/, '');
      const resp = await fetch(`${cleanUrl}/rest/v1/claude_workspaces?select=*&order=updated_at.desc&limit=1`, {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      });

      if (resp.ok) {
        const rows = await resp.json();
        if (rows && rows.length > 0) {
          return NextResponse.json({ data: rows[0].payload, updatedAt: rows[0].updated_at, source: 'supabase' });
        }
      }
    } catch (e: any) {
      // pass
    }
  }

  if (roomId) {
    const room = SYNC_ROOMS.get(roomId);
    if (room) {
      return NextResponse.json({ data: room.data, updatedAt: room.updatedAt, source: 'relay' });
    }
  }

  return NextResponse.json({ data: null, source: 'none' });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { roomId, data, supabaseUrl, supabaseKey } = body;
    const now = Date.now();

    if (supabaseUrl && supabaseKey) {
      try {
        const cleanUrl = supabaseUrl.replace(/\/$/, '');
        await fetch(`${cleanUrl}/rest/v1/claude_workspaces`, {
          method: 'POST',
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates',
          },
          body: JSON.stringify({
            id: roomId || 'default-workspace',
            payload: data,
            updated_at: now,
          }),
        });
      } catch (e) {
        // pass
      }
    }

    if (roomId) {
      SYNC_ROOMS.set(roomId, { data, updatedAt: now });
    }

    return NextResponse.json({ success: true, updatedAt: now });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
