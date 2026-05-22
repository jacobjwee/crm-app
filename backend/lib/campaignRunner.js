const db = require('../db');
const { sendEmail, sendSMS } = require('./send');

function computeNextRun(scheduleType, scheduleAt, scheduleDay) {
  if (!scheduleType || !scheduleAt) return null;
  if (scheduleType === 'once') return scheduleAt;

  const [hours, minutes] = scheduleAt.split(':').map(Number);
  const now = new Date();
  const next = new Date();
  next.setHours(hours, minutes, 0, 0);

  if (scheduleType === 'daily') {
    if (next <= now) next.setDate(next.getDate() + 1);
  } else if (scheduleType === 'weekly') {
    const day = scheduleDay ?? 1;
    let daysUntil = (day - next.getDay() + 7) % 7;
    if (daysUntil === 0 && next <= now) daysUntil = 7;
    next.setDate(next.getDate() + daysUntil);
  } else if (scheduleType === 'monthly') {
    const dom = scheduleDay ?? 1;
    next.setDate(dom);
    if (next <= now) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(dom);
    }
  }

  return next.toISOString().slice(0, 19).replace('T', ' ');
}

async function runCampaign(campaign, specificContact = null) {
  let contacts;
  if (specificContact) {
    contacts = [specificContact];
  } else if (campaign.audience_filter === 'all') {
    contacts = db.prepare('SELECT * FROM contacts').all();
  } else {
    contacts = db.prepare('SELECT * FROM contacts WHERE status = ?').all(campaign.audience_filter);
  }

  const results = [];
  for (const contact of contacts) {
    let status = 'sent';
    let error = null;
    try {
      if (campaign.channel === 'email') {
        if (!contact.email) { status = 'skipped'; error = 'No email address'; }
        else await sendEmail({ to: contact.email, subject: campaign.subject, body: campaign.body });
      } else {
        if (!contact.phone) { status = 'skipped'; error = 'No phone number'; }
        else await sendSMS({ to: contact.phone, body: campaign.body });
      }
    } catch (err) {
      status = 'failed';
      error = err.message;
    }
    db.prepare(
      'INSERT INTO campaign_runs (campaign_id, contact_id, status, error) VALUES (?, ?, ?, ?)'
    ).run(campaign.id, contact.id, status, error);

    if (status !== 'skipped') {
      db.prepare(
        'INSERT INTO messages (contact_id, channel, direction, subject, body, status) VALUES (?, ?, ?, ?, ?, ?)'
      ).run(contact.id, campaign.channel, 'outbound', campaign.subject || null, campaign.body, status);
    }

    results.push({ contact_id: contact.id, contact_name: contact.name, status, error });
  }

  const nextRun = campaign.schedule_type && campaign.schedule_type !== 'once'
    ? computeNextRun(campaign.schedule_type, campaign.schedule_at, campaign.schedule_day)
    : null;
  const newStatus = campaign.schedule_type === 'once' ? 'completed' : campaign.status;

  db.prepare('UPDATE campaigns SET last_run_at = datetime("now"), next_run_at = ?, status = ? WHERE id = ?')
    .run(nextRun, newStatus, campaign.id);

  return results;
}

async function fireTrigger(triggerType, contact, triggerValue = null) {
  const campaigns = db.prepare(
    "SELECT * FROM campaigns WHERE type = 'triggered' AND status = 'active' AND trigger_type = ?"
  ).all(triggerType);

  for (const campaign of campaigns) {
    if (triggerType === 'status_changed' && campaign.trigger_value !== triggerValue) continue;
    if (campaign.audience_filter !== 'all' && contact.status !== campaign.audience_filter) continue;
    runCampaign(campaign, contact).catch(err =>
      console.error(`Trigger campaign ${campaign.id} error:`, err.message)
    );
  }
}

function startScheduler() {
  setInterval(() => {
    try {
      const due = db.prepare(`
        SELECT * FROM campaigns
        WHERE type = 'scheduled' AND status = 'active'
          AND next_run_at IS NOT NULL AND next_run_at <= datetime('now')
      `).all();
      for (const c of due) {
        console.log(`[scheduler] Running campaign: ${c.name}`);
        runCampaign(c).catch(err => console.error(`[scheduler] Campaign ${c.id}:`, err.message));
      }
    } catch (err) {
      console.error('[scheduler] Error:', err.message);
    }
  }, 60_000);
  console.log('[campaigns] Scheduler started (60s interval)');
}

module.exports = { runCampaign, fireTrigger, startScheduler, computeNextRun };
