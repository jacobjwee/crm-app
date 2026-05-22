import { NavLink } from 'react-router-dom';
import {
  InboxIcon, DashboardIcon, CalendarIcon, UsersIcon, MegaphoneIcon,
  PlusIcon, SettingsIcon, Avatar,
} from './Icons';

const NAV = [
  { to: '/inbox',     Icon: InboxIcon,     label: 'Inbox',     badge: null },
  { to: '/dashboard', Icon: DashboardIcon, label: 'Dashboard', badge: null },
  { to: '/schedule',  Icon: CalendarIcon,  label: 'Calendar',  badge: null },
  { to: '/contacts',  Icon: UsersIcon,     label: 'Patients',  badge: null },
  { to: '/campaigns', Icon: MegaphoneIcon, label: 'Campaigns', badge: null },
];

const SAVED = ['Unassigned · 4', 'No-show recovery · 3', 'Awaiting forms · 6'];

export default function Navbar() {
  return (
    <aside className="sidebar">
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-logo">L</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
          <span style={{ color: '#fff', fontWeight: 600, fontSize: 14 }}>Lumen</span>
          <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>CRM</span>
        </div>
      </div>

      {/* New message */}
      <div style={{ padding: '0 10px', marginBottom: 6 }}>
        <button className="sidebar-new-btn">
          <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <PlusIcon size={13} strokeWidth={2.2} /> New message
          </span>
          <kbd className="sidebar-kbd">⌘N</kbd>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ padding: '8px 8px', flex: 1 }}>
        {NAV.map(({ to, Icon, label, badge }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
            <Icon size={16} strokeWidth={1.6} />
            <span style={{ flex: 1 }}>{label}</span>
            {badge != null && (
              <span className="sidebar-badge">{badge}</span>
            )}
          </NavLink>
        ))}

        <div className="sidebar-section-label">Saved views</div>
        {SAVED.map((v, i) => (
          <div key={i} className="sidebar-saved-item">{v}</div>
        ))}
      </nav>

      {/* User */}
      <div className="sidebar-user">
        <Avatar name="Jordan Kim" size={28} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: '#fff', fontSize: 12.5, fontWeight: 500, lineHeight: 1.2 }}>Jordan Kim</div>
          <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>Practice manager</div>
        </div>
        <SettingsIcon size={14} stroke="rgba(255,255,255,0.5)" />
      </div>
    </aside>
  );
}
