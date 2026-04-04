import { useEffect, useMemo } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../../context/DarkModeContext';
import NotificationsBell from '../NotificationsBell';
import '../students/StudentLayout.css';
import './AdminFacultyLayout.css';

function Icon({ name, className }) {
  const cls = `sidebar-icon sidebar-icon-${name} ${className || ''}`;
  if (name === 'grid') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    );
  }
  if (name === 'megaphone') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 11l18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </svg>
    );
  }
  if (name === 'settings') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
      </svg>
    );
  }
  if (name === 'audit') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    );
  }
  if (name === 'user-plus') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="8.5" cy="7" r="4" />
        <line x1="20" y1="8" x2="20" y2="14" />
        <line x1="23" y1="11" x2="17" y2="11" />
      </svg>
    );
  }
  if (name === 'school') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
        <path d="M6 12v5c3 3 9 3 12 0v-5" />
      </svg>
    );
  }
  return null;
}

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export default function AdminFacultyLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDarkMode } = useDarkMode();
  const user = JSON.parse(localStorage.getItem('ccs_user') || '{}');

  const menuItems = useMemo(() => {
    const base = [
      { path: '/admin-dashboard', label: 'Dashboard', icon: 'dashboard', exact: true },
      { path: '/admin-dashboard/profiling', label: 'Student Profiling', icon: 'grid' },
      { path: '/admin-dashboard/announcements', label: 'Announcements', icon: 'megaphone' },
      { path: '/admin-dashboard/profile-settings', label: 'Profile settings', icon: 'settings' },
    ];
    if (user.role === 'ADMIN') {
      return [
        base[0],
        { path: '/admin/audit-log', label: 'Audit log', icon: 'audit' },
        ...base.slice(1),
      ];
    }
    return base;
  }, [user.role]);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    if (!token) navigate('/login');
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('ccs_token');
    localStorage.removeItem('ccs_user');
    navigate('/login');
  };

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = String(name).trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return String(name).slice(0, 2).toUpperCase();
  };

  return (
    <div className="dashboard-layout">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <span className="dashboard-logo-text dashboard-logo-text--lms">CCS Student Profiling</span>
        </div>
        <div className="dashboard-header-right">
          <button
            type="button"
            className="dashboard-dark-toggle"
            onClick={toggleDarkMode}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDark ? <SunIcon /> : <MoonIcon />}
          </button>
          <NotificationsBell />
          <div className="dashboard-user">
            <div className="dashboard-avatar">{getInitial(user.name)}</div>
            <div className="dashboard-user-info">
              <span className="dashboard-user-name">{user.name || 'User'}</span>
              <span className="dashboard-user-role">{user.role || 'Admin'}</span>
            </div>
            <button type="button" className="dashboard-logout-btn" onClick={handleLogout} aria-label="Logout">
              <LogoutIcon />
              <span className="dashboard-logout-text">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <aside className="dashboard-sidebar">
        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const isActive =
              item.path === '/admin-dashboard'
                ? location.pathname === '/admin-dashboard'
                : location.pathname === item.path;
            return (
              <button
                key={item.path}
                type="button"
                className={`sidebar-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon name={item.icon} className={isActive ? 'active' : ''} />
                <span>{item.label}</span>
              </button>
            );
          })}
          {user.role === 'ADMIN' ? (
            <>
              <span className="admin-sidebar-section-label">Account management</span>
              <button
                type="button"
                className={`sidebar-item ${location.pathname === '/admin-dashboard/add-student' ? 'active' : ''}`}
                onClick={() => navigate('/admin-dashboard/add-student')}
              >
                <Icon
                  name="user-plus"
                  className={location.pathname === '/admin-dashboard/add-student' ? 'active' : ''}
                />
                <span>Add student</span>
              </button>
              <button
                type="button"
                className={`sidebar-item ${location.pathname === '/admin-dashboard/create-faculty' ? 'active' : ''}`}
                onClick={() => navigate('/admin-dashboard/create-faculty')}
              >
                <Icon
                  name="school"
                  className={location.pathname === '/admin-dashboard/create-faculty' ? 'active' : ''}
                />
                <span>Create faculty</span>
              </button>
            </>
          ) : null}
        </nav>
      </aside>
      <main className="dashboard-content">
        <Outlet />
      </main>
    </div>
  );
}
