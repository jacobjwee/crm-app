const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/contact/:contactId', (req, res) => {
  const notes = db.prepare(
    'SELECT * FROM notes WHERE contact_id = ? ORDER BY created_at DESC'
  ).all(req.params.contactId);
  res.json(notes);
});

router.post('/', (req, res) => {
  const { contact_id, content } = req.body;
  if (!contact_id || !content || !content.trim()) {
    return res.status(400).json({ error: 'contact_id and content are required' });
  }

  const contactExists = db.prepare('SELECT id FROM contacts WHERE id = ?').get(contact_id);
  if (!contactExists) return res.status(404).json({ error: 'Contact not found' });

  const result = db.prepare(
    'INSERT INTO notes (contact_id, content) VALUES (?, ?)'
  ).run(contact_id, content.trim());

  const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(note);
});

router.delete('/:id', (req, res) => {
  const existing = db.prepare('SELECT * FROM notes WHERE id = ?').get(req.params.id);
  if (!existing) return res.status(404).json({ error: 'Note not found' });
  db.prepare('DELETE FROM notes WHERE id = ?').run(req.params.id);
  res.status(204).send();
});

module.exports = router;
