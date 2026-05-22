const express = require('express');
const router = express.Router();
const db = require('../db');
const { runCampaign, computeNextRun } = require('../lib/campaignRunner');

router.get('/', (req, res) => {
  const campaigns = db.prepare(`
    SELECT c.*,
      (SELECT COUNT(*) FROM campaign_runs WHERE campaign_id = c.id) as total_sends,
      (SELECT COUNT(*) FROM campaign_runs WHERE campaign_id = c.id AND status = 'sent') as sent_count,
      (SELECT COUNT(*) FROM campaign_runs WHERE campaign_id = c.id AND status = 'failed') as failed_count
    FROM campaigns c ORDER BY c.created_at DESC
  `).all();
  res.json(campaigns);
});

router.get('/:id', (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  const runs = db.prepare(`
    SELECT cr.*, contacts.name as contact_name
    FROM campaign_runs cr
    LEFT JOIN contacts ON cr.contact_id = contacts.id
    WHERE cr.campaign_id = ? ORDER BY cr.ran_at DESC LIMIT 200
  `).all(req.params.id);
  res.json({ ...campaign, runs });
});

router.post('/', (req, res) => {
  const { name, channel, type, subject, body, status, audience_filter,
    schedule_type, schedule_at, schedule_day, trigger_type, trigger_value } = req.body;

  if (!name?.trim() || !channel || !type || !body?.trim()) {
    return res.status(400).json({ error: 'name, channel, type, and body are required' });
  }

  const next_run_at = type === 'scheduled'
    ? computeNextRun(schedule_type, schedule_at, schedule_day ?? null)
    : null;

  const result = db.prepare(`
    INSERT INTO campaigns (name, channel, type, subject, body, status, audience_filter,
      schedule_type, schedule_at, schedule_day, trigger_type, trigger_value, next_run_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    name.trim(), channel, type, subject || null, body.trim(),
    status || 'active', audience_filter || 'all',
    schedule_type || null, schedule_at || null, schedule_day ?? null,
    trigger_type || null, trigger_value || null, next_run_at
  );
  res.status(201).json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(result.lastInsertRowid));
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Campaign not found' });

  const { name, channel, type, subject, body, status, audience_filter,
    schedule_type, schedule_at, schedule_day, trigger_type, trigger_value } = req.body;

  const newType = type ?? existing.type;
  const st = schedule_type !== undefined ? schedule_type : existing.schedule_type;
  const sa = schedule_at !== undefined ? schedule_at : existing.schedule_at;
  const sd = schedule_day !== undefined ? schedule_day : existing.schedule_day;
  const next_run_at = newType === 'scheduled' ? computeNextRun(st, sa, sd) : null;

  db.prepare(`
    UPDATE campaigns SET name=?, channel=?, type=?, subject=?, body=?, status=?,
      audience_filter=?, schedule_type=?, schedule_at=?, schedule_day=?,
      trigger_type=?, trigger_value=?, next_run_at=? WHERE id=?
  `).run(
    name ?? existing.name, channel ?? existing.channel, newType,
    subject !== undefined ? (subject || null) : existing.subject,
    body ?? existing.body, status ?? existing.status,
    audience_filter ?? existing.audience_filter,
    st, sa, sd,
    trigger_type !== undefined ? (trigger_type || null) : existing.trigger_type,
    trigger_value !== undefined ? (trigger_value || null) : existing.trigger_value,
    next_run_at, req.params.id
  );
  res.json(db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Campaign not found' });
  db.prepare('DELETE FROM campaigns WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

router.post('/:id/run', async (req, res) => {
  const campaign = db.prepare('SELECT * FROM campaigns WHERE id = ?').get(req.params.id);
  if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
  try {
    const results = await runCampaign(campaign);
    res.json({
      sent: results.filter(r => r.status === 'sent').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
