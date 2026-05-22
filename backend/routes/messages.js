const express = require('express');
const router = express.Router();
const db = require('../db');
const { syncInbox } = require('../lib/imapSync');

function getMailer() {
  const nodemailer = require('nodemailer');
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

function getTwilio() {
  const twilio = require('twilio');
  return twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
}

router.post('/sync', async (req, res) => {
  try {
    const result = await syncInbox();
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/threads', (req, res) => {
  const threads = db.prepare(`
    SELECT
      c.id AS contact_id, c.name, c.email, c.phone, c.status,
      m.id AS message_id, m.channel, m.direction, m.subject, m.body AS preview,
      m.status AS msg_status, m.created_at,
      (SELECT COUNT(*) FROM messages WHERE contact_id = c.id) AS message_count
    FROM contacts c
    JOIN messages m ON m.contact_id = c.id
    WHERE m.id = (
      SELECT id FROM messages WHERE contact_id = c.id ORDER BY created_at DESC LIMIT 1
    )
    ORDER BY m.created_at DESC
  `).all();
  res.json(threads);
});

router.get('/contact/:contactId', (req, res) => {
  const messages = db.prepare(
    'SELECT * FROM messages WHERE contact_id = ? ORDER BY created_at ASC'
  ).all(req.params.contactId);
  res.json(messages);
});

router.post('/send', async (req, res) => {
  const { contact_id, channel, subject, body } = req.body;

  if (!contact_id || !channel || !body?.trim()) {
    return res.status(400).json({ error: 'contact_id, channel, and body are required' });
  }
  if (!['email', 'sms'].includes(channel)) {
    return res.status(400).json({ error: 'channel must be "email" or "sms"' });
  }

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact_id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  let sendError = null;

  try {
    if (channel === 'email') {
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        return res.status(500).json({ error: 'Email not configured — add SMTP_USER and SMTP_PASS to backend/.env' });
      }
      if (!contact.email) {
        return res.status(400).json({ error: 'This contact has no email address' });
      }
      await getMailer().sendMail({
        from: `"${process.env.FROM_NAME || 'CRM'}" <${process.env.SMTP_USER}>`,
        to: contact.email,
        subject: subject || '(no subject)',
        text: body.trim(),
      });

    } else {
      if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
        return res.status(500).json({ error: 'SMS not configured — add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_FROM to backend/.env' });
      }
      if (!contact.phone) {
        return res.status(400).json({ error: 'This contact has no phone number' });
      }
      await getTwilio().messages.create({
        body: body.trim(),
        from: process.env.TWILIO_FROM,
        to: contact.phone,
      });
    }
  } catch (err) {
    sendError = err.message;
  }

  const result = db.prepare(`
    INSERT INTO messages (contact_id, channel, direction, subject, body, status)
    VALUES (?, ?, 'outbound', ?, ?, ?)
  `).run(contact_id, channel, subject || null, body.trim(), sendError ? 'failed' : 'sent');

  const message = db.prepare('SELECT * FROM messages WHERE id = ?').get(result.lastInsertRowid);

  if (sendError) {
    return res.status(500).json({ error: sendError, message });
  }
  res.status(201).json(message);
});

module.exports = router;
