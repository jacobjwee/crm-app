import { useState, useEffect } from 'react';
import { fetchCampaigns, createCampaign, updateCampaign, deleteCampaign, runCampaign, fetchCampaign } from '../api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../lib/toast';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const STATUS_OPTIONS = ['active', 'lead', 'inactive'];

const BLANK = {
  name: '', channel: 'email', type: 'scheduled', subject: '', body: '',
  status: 'active', audience_filter: 'all',
  schedule_type: 'once', schedule_at: '', schedule_day: 1,
  trigger_type: 'contact_created', trigger_value: 'lead',
};

function statusColor(s) {
  return { active: '#27ae60', paused: '#e67e22', draft: '#95a5b3', completed: '#2980b9' }[s] || '#95a5b3';
}

function channelColor(c) {
  return c === 'email' ? '#2980b9' : '#27ae60';
}

function describeSchedule(c) {
  if (c.type === 'triggered') {
    if (c.trigger_type === 'contact_created') return 'When contact is created';
    if (c.trigger_type === 'status_changed') return `When status → ${c.trigger_value}`;
  }
  if (!c.schedule_type) return '—';
  if (c.schedule_type === 'once') return `Once · ${c.schedule_at ? new Date(c.schedule_at).toLocaleString() : '—'}`;
  if (c.schedule_type === 'daily') return `Daily at ${c.schedule_at}`;
  if (c.schedule_type === 'weekly') return `Weekly · ${DAYS[c.schedule_day ?? 1]} at ${c.schedule_at}`;
  if (c.schedule_type === 'monthly') return `Monthly · Day ${c.schedule_day ?? 1} at ${c.schedule_at}`;
  return '—';
}

export default function Campaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const [runsModal, setRunsModal] = useState(null);
  const [running, setRunning] = useState(null);

  async function load() {
    try { setCampaigns(await fetchCampaigns()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditing(null);
    setForm(BLANK);
    setShowModal(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      name: c.name, channel: c.channel, type: c.type, subject: c.subject || '',
      body: c.body, status: c.status, audience_filter: c.audience_filter,
      schedule_type: c.schedule_type || 'once', schedule_at: c.schedule_at || '',
      schedule_day: c.schedule_day ?? 1,
      trigger_type: c.trigger_type || 'contact_created', trigger_value: c.trigger_value || 'lead',
    });
    setShowModal(true);
  }

  function set(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })); }
  function setVal(key, val) { setForm(f => ({ ...f, [key]: val })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.body.trim()) { toast.error('Message body is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (form.type === 'triggered') {
        delete payload.schedule_type; delete payload.schedule_at; delete payload.schedule_day;
      } else {
        delete payload.trigger_type; delete payload.trigger_value;
      }
      if (editing) {
        await updateCampaign(editing.id, payload);
        toast.success('Campaign updated');
      } else {
        await createCampaign(payload);
        toast.success('Campaign created');
      }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    const id = confirmId;
    setConfirmId(null);
    try {
      await deleteCampaign(id);
      setCampaigns(prev => prev.filter(c => c.id !== id));
      toast.success('Campaign deleted');
    } catch (err) { toast.error(err.message); }
  }

  async function handleRun(id) {
    setRunning(id);
    try {
      const result = await runCampaign(id);
      toast.success(`Sent ${result.sent}, skipped ${result.skipped}, failed ${result.failed}`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setRunning(null); }
  }

  async function openRuns(id) {
    try {
      const data = await fetchCampaign(id);
      setRunsModal(data);
    } catch (err) { toast.error(err.message); }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Campaigns</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ New Campaign</button>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : campaigns.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📣</div>
            <p>No campaigns yet. Create your first one!</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Campaign</th>
                <th>Channel</th>
                <th>Type / Schedule</th>
                <th>Audience</th>
                <th>Status</th>
                <th>Sends</th>
                <th>Last Run</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {campaigns.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td>
                    <span className="badge" style={{ background: channelColor(c.channel) + '22', color: channelColor(c.channel) }}>
                      {c.channel === 'email' ? '✉ email' : '💬 sms'}
                    </span>
                  </td>
                  <td style={{ fontSize: 13, color: '#7f8c9a' }}>{describeSchedule(c)}</td>
                  <td style={{ fontSize: 13, color: '#7f8c9a', textTransform: 'capitalize' }}>
                    {c.audience_filter === 'all' ? 'All contacts' : c.audience_filter}
                  </td>
                  <td>
                    <span className="badge" style={{ background: statusColor(c.status) + '22', color: statusColor(c.status) }}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <button className="btn btn-secondary btn-sm" style={{ fontSize: 12 }} onClick={() => openRuns(c.id)}>
                      {c.sent_count ?? 0} sent
                    </button>
                  </td>
                  <td style={{ fontSize: 13, color: '#95a5b3' }}>
                    {c.last_run_at ? new Date(c.last_run_at).toLocaleDateString() : '—'}
                  </td>
                  <td>
                    <div className="action-buttons">
                      {c.status !== 'completed' && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleRun(c.id)}
                          disabled={running === c.id}
                        >
                          {running === c.id ? '…' : '▶ Run'}
                        </button>
                      )}
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Create / Edit modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Campaign' : 'New Campaign'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Campaign Name *</label>
              <input required value={form.name} onChange={set('name')} placeholder="e.g. Welcome Email, Weekly Newsletter" />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Channel</label>
                <div className="channel-tabs" style={{ width: 'fit-content' }}>
                  <button type="button" className={`channel-tab${form.channel === 'email' ? ' active' : ''}`} onClick={() => setVal('channel', 'email')}>✉ Email</button>
                  <button type="button" className={`channel-tab${form.channel === 'sms' ? ' active' : ''}`} onClick={() => setVal('channel', 'sms')}>💬 SMS</button>
                </div>
              </div>
              <div className="form-group">
                <label>Type</label>
                <div className="channel-tabs" style={{ width: 'fit-content' }}>
                  <button type="button" className={`channel-tab${form.type === 'scheduled' ? ' active' : ''}`} onClick={() => setVal('type', 'scheduled')}>🗓 Scheduled</button>
                  <button type="button" className={`channel-tab${form.type === 'triggered' ? ' active' : ''}`} onClick={() => setVal('type', 'triggered')}>⚡ Triggered</button>
                </div>
              </div>
            </div>

            {/* Scheduled fields */}
            {form.type === 'scheduled' && (
              <div className="campaign-config-box">
                <div className="form-group">
                  <label>Frequency</label>
                  <select value={form.schedule_type} onChange={set('schedule_type')}>
                    <option value="once">Once</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
                {form.schedule_type === 'once' && (
                  <div className="form-group">
                    <label>Send At</label>
                    <input type="datetime-local" value={form.schedule_at} onChange={set('schedule_at')} />
                  </div>
                )}
                {form.schedule_type === 'daily' && (
                  <div className="form-group">
                    <label>Time of Day</label>
                    <input type="time" value={form.schedule_at} onChange={set('schedule_at')} />
                  </div>
                )}
                {form.schedule_type === 'weekly' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Day</label>
                      <select value={form.schedule_day} onChange={e => setVal('schedule_day', parseInt(e.target.value))}>
                        {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Time</label>
                      <input type="time" value={form.schedule_at} onChange={set('schedule_at')} />
                    </div>
                  </div>
                )}
                {form.schedule_type === 'monthly' && (
                  <div className="form-row">
                    <div className="form-group">
                      <label>Day of Month</label>
                      <select value={form.schedule_day} onChange={e => setVal('schedule_day', parseInt(e.target.value))}>
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Time</label>
                      <input type="time" value={form.schedule_at} onChange={set('schedule_at')} />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Triggered fields */}
            {form.type === 'triggered' && (
              <div className="campaign-config-box">
                <div className="form-group">
                  <label>Trigger Event</label>
                  <select value={form.trigger_type} onChange={set('trigger_type')}>
                    <option value="contact_created">Contact is created</option>
                    <option value="status_changed">Contact status changes to…</option>
                  </select>
                </div>
                {form.trigger_type === 'status_changed' && (
                  <div className="form-group">
                    <label>Status Value</label>
                    <select value={form.trigger_value} onChange={set('trigger_value')}>
                      {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="form-row">
              <div className="form-group">
                <label>Audience</label>
                <select value={form.audience_filter} onChange={set('audience_filter')}>
                  <option value="all">All contacts</option>
                  <option value="active">Active only</option>
                  <option value="lead">Leads only</option>
                  <option value="inactive">Inactive only</option>
                </select>
              </div>
              <div className="form-group">
                <label>Campaign Status</label>
                <select value={form.status} onChange={set('status')}>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="draft">Draft</option>
                </select>
              </div>
            </div>

            {form.channel === 'email' && (
              <div className="form-group">
                <label>Subject</label>
                <input value={form.subject} onChange={set('subject')} placeholder="Email subject line" />
              </div>
            )}

            <div className="form-group">
              <label>Message Body *</label>
              <textarea
                required
                value={form.body}
                onChange={set('body')}
                placeholder={form.channel === 'email' ? 'Write your email…' : 'Write your SMS (160 chars recommended)…'}
                style={{ minHeight: 100 }}
                maxLength={form.channel === 'sms' ? 1600 : undefined}
              />
              {form.channel === 'sms' && form.body.length > 0 && (
                <div style={{ fontSize: 12, color: '#95a5b3', marginTop: 4 }}>{form.body.length} / 160</div>
              )}
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Create Campaign'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Run history modal */}
      {runsModal && (
        <Modal title={`Runs — ${runsModal.name}`} onClose={() => setRunsModal(null)}>
          {runsModal.runs.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No runs yet. Use "Run Now" to send immediately.</p>
            </div>
          ) : (
            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>Contact</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {runsModal.runs.map(r => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 500 }}>{r.contact_name || '(deleted)'}</td>
                      <td>
                        <span className="badge" style={{
                          background: r.status === 'sent' ? '#eafaf1' : r.status === 'failed' ? '#fdecea' : '#f5f6fa',
                          color: r.status === 'sent' ? '#27ae60' : r.status === 'failed' ? '#e74c3c' : '#95a5b3',
                        }}>{r.status}</span>
                      </td>
                      <td style={{ fontSize: 12, color: '#95a5b3' }}>{new Date(r.ran_at).toLocaleString()}</td>
                      <td style={{ fontSize: 12, color: '#e74c3c' }}>{r.error || ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="form-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-secondary" onClick={() => setRunsModal(null)}>Close</button>
          </div>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message="This will permanently delete the campaign and all its run history."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
