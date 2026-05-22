import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchContact, updateContact, deleteContact, fetchNotes, createNote, deleteNote, fetchMessages, sendMessage } from '../api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../lib/toast';
import { Avatar, ChannelChip, ChevronRightIcon, ChatIcon, CalendarIcon, MoreIcon, EditIcon, TrashIcon } from '../components/Icons';

const T = {
  surface: '#FFFFFF', surfaceAlt: '#FAF9F5', border: '#E7E4DC', borderStrong: '#D9D5CB',
  text: '#0F1419', textDim: '#5C6470', textFaint: '#94A0AE',
  accent: '#2E8C82', accentSoft: '#E5F1EF',
  success: '#3E8C5A', warn: '#B6792B', danger: '#C3463A',
  mono: "'Geist Mono', ui-monospace, monospace",
};

const STATUS_STYLE = {
  active:   { bg: T.accentSoft, fg: T.success },
  lead:     { bg: T.accentSoft, fg: T.accent },
  inactive: { bg: '#F0EEE7',    fg: T.textFaint },
};

const TABS = ['Timeline', 'Messages', 'Notes', 'Appointments'];

export default function ContactDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [contact, setContact] = useState(null);
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [noteText, setNoteText] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msgChannel, setMsgChannel] = useState('email');
  const [msgSubject, setMsgSubject] = useState('');
  const [msgBody, setMsgBody] = useState('');
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const msgBodyRef = useRef(null);

  useEffect(() => {
    Promise.all([fetchContact(id), fetchNotes(id), fetchMessages(id)])
      .then(([c, n, m]) => {
        setContact(c);
        setNotes(n);
        setMessages(m);
        setForm({
          first_name: c.first_name || '', last_name: c.last_name || '',
          preferred_name: c.preferred_name || '', date_of_birth: c.date_of_birth || '',
          email: c.email || '', phone: c.phone || '',
          preferred_channel: c.preferred_channel || 'email', status: c.status,
        });
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  async function handleAddNote(e) {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSavingNote(true);
    try {
      const note = await createNote(id, noteText.trim());
      setNotes(prev => [note, ...prev]);
      setNoteText('');
      toast.success('Note added');
    } catch (err) { toast.error(err.message); }
    finally { setSavingNote(false); }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err) { toast.error(err.message); }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateContact(id, form);
      setContact(updated);
      setShowEdit(false);
      toast.success('Patient updated');
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    try { await deleteContact(id); navigate('/contacts'); }
    catch (err) { toast.error(err.message); }
  }

  function insertBookingLink() {
    const url = `${window.location.origin}/book`;
    const el = msgBodyRef.current;
    if (!el) { setMsgBody(b => b + url); return; }
    const start = el.selectionStart;
    const newVal = msgBody.slice(0, start) + url + msgBody.slice(start);
    setMsgBody(newVal);
    requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = start + url.length; el.focus(); });
  }

  async function handleSendMessage(e) {
    e.preventDefault();
    if (!msgBody.trim()) return;
    setSending(true);
    try {
      const msg = await sendMessage(id, msgChannel, msgBody.trim(), msgSubject.trim());
      setMessages(prev => [...prev, msg]);
      setMsgBody('');
      setMsgSubject('');
      toast.success(`${msgChannel === 'email' ? 'Email' : 'SMS'} sent`);
    } catch (err) { toast.error(err.message); }
    finally { setSending(false); }
  }

  function field(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })); }

  if (loading) return <div className="loading">Loading…</div>;
  if (!contact) return <div className="loading">Patient not found.</div>;

  const ss = STATUS_STYLE[contact.status] || STATUS_STYLE.inactive;

  return (
    <div style={{ fontFamily: "'Geist', system-ui, sans-serif", color: T.text }}>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: T.textDim, marginBottom: 0 }}>
        <Link to="/contacts" style={{ color: T.textDim, textDecoration: 'none', cursor: 'pointer' }}>Patients</Link>
        <ChevronRightIcon size={11} stroke={T.textFaint}/>
        <span style={{ color: T.text, fontWeight: 500 }}>
          {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name}
        </span>
        <span style={{ marginLeft: 'auto', fontFamily: T.mono, fontSize: 11, color: T.textFaint }}>
          ID #{contact.id}
        </span>
      </div>

      {/* Profile header */}
      <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '24px 28px', margin: '14px 0 0' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
          <Avatar name={[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name} size={72}/>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.01em' }}>
                {[contact.first_name, contact.last_name].filter(Boolean).join(' ') || contact.name}
              </h1>
              <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 4, background: ss.bg, color: ss.fg, fontWeight: 600 }}>
                {contact.status}
              </span>
            </div>
            {contact.preferred_name && (
              <div style={{ fontSize: 13, color: T.textDim, marginBottom: 6 }}>Goes by <strong>"{contact.preferred_name}"</strong></div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 20, fontSize: 12.5, color: T.textDim }}>
              {contact.date_of_birth && <div><span style={{ color: T.textFaint }}>DOB </span>{new Date(contact.date_of_birth + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>}
              {contact.email && <div><span style={{ color: T.textFaint }}>Email </span>{contact.email}</div>}
              {contact.phone && <div><span style={{ color: T.textFaint }}>Mobile </span>{contact.phone}</div>}
              {contact.preferred_channel && <div><span style={{ color: T.textFaint }}>Prefers </span>{contact.preferred_channel}</div>}
              <div><span style={{ color: T.textFaint }}>Since </span>{new Date(contact.created_at).toLocaleDateString()}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setActiveTab(1); }} style={primaryBtn}>
              <ChatIcon size={13}/> Message
            </button>
            <button onClick={() => navigate('/schedule')} style={secondaryBtn}>
              <CalendarIcon size={13}/> Book appt
            </button>
            <button onClick={() => setShowEdit(true)} style={iconBtn}><EditIcon size={14}/></button>
            <button onClick={() => setShowDeleteConfirm(true)} style={{ ...iconBtn, color: T.danger }}><TrashIcon size={14}/></button>
          </div>
        </div>

        {/* Mini KPIs */}
        <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
          {[
            ['Notes', notes.length, null],
            ['Messages', messages.length, null],
            ['Status', contact.status, contact.status === 'active' ? T.success : T.textDim],
          ].map(([l, v, c], i) => (
            <div key={i} style={{ flex: 1, background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 3 }}>{l}</div>
              <div style={{ fontSize: 18, fontWeight: 600, color: c || T.text, fontFamily: T.mono, letterSpacing: '-0.01em' }}>{v}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ background: T.surface, borderLeft: `1px solid ${T.border}`, borderRight: `1px solid ${T.border}`, padding: '0 28px', display: 'flex', gap: 20 }}>
        {TABS.map((tab, i) => (
          <button key={i} onClick={() => setActiveTab(i)} style={{
            padding: '11px 0', fontSize: 13, fontFamily: 'inherit',
            color: i === activeTab ? T.text : T.textDim,
            fontWeight: i === activeTab ? 600 : 500, cursor: 'pointer',
            background: 'none', border: 'none',
            borderBottom: i === activeTab ? `2px solid ${T.accent}` : '2px solid transparent',
            marginBottom: -1, transition: 'color 0.12s',
          }}>
            {tab}
            {tab === 'Messages' && messages.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 8, background: T.accentSoft, color: T.accent, fontFamily: T.mono }}>
                {messages.length}
              </span>
            )}
            {tab === 'Notes' && notes.length > 0 && (
              <span style={{ marginLeft: 6, fontSize: 10, padding: '1px 6px', borderRadius: 8, background: T.accentSoft, color: T.accent, fontFamily: T.mono }}>
                {notes.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 18, marginTop: 18 }}>
        {/* Main column */}
        <div>
          {activeTab === 0 && <TimelineTab notes={notes} messages={messages} contact={contact} />}
          {activeTab === 1 && (
            <MessagesTab
              messages={messages} msgChannel={msgChannel} setMsgChannel={setMsgChannel}
              msgSubject={msgSubject} setMsgSubject={setMsgSubject}
              msgBody={msgBody} setMsgBody={setMsgBody} msgBodyRef={msgBodyRef}
              sending={sending} onSend={handleSendMessage} onInsertBooking={insertBookingLink}
            />
          )}
          {activeTab === 2 && (
            <NotesTab
              notes={notes} noteText={noteText} setNoteText={setNoteText}
              savingNote={savingNote} onAdd={handleAddNote} onDelete={handleDeleteNote}
            />
          )}
          {activeTab === 3 && (
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 28, textAlign: 'center', color: T.textFaint }}>
              <CalendarIcon size={32} style={{ margin: '0 auto 12px' }}/>
              <p style={{ fontSize: 13, marginBottom: 16 }}>No appointments yet</p>
              <button onClick={() => navigate('/schedule')} style={primaryBtn}>Book appointment</button>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Contact info card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Contact info</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0, fontSize: 12.5 }}>
              {[
                ['First name',  contact.first_name],
                ['Last name',   contact.last_name],
                ['Preferred',   contact.preferred_name],
                ['Date of birth', contact.date_of_birth ? new Date(contact.date_of_birth + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : null],
                ['Mobile',      contact.phone],
                ['Email',       contact.email],
                ['Pref. channel', contact.preferred_channel],
              ].map(([l, v], idx, arr) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: idx < arr.length - 1 ? `1px solid ${T.border}` : 'none' }}>
                  <span style={{ color: T.textDim }}>{l}</span>
                  <span style={{ fontWeight: 500, color: v ? T.text : T.textFaint, textAlign: 'right', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {v || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick actions */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Quick actions</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={() => setActiveTab(1)} style={{ ...secondaryBtn, width: '100%', justifyContent: 'flex-start' }}>
                <ChatIcon size={13}/> Send message
              </button>
              <button onClick={() => navigate('/schedule')} style={{ ...secondaryBtn, width: '100%', justifyContent: 'flex-start' }}>
                <CalendarIcon size={13}/> Book appointment
              </button>
              <button onClick={() => setShowEdit(true)} style={{ ...secondaryBtn, width: '100%', justifyContent: 'flex-start' }}>
                <EditIcon size={13}/> Edit profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      {showEdit && (
        <Modal title="Edit Patient" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEditSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input required value={form.first_name} onChange={field('first_name')} />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={form.last_name} onChange={field('last_name')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Name</label>
                <input value={form.preferred_name} onChange={field('preferred_name')} placeholder="e.g. Nickname" />
              </div>
              <div className="form-group">
                <label>Date of Birth</label>
                <input type="date" value={form.date_of_birth} onChange={field('date_of_birth')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email Address</label>
                <input type="email" value={form.email} onChange={field('email')} />
              </div>
              <div className="form-group">
                <label>Mobile Phone</label>
                <input value={form.phone} onChange={field('phone')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Channel</label>
                <select value={form.preferred_channel} onChange={field('preferred_channel')}>
                  {['email','sms','whatsapp','voice'].map(ch => (
                    <option key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select value={form.status} onChange={field('status')}>
                  <option value="active">Active</option>
                  <option value="lead">Lead</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          message="This will permanently delete the patient and all their notes."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}

function TimelineTab({ notes, messages, contact }) {
  const events = [
    ...notes.map(n => ({ type: 'note', time: new Date(n.created_at), text: n.content, id: `n${n.id}` })),
    ...messages.map(m => ({ type: 'message', time: new Date(m.created_at), text: m.body, subject: m.subject, ch: m.channel, id: `m${m.id}`, status: m.status })),
  ].sort((a, b) => b.time - a.time);

  const typeMeta = {
    message: { color: T.accent,   label: 'Message' },
    note:    { color: T.warn,     label: 'Note' },
  };

  if (events.length === 0) return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '40px 24px', textAlign: 'center', color: T.textFaint, fontSize: 13 }}>
      No activity yet
    </div>
  );

  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: '8px 0' }}>
      {events.map((e, i) => {
        const meta = typeMeta[e.type];
        const isLast = i === events.length - 1;
        return (
          <div key={e.id} style={{ display: 'flex', gap: 14, padding: '12px 18px', position: 'relative' }}>
            <div style={{ position: 'relative', width: 12, flexShrink: 0 }}>
              <span style={{ position: 'absolute', top: 4, left: 0, width: 10, height: 10, borderRadius: '50%', background: meta.color, border: `2px solid ${T.surface}`, boxShadow: `0 0 0 1px ${T.border}` }}/>
              {!isLast && <span style={{ position: 'absolute', top: 16, bottom: -12, left: 4, width: 2, background: T.border }}/>}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 3 }}>
                <span style={{ fontSize: 10, color: meta.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{meta.label}</span>
                {e.ch && <ChannelChip channel={e.ch} size={10}/>}
                {e.subject && <span style={{ fontSize: 11.5, color: T.textDim, fontWeight: 500 }}>· {e.subject}</span>}
                <span style={{ marginLeft: 'auto', fontSize: 10.5, color: T.textFaint, fontFamily: T.mono }}>
                  {e.time.toLocaleString()}
                </span>
              </div>
              <div style={{
                fontSize: 13, color: T.text, lineHeight: 1.5,
                padding: '8px 12px', borderRadius: 7,
                background: e.type === 'message' ? T.accentSoft : T.surfaceAlt,
                border: `1px solid ${e.type === 'message' ? T.accentSoft : T.border}`,
              }}>
                {e.text}
              </div>
              {e.status === 'failed' && (
                <span style={{ fontSize: 10.5, color: T.danger, marginTop: 3, display: 'block' }}>⚠ Delivery failed</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MessagesTab({ messages, msgChannel, setMsgChannel, msgSubject, setMsgSubject, msgBody, setMsgBody, msgBodyRef, sending, onSend, onInsertBooking }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Messages <span style={{ color: T.textFaint, fontWeight: 400 }}>({messages.length})</span></h3>
        <div className="channel-tabs">
          <button className={`channel-tab${msgChannel === 'email' ? ' active' : ''}`} onClick={() => setMsgChannel('email')}>✉ Email</button>
          <button className={`channel-tab${msgChannel === 'sms' ? ' active' : ''}`} onClick={() => setMsgChannel('sms')}>💬 SMS</button>
        </div>
      </div>

      <div className="message-thread">
        {messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: T.textFaint, fontSize: 13 }}>No messages yet. Send the first one below.</div>
        ) : messages.map(msg => (
          <div key={msg.id} className={`message-bubble${msg.status === 'failed' ? ' failed' : ''}`}>
            <div className="message-meta">
              <ChannelChip channel={msg.channel} size={11}/>
              {msg.subject && <span className="message-subject">{msg.subject}</span>}
              {msg.status === 'failed' && <span className="message-failed">failed</span>}
              <span className="message-time">{new Date(msg.created_at).toLocaleString()}</span>
            </div>
            <p className="message-body">{msg.body}</p>
          </div>
        ))}
      </div>

      <form onSubmit={onSend} className="message-compose">
        {msgChannel === 'email' && (
          <input value={msgSubject} onChange={e => setMsgSubject(e.target.value)} placeholder="Subject (optional)" className="message-subject-input"/>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
            <textarea
              ref={msgBodyRef}
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              placeholder={msgChannel === 'email' ? 'Write your email…' : 'Write your SMS…'}
              className="message-body-input"
              maxLength={msgChannel === 'sms' ? 1600 : undefined}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) onSend(e); }}
            />
            <button type="button" className="insert-link-btn" onClick={onInsertBooking}>
              📅 Insert booking link
            </button>
          </div>
          <button type="submit" className="btn btn-primary" disabled={sending || !msgBody.trim()} style={{ alignSelf: 'flex-end' }}>
            {sending ? 'Sending…' : `Send ${msgChannel === 'email' ? 'Email' : 'SMS'}`}
          </button>
        </div>
        {msgChannel === 'sms' && msgBody.length > 0 && (
          <div style={{ fontSize: 11, color: T.textFaint, marginTop: 4 }}>{msgBody.length} / 160 chars</div>
        )}
      </form>
    </div>
  );
}

function NotesTab({ notes, noteText, setNoteText, savingNote, onAdd, onDelete }) {
  return (
    <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Notes <span style={{ color: T.textFaint, fontWeight: 400 }}>({notes.length})</span></h3>
      <form onSubmit={onAdd} className="note-form">
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          placeholder="Add a note… (Enter to submit)"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onAdd(e); } }}
        />
        <button type="submit" className="btn btn-primary" disabled={savingNote || !noteText.trim()}>Add</button>
      </form>
      {notes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px 0', color: T.textFaint, fontSize: 13 }}>No notes yet.</div>
      ) : (
        <div className="notes-list">
          {notes.map(note => (
            <div key={note.id} className="note-item">
              <p className="note-content">{note.content}</p>
              <p className="note-date">{new Date(note.created_at).toLocaleString()}</p>
              <button className="note-delete" onClick={() => onDelete(note.id)} title="Delete note">×</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const primaryBtn = {
  padding: '8px 14px', borderRadius: 7, background: '#2E8C82', color: '#fff',
  border: 'none', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

const secondaryBtn = {
  padding: '8px 14px', borderRadius: 7, background: '#fff', color: '#0F1419',
  border: '1px solid #E7E4DC', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', gap: 6,
};

const iconBtn = {
  width: 34, height: 34, borderRadius: 7, border: '1px solid #E7E4DC',
  background: '#fff', color: '#5C6470',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0,
};
