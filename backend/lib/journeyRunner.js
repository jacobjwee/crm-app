const db = require('../db');
const { sendEmail, sendSMS } = require('./send');

function addTime(duration, unit) {
  const ms = { minutes: 60_000, hours: 3_600_000, days: 86_400_000 }[unit] ?? 86_400_000;
  return new Date(Date.now() + duration * ms).toISOString().slice(0, 19).replace('T', ' ');
}

async function executeStep(enrollment, step, contact) {
  const cfg = step.config || {};
  switch (step.type) {
    case 'send_email':
      if (!contact.email) return { status: 'skipped', error: 'No email address' };
      await sendEmail({ to: contact.email, subject: cfg.subject, body: cfg.body });
      return { status: 'sent' };

    case 'send_sms':
      if (!contact.phone) return { status: 'skipped', error: 'No phone number' };
      await sendSMS({ to: contact.phone, body: cfg.body });
      return { status: 'sent' };

    case 'wait':
      db.prepare(
        'UPDATE journey_enrollments SET resume_at = ? WHERE id = ?'
      ).run(addTime(cfg.duration || 1, cfg.unit || 'days'), enrollment.id);
      return { status: 'waiting' };

    case 'update_status':
      if (cfg.status) {
        db.prepare('UPDATE contacts SET status = ? WHERE id = ?').run(cfg.status, contact.id);
      }
      return { status: 'done' };

    default:
      return { status: 'skipped', error: `Unknown step type: ${step.type}` };
  }
}

async function advanceEnrollment(enrollment) {
  const journey = db.prepare('SELECT * FROM journeys WHERE id = ?').get(enrollment.journey_id);
  if (!journey) return;

  const steps = JSON.parse(journey.steps || '[]');
  const contact = db.prepare('SELECT * FROM contacts WHERE id = ?').get(enrollment.contact_id);
  if (!contact) {
    db.prepare("UPDATE journey_enrollments SET status = 'failed' WHERE id = ?").run(enrollment.id);
    return;
  }

  let idx = enrollment.step_index;

  while (idx < steps.length) {
    const step = steps[idx];
    if (!step || step.type === 'trigger') { idx++; continue; }

    let result = { status: 'done' };
    try {
      result = await executeStep(enrollment, step, contact);
    } catch (err) {
      result = { status: 'failed', error: err.message };
    }

    db.prepare(
      'INSERT INTO journey_logs (journey_id, contact_id, step_index, step_type, status, error) VALUES (?,?,?,?,?,?)'
    ).run(journey.id, contact.id, idx, step.type, result.status, result.error || null);

    if (result.status === 'waiting') {
      db.prepare('UPDATE journey_enrollments SET step_index = ? WHERE id = ?').run(idx + 1, enrollment.id);
      return;
    }

    if (result.status === 'failed') {
      db.prepare("UPDATE journey_enrollments SET status = 'failed', step_index = ? WHERE id = ?").run(idx, enrollment.id);
      return;
    }

    idx++;
    db.prepare('UPDATE journey_enrollments SET step_index = ? WHERE id = ?').run(idx, enrollment.id);
  }

  db.prepare(
    "UPDATE journey_enrollments SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
  ).run(enrollment.id);
}

function enrollContact(journeyId, contactId) {
  try {
    const existing = db.prepare(
      "SELECT id FROM journey_enrollments WHERE journey_id = ? AND contact_id = ? AND status = 'active'"
    ).get(journeyId, contactId);
    if (existing) return;

    const result = db.prepare(
      'INSERT INTO journey_enrollments (journey_id, contact_id) VALUES (?, ?)'
    ).run(journeyId, contactId);

    const enrollment = db.prepare('SELECT * FROM journey_enrollments WHERE id = ?').get(result.lastInsertRowid);
    advanceEnrollment(enrollment).catch(err =>
      console.error(`[journey] Enrollment ${enrollment.id} error:`, err.message)
    );
  } catch (err) {
    console.error('[journey] Enroll error:', err.message);
  }
}

function computeNextScheduled(cfg) {
  const { schedule_type, schedule_at, schedule_day } = cfg;
  if (!schedule_type || !schedule_at) return null;
  if (schedule_type === 'once') return schedule_at;

  const [h, m] = schedule_at.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(h, m, 0, 0);

  if (schedule_type === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (schedule_type === 'weekly') {
    const day = schedule_day ?? 1;
    let d = (day - next.getDay() + 7) % 7;
    if (d === 0 && next <= now) d = 7;
    next.setDate(next.getDate() + d);
  } else if (schedule_type === 'monthly') {
    const dom = schedule_day ?? 1;
    next.setDate(dom);
    if (next <= now) { next.setMonth(next.getMonth() + 1); next.setDate(dom); }
  }

  return next.toISOString().slice(0, 19).replace('T', ' ');
}

function fireTrigger(eventType, contact, eventValue = null) {
  const journeys = db.prepare("SELECT * FROM journeys WHERE status = 'active'").all();
  for (const journey of journeys) {
    const steps = JSON.parse(journey.steps || '[]');
    const triggerStep = steps.find(s => s.type === 'trigger');
    if (!triggerStep) continue;
    const cfg = triggerStep.config || {};

    // New format
    if (cfg.trigger_type) {
      if (eventType === 'contact_created' && cfg.trigger_type === 'contact_created') {
        enrollContact(journey.id, contact.id);
      } else if (eventType === 'status_changed' && cfg.trigger_type === 'event' &&
                 cfg.event_type === 'status_changed' && cfg.event_value === eventValue) {
        enrollContact(journey.id, contact.id);
      }
    } else {
      // Legacy format (events array)
      const events = cfg.events || [];
      const matches =
        events.includes(eventType) ||
        (eventType === 'status_changed' && events.includes(`status_changed:${eventValue}`));
      if (matches) enrollContact(journey.id, contact.id);
    }
  }
}

function runScheduledJourneys() {
  const journeys = db.prepare("SELECT * FROM journeys WHERE status = 'active'").all();
  for (const journey of journeys) {
    const steps = JSON.parse(journey.steps || '[]');
    const triggerStep = steps.find(s => s.type === 'trigger');
    if (!triggerStep) continue;
    const cfg = triggerStep.config || {};
    if (cfg.trigger_type !== 'scheduled') continue;

    const nextRun = journey.next_run_at;
    if (!nextRun || nextRun > new Date().toISOString().slice(0, 19).replace('T', ' ')) continue;

    // Enroll matching contacts
    const audience = cfg.audience_filter || 'all';
    const contacts = audience === 'all'
      ? db.prepare('SELECT * FROM contacts').all()
      : db.prepare('SELECT * FROM contacts WHERE status = ?').all(audience);

    for (const c of contacts) enrollContact(journey.id, c.id);

    // Compute next run
    const nextScheduled = cfg.schedule_type === 'once'
      ? null
      : computeNextScheduled(cfg);

    const newStatus = cfg.schedule_type === 'once' ? 'paused' : journey.status;
    db.prepare("UPDATE journeys SET next_run_at = ?, status = ?, updated_at = datetime('now') WHERE id = ?")
      .run(nextScheduled, newStatus, journey.id);
  }
}

function startJourneyScheduler() {
  // Compute and store next_run_at for scheduled journeys on startup
  const journeys = db.prepare("SELECT * FROM journeys WHERE status = 'active'").all();
  for (const j of journeys) {
    const steps = JSON.parse(j.steps || '[]');
    const trig = steps.find(s => s.type === 'trigger');
    if (trig?.config?.trigger_type === 'scheduled' && !j.next_run_at) {
      const next = computeNextScheduled(trig.config);
      if (next) db.prepare('UPDATE journeys SET next_run_at = ? WHERE id = ?').run(next, j.id);
    }
  }

  setInterval(() => {
    try {
      runScheduledJourneys();
      const due = db.prepare(`
        SELECT * FROM journey_enrollments
        WHERE status = 'active' AND resume_at IS NOT NULL AND resume_at <= datetime('now')
      `).all();
      for (const e of due) {
        db.prepare('UPDATE journey_enrollments SET resume_at = NULL WHERE id = ?').run(e.id);
        advanceEnrollment(e).catch(err =>
          console.error(`[journey] Scheduler enrollment ${e.id}:`, err.message)
        );
      }
    } catch (err) {
      console.error('[journey] Scheduler error:', err.message);
    }
  }, 60_000);
  console.log('[journeys] Scheduler started');
}

module.exports = { fireTrigger, enrollContact, startJourneyScheduler, computeNextScheduled };
