import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchInboxThreads, fetchMessages, sendMessage } from '../api';
import { toast } from '../lib/toast';
import {
  Avatar, ChannelChip,
  SearchIcon, FilterIcon, MoreIcon, PhoneIcon, CalendarIcon,
  MailIcon, ChatIcon, SparklesIcon, PaperclipIcon, SendIcon,
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

function fmtTime(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T'));
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffH   = Math.floor(diffMs / 3600000);
  if (diffMin < 1)  return 'now';
  if (diffMin < 60) return `${diffMin}m`;
  if (diffH   < 24) return `${diffH}h`;
  if (diffH   < 48) return 'Yest';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function fmtFull(ts) {
  if (!ts) return '';
  const d = new Date(ts.replace(' ', 'T'));
  return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export default function Inbox() {
  const [threads,      setThreads]      = useState([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeThread, setActiveThread] = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [channel,      setChannel]      = useState('email');
  const [subject,      setSubject]      = useState('');
  const [body,         setBody]         = useState('');
  const [sending,      setSending]      = useState(false);
  const [search,       setSearch]       = useState('');
  const msgsEndRef = useRef(null);
  const navigate   = useNavigate();

  useEffect(() => {
    fetchInboxThreads()
      .then(data => {
        setThreads(data);
        if (data.length > 0) setActiveThread(data[0]);
      })
      .catch(() => {})
      .finally(() => setLoadingThreads(false));
  }, []);

  useEffect(() => {
    if (!activeThread) return;
    setLoadingMsgs(true);
    setMessages([]);
    fetchMessages(activeThread.contact_id)
      .then(data => {
        setMessages(data);
        setChannel(data[0]?.channel || 'email');
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [activeThread]);

  useEffect(() => {
    msgsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    if (!body.trim() || !activeThread) return;
    setSending(true);
    try {
      const msg = await sendMessage(activeThread.contact_id, channel, body.trim(), subject.trim());
      setMessages(prev => [...prev, msg]);
      setBody('');
      setSubject('');
      // refresh thread list so preview updates
      fetchInboxThreads().then(setThreads).catch(() => {});
      toast.success('Message sent');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  const filtered = threads.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      display: 'flex', height: 'calc(100vh - 56px)',
      margin: '-28px -32px', background: T.bg,
      fontFamily: "'Geist', system-ui, sans-serif",
    }}>
      {/* ── Thread list ─────────────────────────────── */}
      <div style={{
        width: 340, background: T.surface,
        borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 17, fontWeight: 600, color: T.text, flex: 1 }}>Inbox</span>
            <span style={{ fontSize: 11, fontFamily: T.mono, color: T.textFaint, background: T.surfaceAlt, border: `1px solid ${T.border}`, padding: '2px 7px', borderRadius: 10 }}>
              {threads.length}
            </span>
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 7, padding: '7px 10px',
            background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7,
          }}>
            <SearchIcon size={13} stroke={T.textFaint}/>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search threads…"
              style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontSize: 12.5, color: T.text, fontFamily: 'inherit' }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflow: 'auto' }}>
          {loadingThreads ? (
            <div style={{ padding: 40, textAlign: 'center', color: T.textFaint, fontSize: 13 }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: '40px 24px', textAlign: 'center', color: T.textFaint }}>
              <div style={{ fontSize: 28, marginBottom: 8 }}>💬</div>
              <p style={{ fontSize: 12.5 }}>No messages yet. Send a message to a patient to start a thread.</p>
            </div>
          ) : (
            filtered.map(t => {
              const isActive = activeThread?.contact_id === t.contact_id;
              return (
                <div
                  key={t.contact_id}
                  onClick={() => setActiveThread(t)}
                  style={{
                    padding: '11px 14px', borderBottom: `1px solid ${T.border}`,
                    cursor: 'pointer',
                    background: isActive ? T.accentSoft : 'transparent',
                    borderLeft: isActive ? `2px solid ${T.accent}` : '2px solid transparent',
                    paddingLeft: isActive ? 12 : 14,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
                    <Avatar name={t.name} size={32}/>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {t.name}
                        </span>
                        <span style={{ fontSize: 10.5, color: T.textFaint, fontFamily: T.mono, flexShrink: 0 }}>{fmtTime(t.created_at)}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
                        <ChannelChip channel={t.channel} size={11}/>
                        <span style={{ fontSize: 10.5, color: T.textFaint, fontFamily: T.mono }}>{t.message_count} msg{t.message_count !== 1 ? 's' : ''}</span>
                      </div>
                      <div style={{ fontSize: 12, color: T.textDim, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {t.direction === 'outbound' ? '→ ' : ''}{t.preview}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Conversation ────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, background: T.surface }}>
        {!activeThread ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.textFaint }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>💬</div>
              <p style={{ fontSize: 13 }}>Select a conversation</p>
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '14px 22px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Avatar name={activeThread.name} size={36}/>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: T.text, marginBottom: 2 }}>{activeThread.name}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11.5, color: T.textDim }}>
                  <ChannelChip channel={activeThread.channel} size={10}/>
                  <span>{activeThread.email || activeThread.phone || '—'}</span>
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: T.textFaint, display: 'inline-block' }}/>
                  <span style={{ fontSize: 10.5, padding: '1px 6px', borderRadius: 4, background: T.accentSoft, color: T.success, fontWeight: 600 }}>
                    {activeThread.status}
                  </span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button style={iconBtn} onClick={() => navigate('/schedule')}><CalendarIcon size={14}/></button>
                <Link to={`/contacts/${activeThread.contact_id}`} style={{ ...iconBtn, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: T.textDim }}>
                  <MoreIcon size={14}/>
                </Link>
              </div>
            </div>

            {/* Messages stream */}
            <div style={{ flex: 1, overflow: 'auto', padding: '20px 22px 12px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', padding: 40, color: T.textFaint }}>Loading…</div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: T.textFaint, fontSize: 13 }}>No messages yet</div>
              ) : (
                messages.map((m, i) => {
                  const isOut = m.direction === 'outbound';
                  const showDate = i === 0 || messages[i-1].created_at?.slice(0,10) !== m.created_at?.slice(0,10);
                  return (
                    <div key={m.id}>
                      {showDate && (
                        <div style={{ textAlign: 'center', margin: '8px 0' }}>
                          <span style={{ display: 'inline-block', fontSize: 11, color: T.textDim, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 10, padding: '3px 10px' }}>
                            {new Date(m.created_at.replace(' ','T')).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      )}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: isOut ? 'flex-end' : 'flex-start', gap: 3 }}>
                        {m.subject && (
                          <div style={{ fontSize: 10.5, color: T.textFaint, fontStyle: 'italic', maxWidth: '74%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Re: {m.subject}
                          </div>
                        )}
                        <div style={{
                          maxWidth: '74%', padding: '9px 13px',
                          borderRadius: isOut ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isOut ? T.accent : T.surfaceAlt,
                          border: `1px solid ${isOut ? T.accent : T.border}`,
                          color: isOut ? '#fff' : T.text,
                          fontSize: 13.5, lineHeight: 1.5,
                        }}>
                          {m.body}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 10.5, color: T.textFaint, fontFamily: T.mono }}>{fmtFull(m.created_at)}</span>
                          {m.status === 'failed' && (
                            <span style={{ fontSize: 10, color: T.danger, fontWeight: 600 }}>Failed to send</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={msgsEndRef}/>
            </div>

            {/* Composer */}
            <div style={{ padding: '10px 18px 16px', borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
              <div style={{ border: `1px solid ${T.borderStrong}`, borderRadius: 10, background: T.surface }}>
                {/* Channel selector */}
                <div style={{ padding: '6px 12px', borderBottom: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 10, color: T.textFaint, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>Reply via</span>
                  {['email', 'sms'].map(ch => (
                    <button key={ch} onClick={() => setChannel(ch)} style={{
                      padding: '3px 9px', borderRadius: 4,
                      border: `1px solid ${channel === ch ? T.accentSoft : T.border}`,
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
                    {body.length}{channel === 'sms' ? '/160' : ''}
                  </span>
                </div>
                {channel === 'email' && (
                  <input
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    placeholder="Subject…"
                    style={{
                      width: '100%', border: 0, outline: 0, borderBottom: `1px solid ${T.border}`,
                      padding: '7px 14px', fontFamily: 'inherit', fontSize: 12.5,
                      color: T.textDim, background: 'transparent', boxSizing: 'border-box',
                    }}
                  />
                )}
                <textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSend(); }}
                  placeholder="Write a message… (⌘↵ to send)"
                  style={{
                    width: '100%', border: 0, outline: 0, resize: 'none',
                    padding: '8px 14px', minHeight: 64, fontFamily: 'inherit',
                    fontSize: 13.5, color: T.text, background: 'transparent',
                    lineHeight: 1.5, boxSizing: 'border-box',
                  }}
                />
                <div style={{ padding: '8px 12px', borderTop: `1px solid ${T.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <button style={iconBtn} onClick={() => navigate('/schedule')}><CalendarIcon size={14}/></button>
                  <div style={{ flex: 1 }}/>
                  <button
                    onClick={handleSend}
                    disabled={!body.trim() || sending}
                    style={{
                      padding: '7px 16px', borderRadius: 7,
                      background: body.trim() && !sending ? T.accent : T.border,
                      color: '#fff', border: 'none',
                      fontSize: 12.5, fontWeight: 600,
                      cursor: body.trim() && !sending ? 'pointer' : 'not-allowed',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      fontFamily: 'inherit',
                    }}
                  >
                    <SendIcon size={13}/> {sending ? 'Sending…' : 'Send'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ── Patient panel ───────────────────────────── */}
      <div style={{
        width: 280, borderLeft: `1px solid ${T.border}`,
        overflow: 'auto', background: T.surface, flexShrink: 0,
      }}>
        {activeThread ? (
          <>
            <div style={{ padding: '18px 16px 14px', borderBottom: `1px solid ${T.border}`, textAlign: 'center' }}>
              <Avatar name={activeThread.name} size={52} style={{ margin: '0 auto 10px' }}/>
              <div style={{ fontSize: 14, fontWeight: 600, color: T.text, marginBottom: 2 }}>{activeThread.name}</div>
              <div style={{ fontSize: 11, color: T.textDim, marginBottom: 12 }}>
                {activeThread.email || '—'} · {activeThread.phone || '—'}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  ['Messages', activeThread.message_count],
                  ['Status', activeThread.status],
                ].map(([l, v], i) => (
                  <div key={i} style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7, padding: '8px 4px', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, fontFamily: T.mono, color: T.text }}>{v}</div>
                    <div style={{ fontSize: 10, color: T.textFaint }}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: '12px 16px' }}>
              <Link
                to={`/contacts/${activeThread.contact_id}`}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  width: '100%', padding: '8px', borderRadius: 7,
                  color: T.accent, border: `1px solid ${T.border}`,
                  fontFamily: 'inherit', fontSize: 12, fontWeight: 600, textDecoration: 'none',
                }}
              >
                View full profile <ChevronRightIcon size={12}/>
              </Link>
            </div>

            <div style={{ padding: '0 16px 12px', borderTop: `1px solid ${T.border}`, paddingTop: 12 }}>
              <div style={{ fontSize: 10.5, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Quick actions</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <button onClick={() => navigate('/schedule')} style={actionBtn}>
                  <CalendarIcon size={12}/> Book appointment
                </button>
                <button onClick={() => navigate(`/contacts/${activeThread.contact_id}`)} style={actionBtn}>
                  <ChatIcon size={12}/> View messages history
                </button>
              </div>
            </div>
          </>
        ) : (
          <div style={{ padding: 24, textAlign: 'center', color: T.textFaint, fontSize: 12.5 }}>
            Select a conversation to see patient info
          </div>
        )}
      </div>
    </div>
  );
}

const iconBtn = {
  width: 30, height: 30, borderRadius: 6,
  border: `1px solid #E7E4DC`,
  background: '#FFFFFF', color: '#5C6470',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', padding: 0, textDecoration: 'none',
};

const actionBtn = {
  padding: '7px 12px', borderRadius: 7, background: '#FAF9F5',
  color: '#0F1419', border: '1px solid #E7E4DC',
  fontFamily: 'inherit', fontSize: 12, fontWeight: 500, cursor: 'pointer',
  display: 'flex', alignItems: 'center', gap: 6,
};
