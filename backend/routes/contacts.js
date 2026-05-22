const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const { search } = req.query;
  let contacts;
  if (search) {
    contacts = db.prepare(`
      SELECT * FROM contacts
      WHERE name LIKE ? OR email LIKE ? OR company LIKE ?
      ORDER BY created_at DESC
    `).all(`%${search}%`, `%${search}%`, `%${search}%`);
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
  const { name, email, phone, company, status } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'Name is required' });

  const result = db.prepare(`
    INSERT INTO contacts (name, email, phone, company, status)
    VALUES (?, ?, ?, ?, ?)
  `).run(name.trim(), email || null, phone || null, company || null, status || 'active');

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(contact);
});

router.put('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });

  const { name, email, phone, company, status } = req.body;
  db.prepare(`
    UPDATE contacts SET name = ?, email = ?, phone = ?, company = ?, status = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    email !== undefined ? (email || null) : existing.email,
    phone !== undefined ? (phone || null) : existing.phone,
    company !== undefined ? (company || null) : existing.company,
    status ?? existing.status,
    req.params.id
  );

  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  res.json(contact);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Contact not found' });
  db.prepare('DELETE FROM contacts WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
