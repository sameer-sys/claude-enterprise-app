import nodemailer from 'nodemailer';

export interface EmailDispatchOptions {
  to: string | string[];
  subject: string;
  text?: string;
  html?: string;
  fromName?: string;
  fromEmail?: string;
  authPass?: string;
}

export interface EmailDispatchResult {
  success: boolean;
  messageId?: string;
  response?: string;
  accepted?: string[];
  rejected?: string[];
  error?: string;
}

export interface BulkDispatchResult {
  success: boolean;
  total: number;
  sentCount: number;
  failedCount: number;
  results: { recipient: string; success: boolean; messageId?: string; error?: string }[];
}

const DEFAULT_USER = process.env.SMTP_USER || 'headoffice@apexspherexports.com';
const DEFAULT_PASS = process.env.SMTP_PASS || 'jymg byjn olxe hezv';

export function createSmtpTransporter(user = DEFAULT_USER, pass = DEFAULT_PASS) {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

/**
 * Send a single email over real SMTP connection with zero user buttons.
 */
export async function sendRealEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  const user = options.fromEmail || DEFAULT_USER;
  const pass = options.authPass || DEFAULT_PASS;
  const fromName = options.fromName || 'Sameer Shaik';

  const transporter = createSmtpTransporter(user, pass);

  try {
    const info = await transporter.sendMail({
      from: `"${fromName}" <${user}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    return {
      success: true,
      messageId: info.messageId,
      response: info.response,
      accepted: info.accepted?.map(String) || [],
      rejected: info.rejected?.map(String) || [],
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.message || 'Unknown SMTP error occurred',
    };
  }
}

/**
 * Send bulk emails (e.g. 600+ recipients) with rate control and zero user buttons.
 */
export async function sendBulkRealEmails(
  recipients: string[],
  subject: string,
  bodyTemplate: string,
  fromEmail = DEFAULT_USER,
  authPass = DEFAULT_PASS,
  fromName = 'Sameer Shaik'
): Promise<BulkDispatchResult> {
  const transporter = createSmtpTransporter(fromEmail, authPass);
  const results: { recipient: string; success: boolean; messageId?: string; error?: string }[] = [];
  let sentCount = 0;
  let failedCount = 0;

  for (let i = 0; i < recipients.length; i++) {
    const rcpt = recipients[i].trim();
    if (!rcpt || !rcpt.includes('@')) continue;

    try {
      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: rcpt,
        subject: subject,
        text: bodyTemplate.replace(/\{\{email\}\}/g, rcpt),
      });
      sentCount++;
      results.push({ recipient: rcpt, success: true, messageId: info.messageId });
    } catch (err: any) {
      failedCount++;
      results.push({ recipient: rcpt, success: false, error: err.message });
    }

    if (i % 25 === 0 && i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return {
    success: failedCount === 0,
    total: recipients.length,
    sentCount,
    failedCount,
    results,
  };
}
