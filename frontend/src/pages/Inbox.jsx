import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, ChannelChip,
  SearchIcon, FilterIcon, MoreIcon, PhoneIcon, CalendarIcon,
  StarIcon, SparklesIcon, PaperclipIcon, SendIcon, BoltIcon,
  ChevronRightIcon, TagIcon,
} from '../components/Icons';

const T = {
  bg: '#F6F5F1', surface: '#FFFFFF', surfaceAlt: '#FAF9F5',
  border: '#E7E4DC', borderStrong: '#D9D5CB',
  text: '#0F1419', textDim: '#5C6470', textFaint: '#94A0AE',
  accent: '#2E8C82', accentSoft: '#E5F1EF',
  success: '#3E8C5A', warn: '#B6792B', danger: '#C3463A',
  mono: "'Geist Mono', ui-monospace, monospace",
};

const THREADS = [
  { id: 1, name: 'Maya Okafor',       ch: 'sms',      preview: 'reschedule Thu 3pm → 5:30 same day?',  time: '2m',  unread: true,  urgent: true,  ai: true,  tags: ['VIP'] },
  { id: 2, name: 'Daniel Reyes',      ch: 'whatsapp', preview: 'fast 12h before blood draw?',           time: '9m',  unread: true },
  { id: 3, name: 'Aisha Patel',       ch: 'sms',      preview: 'insurance card uploaded',               time: '14m', unread: false, attach: true },
  { id: 4, name: 'Marcus Lin',        ch: 'sms',      preview: 'no-show 10am — outreach drafted',       time: '1h',  unread: true,  urgent: true,  ai: true },
  { id: 5, name: 'Priya Ramaswamy',   ch: 'voice',    preview: 'voicemail · new patient inquiry',       time: '2h',  unread: false },
  { id: 6, name: 'Hugo Pereira',      ch: 'whatsapp', preview: 'rx refill request: metformin 500mg',    time: '6h',  unread: false, tags: ['Chronic'] },
  { id: 7, name: 'Sofia Bianchi',     ch: 'email',    preview: 'Question about my upcoming visit',      time: 'Yest', unread: false },
  { id: 8, name: 'Owen Carter',       ch: 'sms',      preview: 'Confirmed for Monday',                  time: '2d',  unread: false },
];

const MESSAGES = {
  1: [
    { id: 1, who: 'patient', body: 'Hi, can I move my Thursday 3pm? Something came up at work and I might not make it back in time. Would 5:30 same day work?', time: 'Today 9:12 AM', ch: 'sms' },
    { id: 2, who: 'event', body: 'Lumen drafted a reschedule reply · Thu 5:30 PM', time: 'Today 9:13 AM', event: true },
    { id: 3, who: 'staff', body: 'Hi Maya! I\'ve moved you to 5:30 PM Thursday. You\'ll receive a confirmation. See you then!', time: 'Yesterday 7:04 PM', ch: 'sms', author: 'Jordan K.' },
  ],
  default: [
    { id: 1, who: 'patient', body: 'Hi, I had a quick question about my upcoming appointment.', time: 'Today 10:30 AM', ch: 'sms' },
  ],
};

const AI_SUGGESTION = "Hi Maya, no problem at all! I've moved your appointment to Thursday at 5:30 PM with Dr. Lin. You'll receive a reminder the morning of. Let me know if you need anything else!";

const PATIENT_PANEL = {
  name: 'Maya Okafor', age: 34, since: '2017',
  phone: '(415) 555-0149', provider: 'Dr. J. Lin',
  nextAppt: 'Thu May 28 · 5:30 PM',
  visits: 14, noShows: 0,
  tags: ['VIP', 'SMS preferred', 'Annual labs'],
  note: 'Allergic to penicillin (anaphylaxis 2018). Use cephalosporins with caution.',
};

const FILTERS = ['All · 142', 'Unread · 12', 'Assigned to me · 28', 'Unassigned · 4'];

export default function Inbox() {
  const [activeThread, setActiveThread] = useState(THREADS[0]);
  const [filter, setFilter] = useState(0);
  const [channel, setChannel] = useState('sms');
  const [body, setBody] = useState('');
  const [showAI, setShowAI] = useState(true);
  const navigate = useNavigate();
  const msgs = MESSAGES[activeThread.id] || MESSAGES.default;

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 56px)',
      margin: '-28px -32px', background: T.bg,
      fontFamily: "'Geist', system-ui, sans-serif",
    }}>
      {/* Thread list */}
      <div style={{
        width: 340, background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        {/* Header */}
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: T.text, flex: 1 }}>Inbox</span>
            <button style={iconBtn(T)}><FilterIcon size={14}/></button>
            <button style={iconBtn(T)}><MoreIcon size={14}/></button>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px',
            background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7,
          }}>
            <SearchIcon size={13} stroke={T.textFaint}/>
            <input placeholder="Search patients, messages…" style={{
              flex: 1, border: 0, outline: 0, background: 'transparent',
              fontSize: 12.5, color: T.text, fontFamily: 'inherit',
            }}/>
          </div>
        </div>

        {/* Filter chips */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 14px', borderBottom: `1px solid ${T.border}`, overflowX: 'auto' }}>
          {FILTERS.map((f, i) => (
            <button key={i} onClick={() => setFilter(i)} style={{
              padding: '4px 10px', borderRadius: 5, border: `1px solid ${i === filter ? T.accentSoft : T.border}`,
              background: i === filter ? T.accentSoft : 'transparent',
              color: i === filter ? T.accent : T.textDim,
              fontSize: 11.5, fontWeight: i === filter ? 600 : 500,
              cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit',
            }}>{f}</button>
          ))}
        </div>

        {/* Threads */}
        <div style={{ flex: 1, overflow: 'auto' }}>
          {THREADS.map(t => {
            const isActive = t.id === activeThread.id;
            return (
              <div key={t.id} onClick={() => setActiveThread(t)} style={{
                padding: '11px 14px', borderBottom: `1px solid ${T.border}`,
                cursor: 'pointer', position: 'relative',
                background: isActive ? T.surface : 'transparent',
                borderLeft: isActive ? `2px solid ${T.accent}` : '2px solid transparent',
                paddingLeft: isActive ? 12 : 14,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                  <Avatar name={t.name} size={32}/>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                      <span style={{ fontSize: 12.5, fontWeight: t.unread ? 600 : 500, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.name}
                      </span>
                      <span style={{ fontSize: 10.5, color: T.textFaint, fontFamily: T.mono, flexShrink: 0 }}>{t.time}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                      <ChannelChip channel={t.ch} size={11}/>
                      {t.ai && <span style={{ fontSize: 9.5, color: T.accent, fontFamily: T.mono, fontWeight: 700 }}>✨ AI</span>}
                      {t.attach && <PaperclipIcon size={11} stroke={T.textFaint}/>}
                      {t.unread && (
                        <span style={{
                          marginLeft: 'auto', width: 18, height: 18, borderRadius: '50%',
                          background: T.accent, color: '#fff', fontSize: 10,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontFamily: T.mono, fontWeight: 700,
                        }}>1</span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: t.unread ? T.text : T.textDim, fontWeight: t.unread ? 500 : 400, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.preview}
                    </div>
                    {(t.tags?.length > 0 || t.urgent) && (
                      <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                        {t.urgent && <span style={{ fontSize: 9.5, padding: '0 5px', borderRadius: 3, background: '#FBE8E5', color: T.danger, fontFamily: T.mono, fontWeight: 600 }}>URGENT</span>}
                        {t.tags?.map((tag, j) => (
                          <span key={j} style={{ fontSize: 10, padding: '1px 6px', borderRadius: 3, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textDim }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Conversation */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.surface }}>
        {/* Conv header */}
        <div style={{ padding: '14px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          <Avatar name={activeThread.name} size={36}/>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 2 }}>{activeThread.name}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: T.textDim }}>
              <ChannelChip channel={activeThread.ch} size={10}/>
              <span>{activeThread.ch}</span>
              <span>·</span>
              <span>Dr. Lin</span>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: T.success, display: 'inline-block' }}/>
              <span>Active patient</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button style={iconBtn(T)}><PhoneIcon size={14}/></button>
            <button style={iconBtn(T)} onClick={() => navigate('/schedule')}><CalendarIcon size={14}/></button>
            <button style={iconBtn(T)}><StarIcon size={14}/></button>
            <button style={iconBtn(T)}><MoreIcon size={14}/></button>
          </div>
        </div>

        {/* Messages */}
        <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}>
            <span style={{ display: 'inline-block', fontSize: 11, color: T.textDim, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: '3px 10px' }}>
              Today
            </span>
          </div>
          {msgs.map(m => {
            if (m.event) {
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    fontSize: 11.5, color: T.textDim, background: T.surfaceAlt,
                    border: `1px solid ${T.border}`, borderRadius: 8, padding: '5px 12px',
                  }}>
                    <BoltIcon size={12} stroke={T.accent}/>{m.body}
                    <span style={{ fontSize: 10, color: T.textFaint, fontFamily: T.mono, marginLeft: 4 }}>{m.time}</span>
                  </span>
                </div>
              );
            }
            const isStaff = m.who === 'staff';
            return (
              <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: isStaff ? 'flex-end' : 'flex-start', gap: 3 }}>
                <div style={{
                  maxWidth: '74%', padding: '9px 13px', borderRadius: isStaff ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  background: isStaff ? T.accent : T.surfaceAlt,
                  border: `1px solid ${isStaff ? T.accent : T.border}`,
                  color: isStaff ? '#fff' : T.text,
                  fontSize: 13.5, lineHeight: 1.5,
                }}>
                  {m.body}
                </div>
                <span style={{ fontSize: 10.5, color: T.textFaint, fontFamily: T.mono }}>
                  {m.time}{isStaff && m.author ? ` · ${m.author}` : ''}
                </span>
              </div>
            );
          })}
        </div>

        {/* AI suggestion */}
        {showAI && (
          <div style={{
            margin: '0 18px 8px', padding: '10px 12px', borderRadius: 10,
            background: T.accentSoft, border: `1px solid #b3d4d1`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: T.accent,
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}>
              <SparklesIcon size={12} stroke="#fff"/>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: T.accent, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>Lumen suggests</div>
              <div style={{ fontSize: 13, color: T.text, lineHeight: 1.5, fontStyle: 'italic', marginBottom: 8 }}>
                "{AI_SUGGESTION}"
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => setBody(AI_SUGGESTION)} style={{
                  padding: '5px 12px', borderRadius: 6, background: T.accent, color: '#fff',
                  border: 'none', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600, cursor: 'pointer',
                }}>Use suggestion</button>
                <button style={{
                  padding: '5px 12px', borderRadius: 6, background: T.surface, color: T.text,
                  border: `1px solid ${T.border}`, fontFamily: 'inherit', fontSize: 11.5, cursor: 'pointer',
                }}>Edit</button>
                <button onClick={() => setShowAI(false)} style={{
                  padding: '5px 12px', borderRadius: 6, background: 'transparent', color: T.textDim,
                  border: 'none', fontFamily: 'inherit', fontSize: 11.5, cursor: 'pointer',
                }}>Dismiss</button>
              </div>
            </div>
          </div>
        )}

        {/* Composer */}
        <div style={{ padding: '10px 18px 16px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
          <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: 10, background: T.surface }}>
            {/* Channel selector */}
            <div style={{ padding: '6px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 10, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Reply via</span>
              {['sms', 'email', 'whatsapp'].map(ch => (
                <button key={ch} onClick={() => setChannel(ch)} style={{
                  padding: '3px 9px', borderRadius: 4, border: `1px solid ${channel === ch ? T.accentSoft : T.border}`,
                  background: channel === ch ? T.accentSoft : 'transparent',
                  color: channel === ch ? T.accent : T.textDim,
                  fontSize: 11, fontWeight: channel === ch ? 600 : 500,
                  cursor: 'pointer', fontFamily: 'inherit',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <ChannelChip channel={ch} size={9}/> {ch}
                </button>
              ))}
              <span style={{ marginLeft: 'auto', fontSize: 11, color: T.textFaint, fontFamily: T.mono }}>
                {body.length} / 160
              </span>
            </div>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              placeholder="Write a reply, or press / for templates…"
              style={{
                width: '100%', border: 0, outline: 0, resize: 'none',
                padding: '8px 14px', minHeight: 64, fontFamily: 'inherit',
                fontSize: 13.5, color: T.text, background: 'transparent',
                lineHeight: 1.5,
              }}
            />
            <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <button style={iconBtn(T)}><PaperclipIcon size={14}/></button>
              <button style={iconBtn(T)} onClick={() => navigate('/schedule')}><CalendarIcon size={14}/></button>
              <button style={iconBtn(T)}><TagIcon size={14}/></button>
              <button style={iconBtn(T)}><SparklesIcon size={14} stroke={T.accent}/></button>
              <div style={{ flex: 1 }}/>
              <button style={{
                padding: '6px 16px', borderRadius: 7, background: 'transparent',
                color: T.textDim, border: 'none', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
              }}>Save draft</button>
              <button
                disabled={!body.trim()}
                style={{
                  padding: '7px 16px', borderRadius: 7,
                  background: body.trim() ? T.accent : T.border,
                  color: '#fff', border: 'none',
                  fontSize: 12.5, fontWeight: 600, cursor: body.trim() ? 'pointer' : 'not-allowed',
                  display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: 'inherit',
                  transition: 'background 0.12s',
                }}
              >
                <SendIcon size={13}/> Send
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Patient panel */}
      <div style={{
        width: 300, borderLeft: `1px solid ${T.border}`,
        overflow: 'auto', background: T.surface, flexShrink: 0,
      }}>
        {/* Top block */}
        <div style={{ padding: '18px 18px 14px', borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>
          <Avatar name={PATIENT_PANEL.name} size={56} style={{ margin: '0 auto 10px' }}/>
          <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 2 }}>{PATIENT_PANEL.name}</div>
          <div style={{ fontSize: 11.5, color: T.textDim, marginBottom: 12 }}>
            F · {PATIENT_PANEL.age} · Patient since {PATIENT_PANEL.since}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {[['Visits', PATIENT_PANEL.visits], ['No-shows', PATIENT_PANEL.noShows], ['NPS', '9']].map(([l, v], i) => (
              <div key={i} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 7, padding: '8px 4px', textAlign: 'center' }}>
                <div style={{ fontSize: 14, fontWeight: 700, fontFamily: T.mono, color: T.text }}>{v}</div>
                <div style={{ fontSize: 10, color: T.textFaint }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Next appt */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10.5, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Next appointment</div>
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: T.accent }}/>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text }}>{PATIENT_PANEL.nextAppt}</span>
            </div>
            <div style={{ fontSize: 11.5, color: T.textDim, marginTop: 4 }}>Video follow-up · Dr. Lin</div>
            <div style={{ marginTop: 8, padding: '6px 9px', background: '#FBF6EC', border: '1px solid #F0E4C9', borderRadius: 6, fontSize: 11.5, color: T.warn }}>
              ⚠ Patient asked to move this in current thread
            </div>
          </div>
        </div>

        {/* Tags */}
        <div style={{ padding: '12px 16px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ fontSize: 10.5, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Tags</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {PATIENT_PANEL.tags.map((t, i) => (
              <span key={i} style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textDim }}>
                {t}
              </span>
            ))}
            <button style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: 'transparent', color: T.textFaint, border: `1px dashed ${T.border}`, cursor: 'pointer', fontFamily: 'inherit' }}>
              + Add
            </button>
          </div>
        </div>

        {/* Alert note */}
        <div style={{ padding: '12px 16px' }}>
          <div style={{ fontSize: 10.5, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Clinical notes</div>
          <div style={{ fontSize: 12, padding: '9px 11px', background: '#FBF6EC', border: '1px solid #F0E4C9', borderRadius: 7 }}>
            <div style={{ fontSize: 10, color: T.warn, fontWeight: 700, marginBottom: 3 }}>⚠ ALLERGY ALERT</div>
            {PATIENT_PANEL.note}
          </div>
          <button
            onClick={() => navigate(`/contacts/1`)}
            style={{
              marginTop: 10, width: '100%', padding: '8px', borderRadius: 7,
              background: 'transparent', color: T.accent, border: `1px solid ${T.border}`,
              fontFamily: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
            }}
          >
            View full profile <ChevronRightIcon size={12}/>
          </button>
        </div>
      </div>
    </div>
  );
}

function iconBtn(T) {
  return {
    width: 30, height: 30, borderRadius: 6,
    border: `1px solid ${T.border}`,
    background: T.surface, color: T.textDim,
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', padding: 0,
  };
}
