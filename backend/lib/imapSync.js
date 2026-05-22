const { ImapFlow } = require('imapflow');
const { simpleParser } = require('mailparser');
const db = require('../db');

async function syncInbox() {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    throw new Error('SMTP_USER and SMTP_PASS are required for inbox sync');
  }

  // Build a lookup map: email address → contact id
  const contacts = db.prepare('SELECT id, email FROM contacts WHERE email IS NOT NULL').all();
  const emailToContact = {};
  for (const c of contacts) {
    emailToContact[c.email.toLowerCase()] = c.id;
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
  });

  await client.connect();

  let imported = 0;
  let skipped  = 0;

  try {
    const lock = await client.getMailboxLock('INBOX');
    try {
      // Fetch emails from the last 60 days
      const since = new Date();
      since.setDate(since.getDate() - 60);

      const uids = await client.search({ since }, { uid: true });
      if (uids.length === 0) return { imported: 0, skipped: 0 };

      for await (const msg of client.fetch(uids, { envelope: true, source: true }, { uid: true })) {
        try {
          const parsed = await simpleParser(msg.source);
          const messageId = parsed.messageId;
          const fromAddr  = parsed.from?.value?.[0]?.address?.toLowerCase();
          const subject   = parsed.subject || '';
          const text      = (parsed.text || parsed.html || '').trim();
          const date      = parsed.date ? parsed.date.toISOString().slice(0, 19).replace('T', ' ') : null;

          if (!fromAddr || fromAddr === user.toLowerCase()) {
            // Skip emails we sent ourselves
            skipped++;
            continue;
          }

          const contactId = emailToContact[fromAddr];
          if (!contactId) {
            // No matching contact — ignore
            skipped++;
            continue;
          }

          if (!text) { skipped++; continue; }

          // Skip if we already have this message
          if (messageId) {
            const existing = db.prepare('SELECT id FROM messages WHERE external_id = ?').get(messageId);
            if (existing) { skipped++; continue; }
          }

          db.prepare(`
            INSERT OR IGNORE INTO messages (contact_id, channel, direction, subject, body, status, external_id, created_at)
            VALUES (?, 'email', 'inbound', ?, ?, 'received', ?, ?)
          `).run(contactId, subject || null, text, messageId || null, date);

          imported++;
        } catch (msgErr) {
          // Skip unparseable messages
          skipped++;
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout();
  }

  return { imported, skipped };
}

module.exports = { syncInbox };
