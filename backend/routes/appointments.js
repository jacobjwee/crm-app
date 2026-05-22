const express = require('express');
const router = express.Router();
const db = require('../db');
const { sendEmail, sendSMS } = require('../lib/send');

// POST /send must come before GET /:id to avoid id='send' match
router.post('/send', async (req, res) => {
  const { start, end, channel, to, contact_id } = req.body;

  const appts = db.prepare(`
    SELECT a.*, c.name as contact_name
    FROM appointments a
    LEFT JOIN contacts c ON a.contact_id = c.id
    WHERE a.start_time >= ? AND a.start_time <= ?
    ORDER BY a.start_time
  `).all(start, end);

  let recipient = to;
  if (!recipient && contact_id) {
    const c = db.prepare('SELECT * FROM contacts WHERE id = ?').get(contact_id);
    recipient = channel === 'sms' ? c?.phone : c?.email;
  }
  if (!recipient) return res.status(400).json({ error: 'No recipient address found' });

  const fmtDate = (dtStr) => {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };
  const fmtTime = (dtStr) => {
    const d = new Date(dtStr.replace(' ', 'T'));
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };
  const startLabel = new Date(start).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endLabel   = new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const subject    = `Schedule: ${startLabel} – ${endLabel}`;

  try {
    if (channel === 'sms') {
      const lines = [`${subject}:`];
      if (appts.length === 0) {
        lines.push('No appointments scheduled.');
      } else {
        appts.forEach(a => {
          lines.push(`• ${fmtDate(a.start_time)} ${fmtTime(a.start_time)}: ${a.title}${a.contact_name ? ` — ${a.contact_name}` : ''}`);
        });
      }
      await sendSMS({ to: recipient, body: lines.join('\n') });
    } else {
      const STATUS_COLORS = { scheduled: '#4facfe', completed: '#27ae60', cancelled: '#e74c3c', 'no-show': '#95a5a6' };
      const rows = appts.map(a => {
        const c = STATUS_COLORS[a.status] || '#ccc';
        return `<tr>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f2f5;">${fmtDate(a.start_time)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f2f5;">${fmtTime(a.start_time)} – ${fmtTime(a.end_time)}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f2f5;font-weight:600;">${a.title}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f2f5;">${a.contact_name || '—'}</td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f2f5;">
            <span style="display:inline-block;padding:2px 8px;background:${c}22;color:${c};border-radius:4px;font-size:12px;font-weight:600;text-transform:capitalize;">${a.status}</span>
          </td>
          <td style="padding:10px 14px;border-bottom:1px solid #f0f2f5;font-size:13px;color:#666;">${a.notes || '—'}</td>
        </tr>`;
      }).join('');

      const body = `
        <div style="max-width:700px;margin:0 auto;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:24px;">
          <h2 style="margin:0 0 4px;color:#1a2332;font-size:22px;">Schedule</h2>
          <p style="margin:0 0 20px;color:#7f8c9a;font-size:14px;">${startLabel} – ${endLabel}</p>
          ${appts.length === 0
            ? '<p style="color:#b0bec5;font-size:14px;">No appointments scheduled for this period.</p>'
            : `<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 1px 8px rgba(0,0,0,0.08);">
                <thead><tr style="background:#f5f7fa;">
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#7f8c9a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Date</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#7f8c9a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Time</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#7f8c9a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Type</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#7f8c9a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Patient</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#7f8c9a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Status</th>
                  <th style="padding:10px 14px;text-align:left;font-size:11px;color:#7f8c9a;font-weight:600;text-transform:uppercase;letter-spacing:.05em;">Notes</th>
                </tr></thead>
                <tbody>${rows}</tbody>
              </table>`
          }
        </div>`;

      await sendEmail({ to: recipient, subject, body });
    }
    res.json({ sent: appts.length, to: recipient });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/', (req, res) => {
  const { start, end } = req.query;
  let appts;
  if (start && end) {
    appts = db.prepare(`
      SELECT a.*, c.name as contact_name, c.email as contact_email, c.phone as contact_phone
      FROM appointments a LEFT JOIN contacts c ON a.contact_id = c.id
      WHERE a.start_time >= ? AND a.start_time <= ?
      ORDER BY a.start_time
    `).all(start, end);
  } else {
    appts = db.prepare(`
      SELECT a.*, c.name as contact_name
      FROM appointments a LEFT JOIN contacts c ON a.contact_id = c.id
      ORDER BY a.start_time DESC LIMIT 200
    `).all();
  }
  res.json(appts);
});

router.get('/:id', (req, res) => {
  const a = db.prepare(`
    SELECT a.*, c.name as contact_name
    FROM appointments a LEFT JOIN contacts c ON a.contact_id = c.id
    WHERE a.id = ?
  `).get(req.params.id);
  if (!a) return res.status(404).json({ error: 'Not found' });
  res.json(a);
});

router.post('/', (req, res) => {
  const { contact_id, title, start_time, end_time, notes, status } = req.body;
  if (!title?.trim()) return res.status(400).json({ error: 'title is required' });
  if (!start_time || !end_time) return res.status(400).json({ error: 'start_time and end_time are required' });

  const result = db.prepare(
    'INSERT INTO appointments (contact_id, title, start_time, end_time, notes, status) VALUES (?,?,?,?,?,?)'
  ).run(contact_id || null, title.trim(), start_time, end_time, notes || null, status || 'scheduled');

  const a = db.prepare(`
    SELECT a.*, c.name as contact_name FROM appointments a
    LEFT JOIN contacts c ON a.contact_id = c.id WHERE a.id = ?
  `).get(result.lastInsertRowid);
  res.status(201).json(a);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM appointments WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Not found' });

  const { contact_id, title, start_time, end_time, notes, status } = req.body;
  db.prepare(`
    UPDATE appointments
    SET contact_id=?, title=?, start_time=?, end_time=?, notes=?, status=?, updated_at=datetime('now')
    WHERE id=?
  `).run(
    contact_id ?? existing.contact_id,
    title ?? existing.title,
    start_time ?? existing.start_time,
    end_time ?? existing.end_time,
    notes ?? existing.notes,
    status ?? existing.status,
    req.params.id
  );

  const a = db.prepare(`
    SELECT a.*, c.name as contact_name FROM appointments a
    LEFT JOIN contacts c ON a.contact_id = c.id WHERE a.id = ?
  `).get(req.params.id);
  res.json(a);
});

router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM appointments WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  db.prepare('DELETE FROM appointments WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
