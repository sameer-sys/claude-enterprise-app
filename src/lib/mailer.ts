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

// SECURITY: credentials must come from environment variables only.
// No hardcoded fallback — a leaked default here previously exposed a real
// Gmail app password in this public repository.
const ENV_USER = process.env.SMTP_USER;
const ENV_PASS = process.env.SMTP_PASS;

export function createSmtpTransporter(user = ENV_USER, pass = ENV_PASS) {
  if (!user || !pass) {
    throw new Error(
      'SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS as environment variables (never hardcode them).'
    );
  }
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
 * Send a single email over a real SMTP connection.
 */
export async function sendRealEmail(options: EmailDispatchOptions): Promise<EmailDispatchResult> {
  const user = options.fromEmail || ENV_USER;
  const pass = options.authPass || ENV_PASS;
  const fromName = options.fromName || 'Sameer Shaik';

  if (!user || !pass) {
    return { success: false, error: 'SMTP credentials are not configured.' };
  }

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
 * Send bulk emails with rate control.
 */
export async function sendBulkRealEmails(
  recipients: string[],
  subject: string,
  bodyTemplate: string,
  fromEmail = ENV_USER,
  authPass = ENV_PASS,
  fromName = 'Sameer Shaik'
): Promise<BulkDispatchResult> {
  if (!fromEmail || !authPass) {
    return {
      success: false,
      total: recipients.length,
      sentCount: 0,
      failedCount: recipients.length,
      results: recipients.map((r) => ({
        recipient: r,
        success: false,
        error: 'SMTP credentials are not configured.',
      })),
    };
  }

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
