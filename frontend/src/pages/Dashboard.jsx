import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchDashboard } from '../api';
import {
  Avatar, ChannelChip,
  ChatIcon, ClockIcon, CalendarIcon, FlagIcon,
  MegaphoneIcon, PlusIcon, SparklesIcon,
} from '../components/Icons';

const T = {
  bg: '#F6F5F1', surface: '#FFFFFF', surfaceAlt: '#FAF9F5',
  border: '#E7E4DC', text: '#0F1419', textDim: '#5C6470', textFaint: '#94A0AE',
  accent: '#2E8C82', accentSoft: '#E5F1EF',
  success: '#3E8C5A', warn: '#B6792B', danger: '#C3463A',
  mono: "'Geist Mono', ui-monospace, monospace",
};

const SCHEDULE_SLOTS = [
  { time: '8:30', name: 'D. Reyes', type: 'Blood draw', status: 'arrived' },
  { time: '9:00', name: 'A. Patel', type: 'New patient', status: 'confirmed' },
  { time: '9:30', name: 'S. Bianchi', type: 'Follow-up', status: 'confirmed' },
  { time: '10:00', name: 'M. Lin', type: 'Annual physical', status: 'no-show' },
  { time: '10:30', name: 'O. Carter', type: 'Vaccination', status: 'in-room' },
  { time: '11:00', name: '—', type: 'Open', status: 'open' },
  { time: '11:30', name: 'S. Chen (peds)', type: 'Sick visit', status: 'confirmed' },
];

const STATUS_SC = {
  arrived:  { bg: T.accentSoft, fg: T.accent,   label: 'Arrived' },
  confirmed:{ bg: '#F0EEE7',    fg: T.textDim,   label: 'Confirmed' },
  'no-show':{ bg: '#FBE8E5',    fg: T.danger,    label: 'No-show' },
  'in-room':{ bg: '#E6F2EA',    fg: T.success,   label: 'In room' },
  open:     { bg: 'transparent',fg: T.textFaint, label: 'Open' },
};

const FOLLOWUPS = [
  { tag: 'No-show recovery', count: 3, label: 'Marcus, Greg, Hannah', cta: 'Send draft' },
  { tag: 'Pre-visit reminders', count: 8, label: 'Tomorrow 9am', cta: 'Schedule' },
  { tag: 'Lab follow-ups', count: 5, label: 'Past 7 days', cta: 'Review' },
  { tag: 'Birthday greetings', count: 4, label: 'This week', cta: 'Auto-send' },
  { tag: 'Annual exam due', count: 12, label: 'Apr–Jun cohort', cta: 'Start campaign' },
];

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (!data)   return <div className="loading">Failed to load.</div>;

  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();

  return (
    <div style={{ fontFamily: "'Geist', system-ui, sans-serif", color: T.text }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 16,
        borderBottom: `1px solid ${T.border}`,
        paddingBottom: 18, marginBottom: 22,
      }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 11.5, color: T.textDim, fontFamily: T.mono, marginBottom: 4 }}>{today}</div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600, color: T.text, letterSpacing: '-0.02em' }}>
            Good morning
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => navigate('/campaigns')} style={secondaryBtn}>
            <MegaphoneIcon size={13}/> Start campaign
          </button>
          <button onClick={() => navigate('/contacts')} style={primaryBtn}>
            <PlusIcon size={13} strokeWidth={2.2}/> New patient
          </button>
        </div>
      </div>

      {/* KPI strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: 'Total Patients', v: String(data.totalContacts), delta: 'all time',   good: true,  sub: `${data.activeContacts} active`,         Icon: ChatIcon },
          { label: 'Active',         v: String(data.activeContacts), delta: 'of total',  good: true,  sub: 'last 90 days',                          Icon: ClockIcon },
          { label: 'Notes',          v: String(data.totalNotes),     delta: 'total',     good: true,  sub: 'across all patients',                   Icon: CalendarIcon },
          { label: 'No-show risk',   v: '4',                         delta: '3 drafted', good: false, sub: 'upcoming thu + fri',                    Icon: FlagIcon },
        ].map((k, i) => (
          <div key={i} style={{
            background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12,
            padding: '16px 18px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: 11, color: T.textDim, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>{k.label}</span>
              <span style={{ width: 26, height: 26, borderRadius: 6, background: T.accentSoft, color: T.accent, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <k.Icon size={13}/>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 28, fontWeight: 600, color: T.text, fontFamily: T.mono, letterSpacing: '-0.02em' }}>{k.v}</span>
              <span style={{ fontSize: 11.5, color: k.good ? T.success : T.warn, fontWeight: 500 }}>{k.delta}</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.textFaint }}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18, marginBottom: 18 }}>
        {/* Inbox snapshot */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Inbox snapshot</div>
              <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 2 }}>What needs you in the next hour</div>
            </div>
            <button onClick={() => navigate('/inbox')} style={{ marginLeft: 'auto', fontSize: 12, color: T.accent, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Open inbox →
            </button>
          </div>
          {data.recentContacts.slice(0, 5).map((c, i) => {
            const channels = ['sms', 'whatsapp', 'email', 'sms', 'voice'];
            return (
              <Link key={c.id} to={`/contacts/${c.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 18px', borderBottom: i < data.recentContacts.slice(0, 5).length - 1 ? `1px solid ${T.border}` : 'none',
                  cursor: 'pointer',
                }}>
                  <Avatar name={c.name} size={28}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email || c.company || '—'}
                    </div>
                  </div>
                  <ChannelChip channel={channels[i % channels.length]} size={11}/>
                  <span style={{ fontSize: 10.5, color: T.textFaint, fontFamily: T.mono, width: 28, textAlign: 'right' }}>{i === 0 ? '2m' : `${i * 8}m`}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Today schedule */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Today · Dr. Lin</div>
              <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 2 }}>7 booked · 1 open · 1 no-show</div>
            </div>
            <button onClick={() => navigate('/schedule')} style={{ marginLeft: 'auto', fontSize: 12, color: T.accent, background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
              Calendar →
            </button>
          </div>
          {SCHEDULE_SLOTS.map((s, i) => {
            const sc = STATUS_SC[s.status];
            const isCurrent = s.time === '10:30';
            return (
              <div key={i} style={{
                display: 'flex', gap: 10, padding: '8px 18px',
                borderBottom: i < SCHEDULE_SLOTS.length - 1 ? `1px solid ${T.border}` : 'none',
                background: isCurrent ? T.accentSoft : 'transparent',
                borderLeft: isCurrent ? `2px solid ${T.accent}` : '2px solid transparent',
                alignItems: 'center',
              }}>
                <span style={{ fontFamily: T.mono, fontSize: 11.5, color: T.textDim, width: 36, flexShrink: 0 }}>{s.time}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: s.status === 'open' ? 400 : 500, color: s.status === 'open' ? T.textFaint : T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: T.textFaint }}>{s.type}</div>
                </div>
                <span style={{
                  fontSize: 10, padding: '2px 7px', borderRadius: 4,
                  background: sc.bg, color: sc.fg, fontWeight: 600,
                  border: s.status === 'open' ? `1px dashed ${T.border}` : 'none', flexShrink: 0,
                }}>{sc.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Row 2 */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        {/* Trends / recent notes */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '14px 18px 16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Recent activity</div>
              <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 2 }}>Latest notes across patients</div>
            </div>
          </div>
          {data.recentNotes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '20px 0', color: T.textFaint, fontSize: 13 }}>No notes yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data.recentNotes.map(note => (
                <div key={note.id} style={{ display: 'flex', gap: 12 }}>
                  <Avatar name={note.contact_name} size={28}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link to={`/contacts/${note.contact_id}`} style={{ fontWeight: 600, fontSize: 13, textDecoration: 'none', color: T.text }}>
                      {note.contact_name}
                    </Link>
                    <p style={{ fontSize: 12.5, color: T.textDim, margin: '2px 0', lineHeight: 1.45, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {note.content.length > 72 ? note.content.slice(0, 72) + '…' : note.content}
                    </p>
                    <p style={{ fontSize: 11, color: T.textFaint, fontFamily: T.mono }}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Suggested follow-ups */}
        <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12 }}>
          <div style={{ padding: '14px 18px', borderBottom: `1px solid ${T.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <SparklesIcon size={14} stroke={T.accent}/>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Suggested follow-ups</div>
            </div>
            <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 2 }}>Patients due for outreach</div>
          </div>
          {FOLLOWUPS.map((it, i) => (
            <div key={i} style={{
              padding: '10px 18px', borderBottom: i < FOLLOWUPS.length - 1 ? `1px solid ${T.border}` : 'none',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: 7, background: T.accentSoft, color: T.accent,
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontFamily: T.mono, fontSize: 12,
                flexShrink: 0,
              }}>{it.count}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12.5, fontWeight: 500, color: T.text }}>{it.tag}</div>
                <div style={{ fontSize: 11, color: T.textFaint }}>{it.label}</div>
              </div>
              <button style={{
                fontSize: 11.5, padding: '4px 11px', borderRadius: 5,
                background: T.surface, color: T.text, border: `1px solid ${T.border}`,
                cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
              }}>{it.cta}</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const primaryBtn = {
  padding: '8px 14px', borderRadius: 7, background: '#2E8C82', color: '#fff',
  border: 'none', fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 600,
};

const secondaryBtn = {
  padding: '8px 14px', borderRadius: 7, background: '#fff', color: '#0F1419',
  border: '1px solid #E7E4DC', fontFamily: 'inherit', fontSize: 12.5, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500,
};
