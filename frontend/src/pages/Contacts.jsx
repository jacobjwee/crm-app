import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { fetchContacts, createContact, updateContact, deleteContact } from '../api';
import Modal from '../components/Modal';

function avatarColor(name) {
  const palette = ['#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#f7971e', '#00c9ff'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

const BLANK = { name: '', email: '', phone: '', company: '', status: 'active' };

export default function Contacts() {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(BLANK);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setContacts(await fetchContacts(search));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const t = setTimeout(load, 220);
    return () => clearTimeout(t);
  }, [load]);

  function openAdd() {
    setEditing(null);
    setForm(BLANK);
    setShowModal(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({ name: c.name, email: c.email || '', phone: c.phone || '', company: c.company || '', status: c.status });
    setShowModal(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await updateContact(editing.id, form);
      } else {
        await createContact(form);
      }
      setShowModal(false);
      load();
    } catch (err) {
      alert(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Delete this contact and all their notes?')) return;
    try {
      await deleteContact(id);
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert(err.message);
    }
  }

  function field(key) {
    return e => setForm(f => ({ ...f, [key]: e.target.value }));
  }

  return (
    <div>
      <div className="page-header">
        <h1>Contacts</h1>
        <div style={{ display: 'flex', gap: 12 }}>
          <div className="search-bar">
            <span>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search contacts…" />
          </div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Contact</button>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <div className="loading">Loading…</div>
        ) : contacts.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">👥</div>
            <p>{search ? 'No contacts match your search.' : 'No contacts yet. Add your first one!'}</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Company</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {contacts.map(c => (
                <tr key={c.id}>
                  <td>
                    <Link to={`/contacts/${c.id}`} className="contact-cell" style={{ textDecoration: 'none', color: 'inherit' }}>
                      <div className="avatar" style={{ background: avatarColor(c.name) }}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 600 }}>{c.name}</span>
                    </Link>
                  </td>
                  <td style={{ color: '#7f8c9a' }}>{c.email || '—'}</td>
                  <td style={{ color: '#7f8c9a' }}>{c.phone || '—'}</td>
                  <td>{c.company || '—'}</td>
                  <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit Contact' : 'Add Contact'} onClose={() => setShowModal(false)}>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label>Name *</label>
                <input required value={form.name} onChange={field('name')} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Company</label>
                <input value={form.company} onChange={field('company')} placeholder="Company name" />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                <input type="email" value={form.email} onChange={field('email')} placeholder="email@example.com" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input value={form.phone} onChange={field('phone')} placeholder="+1 (555) 000-0000" />
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
              <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving…' : editing ? 'Save Changes' : 'Add Contact'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
