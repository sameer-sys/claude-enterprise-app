import { ImapFlow } from 'imapflow';

export interface InboxEmail {
  id: number;
  uid: number;
  subject: string;
  from: string;
  fromName: string;
  date: string;
  snippet?: string;
}

const DEFAULT_USER = process.env.SMTP_USER || 'headoffice@apexspherexports.com';
const DEFAULT_PASS = process.env.SMTP_PASS || 'jymg byjn olxe hezv';

export async function fetchLatestEmails(
  maxCount = 5,
  user = DEFAULT_USER,
  pass = DEFAULT_PASS
): Promise<{ success: boolean; total: number; emails: InboxEmail[]; error?: string }> {
  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: user.trim(),
      pass: pass.trim(),
    },
    logger: false,
  });

  try {
    await client.connect();
    const lock = await client.getMailboxLock('INBOX');
    try {
      const searchRes = await client.search({ all: true });
      const uids = Array.isArray(searchRes) ? searchRes : [];
      const total = uids.length;
      const targetUids = uids.slice(-maxCount).reverse();

      const emails: InboxEmail[] = [];
      for (const uid of targetUids) {
        try {
          const msg = await client.fetchOne(uid, { envelope: true, bodyStructure: true, uid: true });
          if (msg && msg.envelope) {
            emails.push({
              id: msg.seq,
              uid: msg.uid,
              subject: msg.envelope.subject || '(No Subject)',
              from: msg.envelope.from?.[0]?.address || 'Unknown',
              fromName: msg.envelope.from?.[0]?.name || msg.envelope.from?.[0]?.address || 'Unknown',
              date: msg.envelope.date ? new Date(msg.envelope.date).toLocaleString() : 'Recent',
            });
          }
        } catch (fetchErr) {
          // ignore individual message fetch error
        }
      }

      return { success: true, total, emails };
    } finally {
      lock.release();
      await client.logout();
    }
  } catch (err: any) {
    return { success: false, total: 0, emails: [], error: err.message || 'Failed to connect to IMAP' };
  }
}
