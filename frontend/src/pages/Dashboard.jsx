import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { fetchDashboard } from '../api';

function avatarColor(name) {
  const palette = ['#4facfe', '#43e97b', '#fa709a', '#a18cd1', '#f7971e', '#00c9ff'];
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return palette[Math.abs(h) % palette.length];
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading">Loading…</div>;
  if (!data) return <div className="loading">Failed to load dashboard.</div>;

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue">👥</div>
          <div className="stat-label">Total Contacts</div>
          <div className="stat-value">{data.totalContacts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green">✅</div>
          <div className="stat-label">Active</div>
          <div className="stat-value">{data.activeContacts}</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon purple">📝</div>
          <div className="stat-label">Notes</div>
          <div className="stat-value">{data.totalNotes}</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <div className="table-header">
            <h2>Recent Contacts</h2>
            <Link to="/contacts" className="btn btn-secondary btn-sm">View all</Link>
          </div>
          {data.recentContacts.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">👤</div>
              <p>No contacts yet</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Company</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentContacts.map(c => (
                  <tr key={c.id}>
                    <td>
                      <Link to={`/contacts/${c.id}`} className="contact-cell" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <div className="avatar" style={{ background: avatarColor(c.name) }}>
                          {c.name[0].toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600 }}>{c.name}</div>
                          <div style={{ fontSize: 12, color: '#95a5b3' }}>{c.email || '—'}</div>
                        </div>
                      </Link>
                    </td>
                    <td style={{ color: '#7f8c9a' }}>{c.company || '—'}</td>
                    <td><span className={`badge badge-${c.status}`}>{c.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="card">
          <div className="table-header">
            <h2>Recent Activity</h2>
          </div>
          {data.recentNotes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No activity yet</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {data.recentNotes.map(note => (
                <div key={note.id} style={{ display: 'flex', gap: 12 }}>
                  <div
                    className="avatar"
                    style={{ background: avatarColor(note.contact_name), width: 32, height: 32, fontSize: 13, flexShrink: 0 }}
                  >
                    {note.contact_name[0].toUpperCase()}
                  </div>
                  <div>
                    <Link to={`/contacts/${note.contact_id}`} style={{ fontWeight: 600, fontSize: 14, textDecoration: 'none', color: '#1a2332' }}>
                      {note.contact_name}
                    </Link>
                    <p style={{ fontSize: 13, color: '#7f8c9a', margin: '2px 0', lineHeight: 1.4 }}>
                      {note.content.length > 70 ? note.content.slice(0, 70) + '…' : note.content}
                    </p>
                    <p style={{ fontSize: 12, color: '#b0bec5' }}>
                      {new Date(note.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
