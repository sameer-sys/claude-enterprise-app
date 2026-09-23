import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestEmails } from '@/lib/imapReader';

export const runtime = 'nodejs';

function normalizeCount(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '5'), 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 10) : 5;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = normalizeCount(searchParams.get('count'));

    // Never accept mailbox credentials in a query string: URLs can be logged,
    // cached, copied into history, or exposed through referrers.
    const result = await fetchLatestEmails(count);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unable to read inbox.' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const count = normalizeCount(body?.count);
    const user = typeof body?.user === 'string' && body.user.trim() ? body.user.trim() : undefined;
    const pass = typeof body?.pass === 'string' && body.pass ? body.pass : undefined;

    const result = await fetchLatestEmails(count, user, pass);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err?.message || 'Unable to read inbox.' },
      { status: 500 }
    );
  }
}
