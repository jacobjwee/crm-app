const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/', (req, res) => {
  const totalContacts = db.prepare('SELECT COUNT(*) as count FROM contacts').get().count;
  const activeContacts = db.prepare(
    "SELECT COUNT(*) as count FROM contacts WHERE status = 'active'"
  ).get().count;
  const totalNotes = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
  const recentContacts = db.prepare(
    'SELECT * FROM contacts ORDER BY created_at DESC LIMIT 5'
  ).all();
  const recentNotes = db.prepare(`
    SELECT notes.*, contacts.name as contact_name
    FROM notes
    JOIN contacts ON notes.contact_id = contacts.id
    ORDER BY notes.created_at DESC
    LIMIT 5
  `).all();

  res.json({ totalContacts, activeContacts, totalNotes, recentContacts, recentNotes });
});

module.exports = router;
