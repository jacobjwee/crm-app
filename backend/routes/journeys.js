const express = require('express');
const router = express.Router();
const db = require('../db');
const { enrollContact } = require('../lib/journeyRunner');

router.get('/', (req, res) => {
  const journeys = db.prepare(`
    SELECT j.*,
      (SELECT COUNT(*) FROM journey_enrollments WHERE journey_id = j.id) as total_enrolled,
      (SELECT COUNT(*) FROM journey_enrollments WHERE journey_id = j.id AND status = 'active') as active_count,
      (SELECT COUNT(*) FROM journey_enrollments WHERE journey_id = j.id AND status = 'completed') as completed_count
    FROM journeys j ORDER BY j.created_at DESC
  `).all();
  res.json(journeys);
});

router.get('/:id', (req, res) => {
  const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const logs = db.prepare(`
    SELECT l.*, c.name as contact_name
    FROM journey_logs l LEFT JOIN contacts c ON l.contact_id = c.id
    WHERE l.journey_id = ? ORDER BY l.ran_at DESC LIMIT 100
  `).all(req.params.id);

  res.json({ ...journey, steps: JSON.parse(journey.steps || '[]'), logs });
});

router.post('/', (req, res) => {
  const { name, steps, status } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(
    'INSERT INTO journeys (name, steps, status) VALUES (?, ?, ?)'
  ).run(name.trim(), JSON.stringify(steps || []), status || 'draft');

  const j = db.prepare('SELECT * FROM journeys WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({ ...j, steps: JSON.parse(j.steps) });
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM journeys WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Journey not found' });

  const { name, steps, status } = req.body;
  db.prepare(
    "UPDATE journeys SET name=?, steps=?, status=?, updated_at=datetime('now') WHERE id=?"
  ).run(
    name ?? existing.name,
    steps !== undefined ? JSON.stringify(steps) : existing.steps,
    status ?? existing.status,
    req.params.id
  );
  const j = db.prepare('SELECT * FROM journeys WHERE id = ?').get(req.params.id);
  res.json({ ...j, steps: JSON.parse(j.steps) });
});

router.delete('/:id', (req, res) => {
  if (!db.prepare('SELECT id FROM journeys WHERE id = ?').get(req.params.id)) {
    return res.status(404).json({ error: 'Journey not found' });
  }
  db.prepare('DELETE FROM journeys WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

// Enroll all matching contacts now (manual trigger)
router.post('/:id/run', (req, res) => {
  const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(req.params.id);
  if (!journey) return res.status(404).json({ error: 'Journey not found' });

  const steps = JSON.parse(journey.steps || '[]');
  const triggerStep = steps.find(s => s.type === 'trigger');
  const audienceFilter = triggerStep?.config?.audience_filter || 'all';

  const contacts = audienceFilter === 'all'
    ? db.prepare('SELECT * FROM contacts').all()
    : db.prepare('SELECT * FROM contacts WHERE status = ?').all(audienceFilter);

  for (const c of contacts) enrollContact(journey.id, c.id);

  res.json({ enrolled: contacts.length });
});

module.exports = router;
