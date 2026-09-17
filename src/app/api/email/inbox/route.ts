import { NextRequest, NextResponse } from 'next/server';
import { fetchLatestEmails } from '@/lib/imapReader';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const count = parseInt(searchParams.get('count') || '5', 10);
    const user = searchParams.get('user') || undefined;
    const pass = searchParams.get('pass') || undefined;

    const result = await fetchLatestEmails(count, user, pass);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
