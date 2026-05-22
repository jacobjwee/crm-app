const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendEmail, sendSMS } = require('../lib/send');

const APP_URL = process.env.APP_URL || 'http://localhost:5173';

// GET /api/booking/slots?date=2026-05-22
router.get('/slots', (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ error: 'date is required' });

  const taken = db.prepare(`
    SELECT start_time, end_time FROM appointments
    WHERE start_time >= ? AND start_time < ? AND status NOT IN ('cancelled')
  `).all(`${date}T00:00:00`, `${date}T23:59:59`);

  const slots = [];
  for (let h = 8; h < 17; h++) {
    for (let m = 0; m < 60; m += 30) {
      const timeStr = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}`;
      const dtStart = `${date}T${timeStr}:00`;
      const isTaken = taken.some(a => {
        const aS = a.start_time.replace(' ', 'T').slice(0, 19);
        const aE = a.end_time.replace(' ', 'T').slice(0, 19);
        return dtStart >= aS && dtStart < aE;
      });
      slots.push({ time: timeStr, available: !isTaken });
    }
  }
  res.json(slots);
});

// POST /api/booking  — public: patient books a slot
router.post('/', (req, res) => {
  const { name, email, phone, reason, date, time } = req.body;
  if (!name?.trim() || !date || !time) {
    return res.status(400).json({ error: 'name, date, and time are required' });
  }

  // Find or create contact by email
  let contact = email ? db.prepare('SELECT * FROM contacts WHERE email = ?').get(email.trim()) : null;
  if (!contact) {
    const r = db.prepare('INSERT INTO contacts (name, email, phone, status) VALUES (?,?,?,?)')
      .run(name.trim(), email?.trim() || null, phone?.trim() || null, 'lead');
    contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(r.lastInsertRowid);
  }

  const startTime = `${date}T${time}:00`;
  const [h, m] = time.split(':').map(Number);
  const endMin = h * 60 + m + 30;
  const endTime = `${date}T${String(Math.floor(endMin / 60)).padStart(2,'0')}:${String(endMin % 60).padStart(2,'0')}:00`;

  db.prepare(
    'INSERT INTO appointments (contact_id, title, start_time, end_time, notes, status) VALUES (?,?,?,?,?,?)'
  ).run(contact.id, reason?.trim() || 'Appointment', startTime, endTime, `Booked online by ${name.trim()}`, 'scheduled');

  res.status(201).json({ success: true });
});

// POST /api/booking/send  — send booking link to a contact
router.post('/send', async (req, res) => {
  const { contact_id, channel } = req.body;
  if (!contact_id) return res.status(400).json({ error: 'contact_id is required' });

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact_id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });

  const bookingUrl = `${APP_URL}/book`;

  try {
    if (channel === 'sms') {
      if (!contact.phone) return res.status(400).json({ error: 'Contact has no phone number' });
      await sendSMS({
        to: contact.phone,
        body: `Hi ${contact.name}, please book your appointment here: ${bookingUrl}`,
      });
    } else {
      if (!contact.email) return res.status(400).json({ error: 'Contact has no email address' });
      await sendEmail({
        to: contact.email,
        subject: 'Book Your Appointment',
        body: `
          <div style="max-width:520px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:40px 24px;text-align:center;">
            <h2 style="margin:0 0 8px;color:#1a2332;font-size:24px;">Book an Appointment</h2>
            <p style="margin:0 0 28px;color:#666;font-size:15px;">Hi ${contact.name}, click the button below to choose a time that works for you.</p>
            <a href="${bookingUrl}" style="display:inline-block;padding:14px 36px;background:#4facfe;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;font-size:15px;">Schedule Now →</a>
            <p style="margin:28px 0 0;font-size:12px;color:#b0bec5;">Or copy this link: <a href="${bookingUrl}" style="color:#4facfe;">${bookingUrl}</a></p>
          </div>`,
      });
    }

    // Log message
    db.prepare('INSERT INTO messages (contact_id, channel, direction, subject, body, status) VALUES (?,?,?,?,?,?)')
      .run(contact.id, channel, 'outbound',
        channel === 'email' ? 'Book Your Appointment' : null,
        `Booking link sent: ${bookingUrl}`, 'sent');

    res.json({ sent: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
