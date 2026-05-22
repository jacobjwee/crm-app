import { NavLink } from 'react-router-dom';

export default function Navbar() {
  return (
    <div className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="accent">CRM</span> App
      </NavLink>
      <nav>
        <NavLink to="/dashboard">
          <span className="nav-icon">📊</span>
          Dashboard
        </NavLink>
        <NavLink to="/contacts">
          <span className="nav-icon">👥</span>
          Contacts
        </NavLink>
        <NavLink to="/campaigns">
          <span className="nav-icon">📣</span>
          Campaigns
        </NavLink>
        <NavLink to="/schedule">
          <span className="nav-icon">📅</span>
          Schedule
        </NavLink>
      </nav>
    </div>
  );
}
