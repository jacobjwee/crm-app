import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJourneys, deleteJourney, runJourney } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../lib/toast';

function statusDot(s) {
  return { active: '#27ae60', paused: '#e67e22', draft: '#95a5b3' }[s] ?? '#95a5b3';
}

function stepSummary(stepsJson) {
  try {
    const steps = typeof stepsJson === 'string' ? JSON.parse(stepsJson) : stepsJson;
    const counts = {};
    steps.filter(s => s.type !== 'trigger').forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
    const parts = [];
    if (counts.send_email) parts.push(`✉ ${counts.send_email} email${counts.send_email > 1 ? 's' : ''}`);
    if (counts.send_sms)   parts.push(`💬 ${counts.send_sms} SMS`);
    if (counts.wait)       parts.push(`⏱ ${counts.wait} wait`);
    if (counts.update_status) parts.push(`🏷 update`);
    return parts.join(' · ') || 'No steps yet';
  } catch { return '—'; }
}

function triggerSummary(stepsJson) {
  try {
    const steps = typeof stepsJson === 'string' ? JSON.parse(stepsJson) : stepsJson;
    const trig = steps.find(s => s.type === 'trigger');
    const events = trig?.config?.events || [];
    if (events.length === 0) return 'No triggers';
    const labels = { contact_created: 'Contact created', 'status_changed:active': 'Status → Active', 'status_changed:lead': 'Status → Lead', 'status_changed:inactive': 'Status → Inactive' };
    return events.map(e => labels[e] || e).join(', ');
  } catch { return '—'; }
}

export default function Campaigns() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [running, setRunning] = useState(null);

  async function load() {
    try { setJourneys(await fetchJourneys()); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    const id = confirmId;
    setConfirmId(null);
    try {
      await deleteJourney(id);
      setJourneys(prev => prev.filter(j => j.id !== id));
      toast.success('Journey deleted');
    } catch (err) { toast.error(err.message); }
  }

  async function handleRun(id) {
    setRunning(id);
    try {
      const r = await runJourney(id);
      toast.success(`Enrolled ${r.enrolled} contact${r.enrolled !== 1 ? 's' : ''}`);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setRunning(null); }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Campaigns</h1>
        <Link to="/campaigns/new/edit" className="btn btn-primary">+ New Journey</Link>
      </div>

      {loading ? (
        <div className="loading">Loading…</div>
      ) : journeys.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗺</div>
            <p>No journeys yet.</p>
            <Link to="/campaigns/new/edit" className="btn btn-primary" style={{ marginTop: 16 }}>
              Build your first journey
            </Link>
          </div>
        </div>
      ) : (
        <div className="journey-list">
          {journeys.map(j => (
            <div key={j.id} className="journey-card">
              <div className="journey-card-left">
                <div className="journey-card-title">
                  <span className="journey-status-dot" style={{ background: statusDot(j.status) }} />
                  {j.name}
                  <span className="badge" style={{ background: statusDot(j.status) + '22', color: statusDot(j.status), fontSize: 11, marginLeft: 6 }}>
                    {j.status}
                  </span>
                </div>
                <div className="journey-card-meta">
                  <span>⚡ {triggerSummary(j.steps)}</span>
                  <span className="meta-sep">·</span>
                  <span>{stepSummary(j.steps)}</span>
                </div>
                <div className="journey-card-stats">
                  <span>{j.total_enrolled ?? 0} enrolled</span>
                  <span className="meta-sep">·</span>
                  <span style={{ color: '#27ae60' }}>{j.completed_count ?? 0} completed</span>
                  <span className="meta-sep">·</span>
                  <span style={{ color: '#4facfe' }}>{j.active_count ?? 0} in progress</span>
                </div>
              </div>
              <div className="journey-card-actions">
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => handleRun(j.id)}
                  disabled={running === j.id}
                  title="Enroll matching contacts now"
                >
                  {running === j.id ? '…' : '▶ Run'}
                </button>
                <Link to={`/campaigns/${j.id}/edit`} className="btn btn-secondary btn-sm">
                  Edit Journey
                </Link>
                <button className="btn btn-danger btn-sm" onClick={() => setConfirmId(j.id)}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {confirmId && (
        <ConfirmDialog
          message="This will delete the journey and all enrollment history."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}
