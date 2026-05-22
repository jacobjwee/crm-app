const express = require('express');
const router = express.Router();
const db = require('../db');
const { fireTrigger } = require('../lib/campaignRunner');
const { fireTrigger: fireJourneyTrigger } = require('../lib/journeyRunner');

function displayName(c) {
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ');
  return full || c.name || 'Unknown';
}

router.get('/', (req, res) => {
  const { search } = req.query;
  let contacts;
  if (search) {
    const q = `%${search}%`;
    contacts = db.prepare(`
      SELECT * FROM contacts
      WHERE name LIKE ? OR first_name LIKE ? OR last_name LIKE ?
         OR preferred_name LIKE ? OR email LIKE ? OR phone LIKE ?
      ORDER BY created_at DESC
    `).all(q, q, q, q, q, q);
  } else {
    contacts = db.prepare('SELECT * FROM contacts ORDER BY created_at DESC').all();
  }
  res.json(contacts);
});

router.get('/:id', (req, res) => {
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Contact not found' });
  res.json(contact);
});

router.post('/', (req, res) => {
  const { first_name, last_name, preferred_name, date_of_birth, phone, email, preferred_channel, status, name } = req.body;

  const fn = (first_name || '').trim();
  const ln = (last_name || '').trim();
  const computedName = fn && ln ? `${fn} ${ln}` : fn || ln || (name || '').trim();

  if (!computedName) return res.status(400).json({ error: 'First name is required' });

  const result = db.prepare(`
    INSERT INTO contacts (name, first_name, last_name, preferred_name, date_of_birth, email, phone, preferred_channel, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    computedName,
    fn || null,
    ln || null,
    preferred_name?.trim() || null,
    date_of_birth || null,
    email?.trim() || null,
    phone?.trim() || null,
    preferred_channel || 'email',
    status || 'active'
  );

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  fireTrigger('contact_created', contact).catch(() => {});
  fireJourneyTrigger('contact_created', contact);
  res.status(201).json(contact);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const { first_name, last_name, preferred_name, date_of_birth, phone, email, preferred_channel, status } = req.body;

  const fn = first_name !== undefined ? (first_name || '').trim() : existing.first_name;
  const ln = last_name  !== undefined ? (last_name  || '').trim() : existing.last_name;
  const computedName = fn && ln ? `${fn} ${ln}` : fn || ln || existing.name;

  db.prepare(`
    UPDATE contacts
    SET name = ?, first_name = ?, last_name = ?, preferred_name = ?,
        date_of_birth = ?, email = ?, phone = ?, preferred_channel = ?, status = ?
    WHERE id = ?
  `).run(
    computedName,
    fn || null,
    ln || null,
    preferred_name !== undefined ? (preferred_name?.trim() || null) : existing.preferred_name,
    date_of_birth !== undefined ? (date_of_birth || null) : existing.date_of_birth,
    email !== undefined ? (email?.trim() || null) : existing.email,
    phone !== undefined ? (phone?.trim() || null) : existing.phone,
    preferred_channel !== undefined ? (preferred_channel || 'email') : existing.preferred_channel,
    status !== undefined ? status : existing.status,
    req.params.id
  );

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (status && status !== existing.status) {
    fireTrigger('status_changed', contact, status).catch(() => {});
    fireJourneyTrigger('status_changed', contact, status);
  }
  res.json(contact);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
