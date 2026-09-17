import { NextRequest, NextResponse } from 'next/server';
import { sendRealEmail, sendBulkRealEmails } from '@/lib/mailer';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { to, subject, text, html, fromEmail, authPass, fromName, bulkRecipients } = body;

    if (bulkRecipients && Array.isArray(bulkRecipients) && bulkRecipients.length > 0) {
      const result = await sendBulkRealEmails(
        bulkRecipients,
        subject || 'Important Business Update',
        text || '',
        fromEmail,
        authPass,
        fromName
      );
      return NextResponse.json(result);
    }

    if (!to || !subject) {
      return NextResponse.json(
        { error: 'Both "to" and "subject" are required parameters' },
        { status: 400 }
      );
    }

    const result = await sendRealEmail({
      to,
      subject,
      text: text || '',
      html: html || undefined,
      fromEmail,
      authPass,
      fromName,
    });

    if (result.success) {
      return NextResponse.json(result);
    } else {
      return NextResponse.json(result, { status: 502 });
    }
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error during dispatch' },
      { status: 500 }
    );
  }
}
