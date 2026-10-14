import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SUPABASE_URL = (process.env.SUPABASE_URL || '').replace(/\/+$/, '');
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';
const WORKSPACE_CODE_RE = /^[A-Za-z0-9_-]{32,128}$/;
const MAX_PAYLOAD_BYTES = 1_900_000;

function validateWorkspaceCode(value: unknown): string | null {
  const code = typeof value === 'string' ? value.trim() : '';
  return WORKSPACE_CODE_RE.test(code) ? code : null;
}

function removeSensitiveFields(value: any, depth = 0): any {
  if (depth > 30 || value === null || value === undefined) return null;
  if (Array.isArray(value)) return value.map((item) => removeSensitiveFields(item, depth + 1));
  if (typeof value !== 'object') return value;
  const cleaned: Record<string, any> = {};
  for (const [key, child] of Object.entries(value)) {
    if (/(token|secret|password|api[_-]?key|authorization|credential|dataurl|base64|supabase)/i.test(key)) continue;
    cleaned[key] = removeSensitiveFields(child, depth + 1);
  }
  return cleaned;
}

async function callSupabaseRpc(name: string, args: Record<string, unknown>) {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase environment variables are not configured on the server.');
  }

  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(args),
    cache: 'no-store',
    signal: AbortSignal.timeout(10000),
  });

  const text = await response.text();
  let result: any = null;
  try { result = text ? JSON.parse(text) : null; } catch { result = null; }

  if (!response.ok) {
    console.error('[workspace-sync] Supabase RPC failed:', response.status, result?.message || text.slice(0, 300));
    if (response.status === 401 || response.status === 403) {
      throw new Error('Supabase authorization failed. Check the server-side API key and function permissions.');
    }
    throw new Error('Supabase could not complete the workspace sync request.');
  }

  return result;
}

export async function GET() {
  const configured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
  return NextResponse.json(
    { success: configured, storage: configured ? 'supabase' : 'unconfigured' },
    { status: configured ? 200 : 503, headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || 'save');
    const roomId = validateWorkspaceCode(body?.roomId);

    if (!roomId) {
      return NextResponse.json({
        success: false,
        error: 'Workspace sync code must be the complete 32–128 character private code.',
      }, { status: 400 });
    }

    if (action === 'load') {
      const rows = await callSupabaseRpc('get_claude_workspace', { p_workspace_code: roomId });
      const row = Array.isArray(rows) ? rows[0] : null;
      return NextResponse.json({
        success: true,
        data: row?.payload ?? null,
        updatedAt: row?.updated_at ?? null,
        source: 'supabase',
      }, { headers: { 'Cache-Control': 'no-store' } });
    }

    if (action !== 'save') {
      return NextResponse.json({ success: false, error: 'Unknown sync action.' }, { status: 400 });
    }

    const data = body?.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return NextResponse.json({ success: false, error: 'Workspace data must be a JSON object.' }, { status: 400 });
    }

    const safeData = removeSensitiveFields(data);
    const serialized = JSON.stringify(safeData);
    if (Buffer.byteLength(serialized, 'utf8') > MAX_PAYLOAD_BYTES) {
      return NextResponse.json({
        success: false,
        error: 'Workspace data is too large to sync. Large file attachments are not stored in chat sync.',
      }, { status: 413 });
    }

    const updatedAt = await callSupabaseRpc('save_claude_workspace', {
      p_workspace_code: roomId,
      p_payload: safeData,
    });

    return NextResponse.json({
      success: true,
      source: 'supabase',
      updatedAt,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error: any) {
    const message = error?.message || 'Workspace sync failed.';
    const status = message.includes('environment variables') ? 503 : 502;
    return NextResponse.json({
      success: false,
      error: message,
      source: 'supabase',
    }, { status, headers: { 'Cache-Control': 'no-store' } });
  }
}
