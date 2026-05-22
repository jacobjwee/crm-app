import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { fetchContact, updateContact, deleteContact, fetchNotes, createNote, deleteNote, fetchMessages, sendMessage } from '../api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../lib/toast';

function avatarColor(name) {
  const palette = ['#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#f7971e', '#00c9ff'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

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

  useEffect(() => {
    Promise.all([fetchContact(id), fetchNotes(id), fetchMessages(id)])
      .then(([c, n, m]) => {
        setContact(c);
        setNotes(n);
        setMessages(m);
        setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', status: c.status });
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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSavingNote(false);
    }
  }

  async function handleDeleteNote(noteId) {
    try {
      await deleteNote(noteId);
      setNotes(prev => prev.filter(n => n.id !== noteId));
      toast.success('Note deleted');
    } catch (err) {
      toast.error(err.message);
    }
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await updateContact(id, form);
      setContact(updated);
      setShowEdit(false);
      toast.success('Contact updated');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteConfirm() {
    setShowDeleteConfirm(false);
    try {
      await deleteContact(id);
      navigate('/contacts');
    } catch (err) {
      toast.error(err.message);
    }
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
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSending(false);
    }
  }

  function field(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  if (loading) return <div className="loading">Loading…</div>;
  if (!contact) return <div className="loading">Contact not found.</div>;

  return (
    <div>
      <Link to="/contacts" className="back-link">← Back to Contacts</Link>

      <div className="contact-detail-header">
        <div className="contact-detail-avatar" style={{ background: avatarColor(contact.name) }}>
          {contact.name[0].toUpperCase()}
        </div>
        <div className="contact-detail-info">
          <h1>{contact.name}</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
            <span style={{ fontSize: 14, color: '#7f8c9a' }}>{contact.company || 'No company'}</span>
            <span className={`badge badge-${contact.status}`}>{contact.status}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setShowEdit(true)}>Edit</button>
          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>Delete</button>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Contact Info</h2>
          <div className="info-list">
            <div className="info-item">
              <div className="label">Email</div>
              <div className="value">{contact.email || '—'}</div>
            </div>
            <div className="info-item">
              <div className="label">Phone</div>
              <div className="value">{contact.phone || '—'}</div>
            </div>
            <div className="info-item">
              <div className="label">Company</div>
              <div className="value">{contact.company || '—'}</div>
            </div>
            <div className="info-item">
              <div className="label">Status</div>
              <span className={`badge badge-${contact.status}`}>{contact.status}</span>
            </div>
            <div className="info-item">
              <div className="label">Added</div>
              <div className="value">{new Date(contact.created_at).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 style={{ fontSize: 15, fontWeight: 600, marginBottom: 14 }}>
            Notes <span style={{ color: '#95a5b3', fontWeight: 400 }}>({notes.length})</span>
          </h2>
          <form onSubmit={handleAddNote} className="note-form">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add a note… (Enter to submit)"
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote(e);
                }
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={savingNote || !noteText.trim()}>
              Add
            </button>
          </form>

          {notes.length === 0 ? (
            <div className="empty-state" style={{ paddingTop: 20, paddingBottom: 20 }}>
              <p>No notes yet.</p>
            </div>
          ) : (
            <div className="notes-list">
              {notes.map(note => (
                <div key={note.id} className="note-item">
                  <p className="note-content">{note.content}</p>
                  <p className="note-date">{new Date(note.created_at).toLocaleString()}</p>
                  <button className="note-delete" onClick={() => handleDeleteNote(note.id)} title="Delete note">×</button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card" style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600 }}>
            Messages <span style={{ color: '#95a5b3', fontWeight: 400 }}>({messages.length})</span>
          </h2>
          <div className="channel-tabs">
            <button
              className={`channel-tab${msgChannel === 'email' ? ' active' : ''}`}
              onClick={() => setMsgChannel('email')}
            >✉ Email</button>
            <button
              className={`channel-tab${msgChannel === 'sms' ? ' active' : ''}`}
              onClick={() => setMsgChannel('sms')}
            >💬 SMS</button>
          </div>
        </div>

        <div className="message-thread">
          {messages.length === 0 ? (
            <div className="empty-state" style={{ padding: '24px 0' }}>
              <p>No messages yet. Send the first one below.</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className={`message-bubble ${msg.status === 'failed' ? 'failed' : ''}`}>
                <div className="message-meta">
                  <span className={`channel-pill ${msg.channel}`}>
                    {msg.channel === 'email' ? '✉' : '💬'} {msg.channel}
                  </span>
                  {msg.subject && <span className="message-subject">{msg.subject}</span>}
                  {msg.status === 'failed' && <span className="message-failed">failed</span>}
                  <span className="message-time">{new Date(msg.created_at).toLocaleString()}</span>
                </div>
                <p className="message-body">{msg.body}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleSendMessage} className="message-compose">
          {msgChannel === 'email' && (
            <input
              value={msgSubject}
              onChange={e => setMsgSubject(e.target.value)}
              placeholder="Subject (optional)"
              className="message-subject-input"
            />
          )}
          <div style={{ display: 'flex', gap: 10 }}>
            <textarea
              value={msgBody}
              onChange={e => setMsgBody(e.target.value)}
              placeholder={msgChannel === 'email' ? 'Write your email…' : 'Write your SMS (160 chars recommended)…'}
              className="message-body-input"
              maxLength={msgChannel === 'sms' ? 1600 : undefined}
              onKeyDown={e => {
                if (e.key === 'Enter' && e.metaKey) handleSendMessage(e);
              }}
            />
            <button type="submit" className="btn btn-primary" disabled={sending || !msgBody.trim()} style={{ alignSelf: 'flex-end' }}>
              {sending ? 'Sending…' : `Send ${msgChannel === 'email' ? 'Email' : 'SMS'}`}
            </button>
          </div>
          {msgChannel === 'sms' && msgBody.length > 0 && (
            <div style={{ fontSize: 12, color: '#95a5b3', marginTop: 4 }}>{msgBody.length} / 160 chars</div>
          )}
        </form>
      </div>

      {showEdit && (
        <Modal title="Edit Contact" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEditSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input required value={form.name} onChange={field('name')} />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input value={form.company} onChange={field('company')} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={field('email')} />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={field('phone')} />
              </div>
            </div>
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={field('status')}>
                <option value="active">Active</option>
                <option value="lead">Lead</option>
                <option value="inactive">Inactive</option>
              </select>
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
          message="This will permanently delete the contact and all their notes."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}
    </div>
  );
}
