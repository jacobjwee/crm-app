import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { fetchContacts, createContact, updateContact, deleteContact } from '../api';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { toast } from '../lib/toast';
import { Avatar, ChannelChip, SearchIcon, PlusIcon, TagIcon, MegaphoneIcon, ChatIcon } from '../components/Icons';

const T = {
  bg: '#F6F5F1', surface: '#FFFFFF', surfaceAlt: '#FAF9F5',
  border: '#E7E4DC', borderStrong: '#D9D5CB',
  text: '#0F1419', textDim: '#5C6470', textFaint: '#94A0AE',
  accent: '#2E8C82', accentSoft: '#E5F1EF',
  success: '#3E8C5A', warn: '#B6792B', danger: '#C3463A',
  mono: "'Geist Mono', ui-monospace, monospace",
};

const SEGMENTS = [
  { name: 'All patients',       filter: null,       dot: null },
  { name: 'Active',             filter: 'active',   dot: T.success },
  { name: 'Leads',              filter: 'lead',     dot: T.accent },
  { name: 'Inactive',           filter: 'inactive', dot: T.textFaint },
];

const BLANK = { first_name: '', last_name: '', preferred_name: '', date_of_birth: '', phone: '', email: '', preferred_channel: 'email', status: 'active' };

const CHANNELS = ['email', 'sms', 'whatsapp', 'voice'];

function displayName(c) {
  if (c.preferred_name) return c.preferred_name;
  const full = [c.first_name, c.last_name].filter(Boolean).join(' ');
  return full || c.name || '—';
}

const STATUS_STYLE = {
  active:   { bg: T.accentSoft, fg: T.success },
  lead:     { bg: T.accentSoft, fg: T.accent },
  inactive: { bg: '#F0EEE7',    fg: T.textFaint },
};

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    try {
      setContacts(await fetchContacts(search));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 220);
    return () => clearTimeout(t);
  }, [load]);

  function openAdd() { setEditing(null); setForm(BLANK); setShowModal(true); }
  function openEdit(c) {
    setEditing(c);
    setForm({
      first_name: c.first_name || '', last_name: c.last_name || '',
      preferred_name: c.preferred_name || '', date_of_birth: c.date_of_birth || '',
      phone: c.phone || '', email: c.email || '',
      preferred_channel: c.preferred_channel || 'email', status: c.status,
    });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) { await updateContact(editing.id, form); toast.success(`${form.name} updated`); }
      else { await createContact(form); toast.success(`${form.name} added`); }
      setShowModal(false);
      load();
    } catch (err) { toast.error(err.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteConfirm() {
    const id = confirmId;
    setConfirmId(null);
    try {
      await deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
      toast.success('Patient deleted');
    } catch (err) { toast.error(err.message); }
  }

  function field(key) { return e => setForm(f => ({ ...f, [key]: e.target.value })); }

  const segFilter = SEGMENTS[segment].filter;
  const filtered = contacts.filter(c => !segFilter || c.status === segFilter);

  return (
    <div style={{
      display: 'flex', margin: '-28px -32px', height: 'calc(100vh - 56px)',
      fontFamily: "'Geist', system-ui, sans-serif", color: T.text, background: T.bg,
    }}>
      {/* Segments rail */}
      <aside style={{
        width: 240, background: T.surface, borderRight: `1px solid ${T.border}`,
        display: 'flex', flexDirection: 'column', flexShrink: 0,
      }}>
        <div style={{ padding: '20px 18px 12px' }}>
          <div style={{ fontSize: 11, color: T.textDim, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>Segments</div>
          <button onClick={openAdd} style={{
            width: '100%', padding: '7px 10px', borderRadius: 7,
            border: `1px dashed ${T.borderStrong}`, background: 'transparent',
            color: T.text, fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'center',
          }}>
            <PlusIcon size={12} strokeWidth={2}/> New patient
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '4px 8px' }}>
          {SEGMENTS.map((s, i) => (
            <div key={i} onClick={() => setSegment(i)} style={{
              display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px',
              borderRadius: 6, cursor: 'pointer',
              background: i === segment ? T.accentSoft : 'transparent',
              color: i === segment ? T.text : T.textDim,
              fontSize: 12.5, fontWeight: i === segment ? 600 : 400,
              borderLeft: i === segment ? `2px solid ${T.accent}` : '2px solid transparent',
              marginLeft: i === segment ? -2 : 0,
            }}>
              {s.dot
                ? <span style={{ width: 7, height: 7, borderRadius: '50%', background: s.dot, flexShrink: 0 }}/>
                : <span style={{ width: 7, flexShrink: 0 }}/>
              }
              <span style={{ flex: 1 }}>{s.name}</span>
              <span style={{ fontSize: 10.5, color: i === segment ? T.accent : T.textFaint, fontFamily: T.mono }}>
                {s.filter ? contacts.filter(c => c.status === s.filter).length : contacts.length}
              </span>
            </div>
          ))}
        </div>
      </aside>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Header */}
        <div style={{ padding: '20px 32px 14px', background: T.surface, borderBottom: `1px solid ${T.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 11.5, color: T.textDim, fontFamily: T.mono, marginBottom: 4 }}>SEGMENT</div>
              <h1 style={{ margin: 0, fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em' }}>{SEGMENTS[segment].name}</h1>
              <div style={{ fontSize: 12, color: T.textDim, marginTop: 4 }}>{filtered.length} patient{filtered.length !== 1 ? 's' : ''}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, paddingTop: 4 }}>
              <button style={secondaryBtn}><TagIcon size={13}/> Bulk tag</button>
              <button onClick={() => navigate('/campaigns')} style={secondaryBtn}><MegaphoneIcon size={13}/> Create campaign</button>
              <button onClick={openAdd} style={primaryBtn}><PlusIcon size={13} strokeWidth={2.2}/> New patient</button>
            </div>
          </div>
          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '7px 12px',
              background: T.surfaceAlt, border: `1px solid ${T.border}`, borderRadius: 7,
            }}>
              <SearchIcon size={13} stroke={T.textFaint}/>
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search patients by name, email, phone…"
                style={{ flex: 1, border: 0, outline: 0, background: 'transparent', fontFamily: 'inherit', fontSize: 12.5, color: T.text }}
              />
            </div>
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: T.textFaint }}>Loading…</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: '40px 32px', textAlign: 'center', color: T.textFaint }}>
            <div style={{ fontSize: 32, marginBottom: 10 }}>👥</div>
            <p style={{ fontSize: 13 }}>{search ? 'No patients match your search.' : 'No patients in this segment yet.'}</p>
            <button onClick={openAdd} style={{ ...primaryBtn, marginTop: 16 }}>
              <PlusIcon size={13} strokeWidth={2.2}/> Add first patient
            </button>
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'auto', background: T.surface }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
                  <th style={thStyle}>Patient</th>
                  <th style={thStyle}>Date of Birth</th>
                  <th style={thStyle}>Email</th>
                  <th style={thStyle}>Mobile</th>
                  <th style={thStyle}>Channel</th>
                  <th style={thStyle}>Status</th>
                  <th style={{ ...thStyle, width: 70 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const ss = STATUS_STYLE[c.status] || STATUS_STYLE.inactive;
                  return (
                    <tr key={c.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 ? T.surface : T.surfaceAlt }}>
                      <td style={{ padding: '10px 14px' }}>
                        <Link to={`/contacts/${c.id}`} style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 9 }}>
                          <Avatar name={displayName(c)} size={28}/>
                          <div>
                            <div style={{ fontWeight: 500, color: T.text }}>
                              {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.name}
                            </div>
                            {c.preferred_name && (
                              <div style={{ fontSize: 11, color: T.textFaint }}>"{c.preferred_name}"</div>
                            )}
                          </div>
                        </Link>
                      </td>
                      <td style={{ padding: '10px 14px', color: T.textDim, fontFamily: T.mono, fontSize: 11.5 }}>
                        {c.date_of_birth ? new Date(c.date_of_birth + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td style={{ padding: '10px 14px', color: T.textDim, fontSize: 12 }}>{c.email || '—'}</td>
                      <td style={{ padding: '10px 14px', color: T.textDim, fontFamily: T.mono, fontSize: 11.5 }}>{c.phone || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {c.preferred_channel && (
                          <span style={{ fontSize: 10.5, padding: '2px 7px', borderRadius: 4, background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.textDim, fontWeight: 500 }}>
                            {c.preferred_channel}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ fontSize: 10.5, padding: '2px 8px', borderRadius: 4, background: ss.bg, color: ss.fg, fontWeight: 600 }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={() => navigate(`/contacts/${c.id}`)} style={{
                            padding: '4px 8px', borderRadius: 5, background: 'transparent',
                            color: T.accent, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 600,
                            display: 'inline-flex', alignItems: 'center', gap: 3,
                          }}>
                            <ChatIcon size={11}/> Msg
                          </button>
                          <button onClick={() => openEdit(c)} style={actionBtn}>Edit</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div style={{
          padding: '10px 32px', borderTop: `1px solid ${T.border}`, background: T.surface,
          display: 'flex', alignItems: 'center', fontSize: 11.5, color: T.textDim,
        }}>
          <span>Showing {filtered.length} patient{filtered.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Add/edit modal */}
      {showModal && (
        <Modal title={editing ? 'Edit Patient' : 'New Patient'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>First Name *</label>
                <input required value={form.first_name} onChange={field('first_name')} placeholder="First name" />
              </div>
              <div className="form-group">
                <label>Last Name</label>
                <input value={form.last_name} onChange={field('last_name')} placeholder="Last name" />
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
                <input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Mobile Phone</label>
                <input value={form.phone} onChange={field('phone')} placeholder="+1 (555) 000-0000" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Preferred Channel</label>
                <select value={form.preferred_channel} onChange={field('preferred_channel')}>
                  {CHANNELS.map(ch => <option key={ch} value={ch}>{ch.charAt(0).toUpperCase() + ch.slice(1)}</option>)}
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
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Patient'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {confirmId && (
        <ConfirmDialog
          message="This will permanently delete the patient and all their notes."
          onConfirm={handleDeleteConfirm}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}

const thStyle = {
  textAlign: 'left', padding: '10px 14px', fontSize: 10.5,
  color: '#5C6470', fontWeight: 600, textTransform: 'uppercase',
  letterSpacing: '0.05em',
};

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

const actionBtn = {
  padding: '4px 9px', borderRadius: 5, background: '#FAF9F5', color: '#5C6470',
  border: '1px solid #E7E4DC', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 500,
};
