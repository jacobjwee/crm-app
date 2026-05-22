const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const db = new DatabaseSync(path.join(__dirname, 'crm.db'));

db.exec(`PRAGMA foreign_keys = ON`);
db.exec(`PRAGMA journal_mode = WAL`);

db.exec(`
  CREATE TABLE IF NOT EXISTS contacts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    company TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    channel TEXT NOT NULL,
    type TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    audience_filter TEXT DEFAULT 'all',
    schedule_type TEXT,
    schedule_at TEXT,
    schedule_day INTEGER,
    trigger_type TEXT,
    trigger_value TEXT,
    next_run_at TEXT,
    last_run_at TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS campaign_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    campaign_id INTEGER NOT NULL,
    contact_id INTEGER,
    status TEXT DEFAULT 'sent',
    error TEXT,
    ran_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS journeys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    status TEXT DEFAULT 'draft',
    steps TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS journey_enrollments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journey_id INTEGER NOT NULL,
    contact_id INTEGER NOT NULL,
    step_index INTEGER DEFAULT 1,
    status TEXT DEFAULT 'active',
    resume_at TEXT,
    enrolled_at TEXT DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS journey_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    journey_id INTEGER NOT NULL,
    contact_id INTEGER,
    step_index INTEGER,
    step_type TEXT,
    status TEXT,
    error TEXT,
    ran_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (journey_id) REFERENCES journeys(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER NOT NULL,
    channel TEXT NOT NULL,
    direction TEXT NOT NULL DEFAULT 'outbound',
    subject TEXT,
    body TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    contact_id INTEGER,
    title TEXT NOT NULL,
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    notes TEXT,
    status TEXT DEFAULT 'scheduled',
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE SET NULL
  );
`);

// Add next_run_at to journeys if not present (safe migration)
try { db.exec('ALTER TABLE journeys ADD COLUMN next_run_at TEXT'); } catch (_) {}
// Track external message IDs (e.g. IMAP Message-ID) to avoid duplicate imports
try { db.exec('ALTER TABLE messages ADD COLUMN external_id TEXT UNIQUE'); } catch (_) {}
// Expanded patient fields
try { db.exec('ALTER TABLE contacts ADD COLUMN first_name TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE contacts ADD COLUMN last_name TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE contacts ADD COLUMN preferred_name TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE contacts ADD COLUMN date_of_birth TEXT'); } catch (_) {}
try { db.exec('ALTER TABLE contacts ADD COLUMN preferred_channel TEXT DEFAULT \'email\''); } catch (_) {}
// Migrate existing contacts: split name into first/last
db.exec(`
  UPDATE contacts
  SET
    first_name = CASE WHEN instr(name, ' ') > 0 THEN substr(name, 1, instr(name, ' ') - 1) ELSE name END,
    last_name  = CASE WHEN instr(name, ' ') > 0 THEN substr(name, instr(name, ' ') + 1) ELSE '' END
  WHERE first_name IS NULL
`);

module.exports = db;
