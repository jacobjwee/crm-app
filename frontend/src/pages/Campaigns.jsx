import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchJourneys, deleteJourney, runJourney } from '../api';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../lib/toast';
import { ChannelChip, PlusIcon, SparklesIcon, MegaphoneIcon } from '../components/Icons';

const T = {
  surface: '#FFFFFF', surfaceAlt: '#FAF9F5', border: '#E7E4DC', borderStrong: '#D9D5CB',
  text: '#0F1419', textDim: '#5C6470', textFaint: '#94A0AE',
  accent: '#2E8C82', accentSoft: '#E5F1EF',
  success: '#3E8C5A', warn: '#B6792B', danger: '#C3463A',
  mono: "'Geist Mono', ui-monospace, monospace",
};

function statusStyle(s) {
  const m = {
    active:   { bg: T.accentSoft, fg: T.accent,    dot: T.accent },
    paused:   { bg: '#FBF6EC',    fg: T.warn,       dot: T.warn },
    draft:    { bg: '#F0EEE7',    fg: T.textDim,    dot: T.textFaint },
    complete: { bg: '#EDE9F2',    fg: '#7A5C9A',    dot: '#7A5C9A' },
  };
  return m[s] || m.draft;
}

function guessChannel(steps) {
  try {
    const parsed = typeof steps === 'string' ? JSON.parse(steps) : steps;
    const types = parsed.map(s => s.type);
    if (types.includes('send_sms')) return 'sms';
    if (types.includes('send_email')) return 'email';
    return 'sms';
  } catch { return 'sms'; }
}

function stepSummary(stepsJson) {
  try {
    const steps = typeof stepsJson === 'string' ? JSON.parse(stepsJson) : stepsJson;
    const counts = {};
    steps.filter(s => s.type !== 'trigger').forEach(s => { counts[s.type] = (counts[s.type] || 0) + 1; });
    const parts = [];
    if (counts.send_email) parts.push(`${counts.send_email} email${counts.send_email > 1 ? 's' : ''}`);
    if (counts.send_sms)   parts.push(`${counts.send_sms} SMS`);
    if (counts.wait)       parts.push(`${counts.wait} wait`);
    return parts.join(' · ') || 'No steps yet';
  } catch { return '—'; }
}

function triggerLabel(stepsJson) {
  try {
    const steps = typeof stepsJson === 'string' ? JSON.parse(stepsJson) : stepsJson;
    const trig = steps.find(s => s.type === 'trigger');
    const cfg = trig?.config || {};
    if (cfg.trigger_type === 'contact_created') return 'Contact created';
    if (cfg.trigger_type === 'scheduled') return `Scheduled (${cfg.schedule_type || 'once'})`;
    if (cfg.trigger_type === 'event') return `Status → ${cfg.event_value || 'any'}`;
    const events = cfg.events || [];
    if (!events.length) return 'No trigger';
    return events[0].replace(/_/g, ' ').replace('status changed:', 'Status → ');
  } catch { return '—'; }
}

const FILTERS = ['All', 'Running', 'Scheduled', 'Drafts', 'Complete'];

export default function Campaigns() {
  const [journeys, setJourneys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [confirmId, setConfirmId] = useState(null);
  const [running, setRunning] = useState(null);
  const [filter, setFilter] = useState(0);
  const [activeId, setActiveId] = useState(null);

  async function load() {
    try {
      const data = await fetchJourneys();
      setJourneys(data);
      if (data.length > 0 && !activeId) setActiveId(data[0].id);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  useEffect(() => { load(); }, []);

  async function handleDelete() {
    const id = confirmId;
    setConfirmId(null);
    try {
      await deleteJourney(id);
      setJourneys(prev => prev.filter(j => j.id !== id));
      if (activeId === id) setActiveId(journeys.find(j => j.id !== id)?.id || null);
      toast.success('Campaign deleted');
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

  const activeJourney = journeys.find(j => j.id === activeId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', fontFamily: "'Geist', system-ui, sans-serif", color: T.text, height: '100%' }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 14, marginBottom: 20, paddingBottom: 18, borderBottom: `1px solid ${T.border}` }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: T.textDim, fontFamily: T.mono, marginBottom: 4 }}>CAMPAIGNS</div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>Outreach</h1>
          <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>
            {journeys.filter(j => j.status === 'active').length} running · {journeys.filter(j => j.status === 'draft').length} draft
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={secondaryBtn}>
            <SparklesIcon size={13} stroke={T.accent}/> Suggest from inbox
          </button>
          <Link to="/campaigns/new/edit" style={primaryBtn}>
            <PlusIcon size={13} strokeWidth={2.2}/> New campaign
          </Link>
        </div>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Loading…</div>
      ) : journeys.length === 0 ? (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '44px 24px', textAlign: 'center' }}>
          <MegaphoneIcon size={32} stroke={T.textFaint} style={{ margin: '0 auto 12px' }}/>
          <p style={{ fontSize: 14, color: T.textDim, marginBottom: 16 }}>No campaigns yet.</p>
          <Link to="/campaigns/new/edit" style={primaryBtn}>Build your first campaign</Link>
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', gap: 0, background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, overflow: 'hidden', minHeight: 0 }}>
          {/* Campaign list */}
          <div style={{ width: 360, borderRight: `1px solid ${T.border}`, overflow: 'auto', flexShrink: 0 }}>
            {/* Filter chips */}
            <div style={{ padding: '10px 14px', display: 'flex', gap: 4, borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
              {FILTERS.map((f, i) => (
                <button key={i} onClick={() => setFilter(i)} style={{
                  padding: '4px 10px', borderRadius: 5,
                  border: `1px solid ${i === filter ? T.accentSoft : T.border}`,
                  background: i === filter ? T.accentSoft : 'transparent',
                  color: i === filter ? T.accent : T.textDim,
                  fontSize: 11.5, fontWeight: i === filter ? 600 : 500,
                  cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
                }}>{f}</button>
              ))}
            </div>

            {journeys.map((j, i) => {
              const ss = statusStyle(j.status);
              const isActive = j.id === activeId;
              const ch = guessChannel(j.steps);
              const pct = j.total_enrolled ? Math.round((j.completed_count || 0) / j.total_enrolled * 100) : 0;
              return (
                <div key={j.id} onClick={() => setActiveId(j.id)} style={{
                  padding: '14px 16px', borderBottom: `1px solid ${T.border}`,
                  cursor: 'pointer',
                  background: isActive ? T.surfaceAlt : 'transparent',
                  borderLeft: isActive ? `2px solid ${T.accent}` : '2px solid transparent',
                  paddingLeft: isActive ? 14 : 16,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <ChannelChip channel={ch} size={11}/>
                    <div style={{ flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 500, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {j.name}
                    </div>
                    <span style={{ fontSize: 10, padding: '1px 7px', borderRadius: 3, fontWeight: 600, background: ss.bg, color: ss.fg }}>
                      {j.status}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 10, fontSize: 11, color: T.textDim, fontFamily: T.mono, marginBottom: 6 }}>
                    <span>{(j.total_enrolled || 0).toLocaleString()} enrolled</span>
                    <span style={{ color: T.success }}>{(j.completed_count || 0).toLocaleString()} done</span>
                    <span style={{ color: T.accent }}>{(j.active_count || 0).toLocaleString()} active</span>
                  </div>
                  {j.total_enrolled > 0 && (
                    <div style={{ height: 3, background: T.surfaceAlt, borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: T.accent, borderRadius: 2 }}/>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Builder / detail */}
          <div style={{ flex: 1, overflow: 'auto', background: T.surfaceAlt, padding: '24px 28px' }}>
            {!activeJourney ? (
              <div style={{ textAlign: 'center', color: T.textFaint, paddingTop: 60 }}>Select a campaign</div>
            ) : (
              <CampaignDetail journey={activeJourney} onRun={handleRun} onDelete={setConfirmId} running={running}/>
            )}
          </div>
        </div>
      )}

      {confirmId && (
        <ConfirmDialog
          message="This will delete the campaign and all enrollment history."
          onConfirm={handleDelete}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

function CampaignDetail({ journey: j, onRun, onDelete, running }) {
  const ss = statusStyle(j.status);
  const kpis = [
    { label: 'Enrolled', v: j.total_enrolled ?? 0 },
    { label: 'Completed', v: j.completed_count ?? 0 },
    { label: 'In progress', v: j.active_count ?? 0 },
    { label: 'Success rate', v: j.total_enrolled ? `${Math.round((j.completed_count || 0) / j.total_enrolled * 100)}%` : '—' },
  ];

  let steps = [];
  try { steps = typeof j.steps === 'string' ? JSON.parse(j.steps) : j.steps; } catch {}
  const nonTrigger = steps.filter(s => s.type !== 'trigger');

  return (
    <div style={{ maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Header card */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, color: T.text, flex: 1 }}>{j.name}</h2>
          <span style={{ fontSize: 11, padding: '3px 9px', borderRadius: 4, background: ss.bg, color: ss.fg, fontWeight: 600 }}>
            ● {j.status}
          </span>
          <Link to={`/campaigns/${j.id}/edit`} style={{
            padding: '5px 12px', borderRadius: 6, background: T.surface, color: T.text,
            border: `1px solid ${T.border}`, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none',
          }}>Edit</Link>
          <button onClick={() => onRun(j.id)} disabled={running === j.id} style={{
            padding: '5px 14px', borderRadius: 6, background: T.accent, color: '#fff',
            border: 'none', fontSize: 12, fontFamily: 'inherit', fontWeight: 600, cursor: 'pointer',
          }}>
            {running === j.id ? '…' : '▶ Run now'}
          </button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {kpis.map((k, i) => (
            <div key={i} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: T.text, fontFamily: T.mono, letterSpacing: '-0.01em' }}>{k.v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trigger */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: 6, background: T.accentSoft, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: T.mono }}>1</div>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Trigger</h3>
        </div>
        <div style={{ fontSize: 13, color: T.textDim }}>⚡ {triggerLabel(j.steps)}</div>
      </div>

      {/* Steps */}
      {nonTrigger.length > 0 && (
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 22, height: 22, borderRadius: 6, background: T.accentSoft, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, fontFamily: T.mono }}>2</div>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Sequence</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {nonTrigger.map((s, i) => {
              const typeLabels = { send_email: 'Email', send_sms: 'SMS', wait: 'Wait', update_status: 'Update status', send_booking_link: 'Booking link' };
              const chMap = { send_email: 'email', send_sms: 'sms', send_booking_link: 'sms' };
              return (
                <div key={i} style={{
                  display: 'flex', gap: 14, alignItems: 'flex-start',
                  padding: '10px 12px', background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 100 }}>
                    <span style={{ fontSize: 11, color: T.textFaint, fontFamily: T.mono }}>Step {i + 1}</span>
                    {chMap[s.type] && <ChannelChip channel={chMap[s.type]} size={10}/>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: T.text, marginBottom: 3 }}>{typeLabels[s.type] || s.type}</div>
                    {s.config?.subject && <div style={{ fontSize: 11.5, color: T.textDim }}>Subject: {s.config.subject}</div>}
                    {s.config?.body && (
                      <div style={{ fontSize: 12, color: T.textDim, fontFamily: T.mono, background: T.surface, padding: '6px 9px', borderRadius: 5, marginTop: 5 }}>
                        {s.config.body.slice(0, 100)}{s.config.body.length > 100 ? '…' : ''}
                      </div>
                    )}
                    {s.config?.days != null && <div style={{ fontSize: 11.5, color: T.textDim }}>Wait {s.config.days} day{s.config.days !== 1 ? 's' : ''}</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Delete */}
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={() => onDelete(j.id)} style={{
          padding: '7px 14px', borderRadius: 7, background: '#fdecea', color: '#C3463A',
          border: '1px solid #f5c6c2', fontFamily: 'inherit', fontSize: 12, cursor: 'pointer',
        }}>Delete campaign</button>
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: '8px 14px', borderRadius: 7, background: '#2E8C82', color: '#fff',
  border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none',
};

const secondaryBtn = {
  padding: '8px 14px', borderRadius: 7, background: '#fff', color: '#0F1419',
  border: '1px solid #E7E4DC', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};
