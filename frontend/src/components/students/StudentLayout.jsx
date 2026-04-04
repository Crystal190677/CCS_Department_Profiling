import { useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useDarkMode } from '../../context/DarkModeContext';
import NotificationsBell from '../NotificationsBell';
import MerchCartPanel from './MerchCartPanel';
import './StudentLayout.css';

/** Roles that have a linked student profile and may use the BSCS curriculum sidebar. */
const PROFILE_ROLES_FOR_CURRICULUM = new Set(['STUDENT', 'OFFICER']);

const MENU_ITEMS_BASE = [
  { path: '/dashboard', label: 'Dashboard', icon: 'grid' },
  { path: '/dashboard/announcements', label: 'Announcements', icon: 'megaphone' },
  { path: '/dashboard/merch-store', label: 'Merch Store', icon: 'tag' },
  { path: '/dashboard/my-profile', label: 'My Profile', icon: 'person' },
  { path: '/dashboard/profile-settings', label: 'Profile settings', icon: 'settings' },
];

const MENU_ITEM_OFFICER_MERCH = { path: '/dashboard/manage-merch', label: 'Manage Merchandise', icon: 'package', officerOnly: true };

/** Officers use profile + logout from header menu instead of these sidebar links. */
const OFFICER_SIDEBAR_EXCLUDED_PATHS = new Set(['/dashboard/my-profile', '/dashboard/profile-settings']);

const MEMBERSHIP_CARD_CHILDREN = [
  { path: '/dashboard/membership-cards/1st-year', label: '1st Year' },
  { path: '/dashboard/membership-cards/2nd-year', label: '2nd Year' },
  { path: '/dashboard/membership-cards/3rd-year', label: '3rd Year' },
  { path: '/dashboard/membership-cards/4th-year', label: '4th Year' },
  { path: '/dashboard/membership-cards/irregulars', label: 'All Irregulars' },
];

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
  if (name === 'tag') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    );
  }
  if (name === 'person') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
  }
  if (name === 'package') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16.5 9.4l-9-5.19M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
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
  if (name === 'id-card') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="5" width="16" height="14" rx="2" />
        <circle cx="9" cy="10" r="2" />
        <path d="M8 15h3M14 15h2M14 10h2" />
      </svg>
    );
  }
  if (name === 'calendar-month') {
    return (
      <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01" />
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

function getMenuItems(user) {
  let items = [...MENU_ITEMS_BASE];
  if (user?.role === 'OFFICER') {
    items = items.filter((item) => !OFFICER_SIDEBAR_EXCLUDED_PATHS.has(item.path));
    items.push(MENU_ITEM_OFFICER_MERCH);
  }
  return items;
}

/** Academic year label e.g. A.Y. 2025–2026 (August start, Asia/Manila calendar date). */
function academicYearLabelManila(d = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(d);
  const y = parseInt(parts.find((p) => p.type === 'year').value, 10);
  const m = parseInt(parts.find((p) => p.type === 'month').value, 10);
  if (m >= 8) {
    return `A.Y. ${y}–${y + 1}`;
  }
  return `A.Y. ${y - 1}–${y}`;
}

function semesterLabelFromProfile(profile) {
  if (!profile?.academic_semester && profile?.academic_semester !== 0) {
    return 'First Semester';
  }
  return parseInt(String(profile.academic_semester), 10) === 2 ? 'Second Semester' : 'First Semester';
}

function MembershipChevron({ className }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isDark, toggleDarkMode } = useDarkMode();
  const user = JSON.parse(localStorage.getItem('ccs_user') || '{}');
  const menuItems = getMenuItems(user);
  const onMembershipPath = location.pathname.startsWith('/dashboard/membership-cards');
  const [membershipOpen, setMembershipOpen] = useState(onMembershipPath);
  const [studentProfile, setStudentProfile] = useState(null);
  const [studentProfileReady, setStudentProfileReady] = useState(() => {
    try {
      const u = JSON.parse(localStorage.getItem('ccs_user') || '{}');
      return !PROFILE_ROLES_FOR_CURRICULUM.has(u.role);
    } catch {
      return true;
    }
  });
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    if (!token) navigate('/login');
  }, [navigate]);

  useEffect(() => {
    if (onMembershipPath) setMembershipOpen(true);
  }, [onMembershipPath]);

  useEffect(() => {
    if (!PROFILE_ROLES_FOR_CURRICULUM.has(user?.role)) {
      setStudentProfile(null);
      setStudentProfileReady(true);
      return;
    }
    setStudentProfileReady(false);
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('ccs_token');
        const res = await fetch('/api/student-profile', {
          headers: {
            Accept: 'application/json',
            ...(token && { Authorization: `Bearer ${token}` }),
          },
        });
        const data = await res.json();
        if (!cancelled && data.success) setStudentProfile(data.data ?? null);
      } catch {
        if (!cancelled) setStudentProfile(null);
      } finally {
        if (!cancelled) setStudentProfileReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id]);

  useEffect(() => {
    setUserMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!userMenuOpen) return;
    const onDoc = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [userMenuOpen]);

  const handleLogout = () => {
    localStorage.removeItem('ccs_token');
    localStorage.removeItem('ccs_user');
    navigate('/login');
  };

  const getInitial = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const dashboardItem = menuItems[0];
  const restMenuItems = menuItems.slice(1);

  const sidebarSemesterLabel = useMemo(() => {
    if (!PROFILE_ROLES_FOR_CURRICULUM.has(user?.role) || !studentProfileReady) {
      return 'First Semester';
    }
    return semesterLabelFromProfile(studentProfile);
  }, [user?.role, studentProfile, studentProfileReady]);

  const sidebarAcademicYearLabel = academicYearLabelManila();

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
          <MerchCartPanel />
          <NotificationsBell />
          {user?.role === 'OFFICER' ? (
            <div className="dashboard-user-menu-wrap" ref={userMenuRef}>
              <button
                type="button"
                className="dashboard-user dashboard-user--trigger"
                onClick={() => setUserMenuOpen((o) => !o)}
                aria-expanded={userMenuOpen}
                aria-haspopup="menu"
                aria-label="Account menu"
              >
                <div className="dashboard-avatar">{getInitial(user.name)}</div>
                <div className="dashboard-user-info">
                  <span className="dashboard-user-name">{user.name || 'User'}</span>
                  <span className="dashboard-user-role">{user.role || 'Student'}</span>
                </div>
                <MembershipChevron
                  className={`dashboard-user-menu-chevron ${userMenuOpen ? 'dashboard-user-menu-chevron--open' : ''}`}
                />
              </button>
              {userMenuOpen && (
                <div className="dashboard-user-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-user-dropdown-item"
                    onClick={() => {
                      navigate('/dashboard/my-profile');
                      setUserMenuOpen(false);
                    }}
                  >
                    My Profile
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    className="dashboard-user-dropdown-item dashboard-user-dropdown-item--danger"
                    onClick={() => {
                      handleLogout();
                      setUserMenuOpen(false);
                    }}
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="dashboard-user">
              <div className="dashboard-avatar">{getInitial(user.name)}</div>
              <div className="dashboard-user-info">
                <span className="dashboard-user-name">{user.name || 'User'}</span>
                <span className="dashboard-user-role">{user.role || 'Student'}</span>
              </div>
              <button type="button" className="dashboard-logout-btn" onClick={handleLogout} aria-label="Logout">
                <LogoutIcon />
                <span className="dashboard-logout-text">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-term" aria-label="Academic period">
          <div className="dashboard-sidebar-term-line1">{sidebarSemesterLabel}</div>
          <div className="dashboard-sidebar-term-line2">{sidebarAcademicYearLabel}</div>
        </div>
        <nav className="sidebar-nav">
          {dashboardItem && (
            <button
              key={dashboardItem.path}
              type="button"
              className={`sidebar-item ${location.pathname === dashboardItem.path ? 'active' : ''}`}
              onClick={() => navigate(dashboardItem.path)}
            >
              <Icon name={dashboardItem.icon} className={location.pathname === dashboardItem.path ? 'active' : ''} />
              <span>{dashboardItem.label}</span>
            </button>
          )}
          <button
            type="button"
            className={`sidebar-item ${location.pathname === '/dashboard/calendar' ? 'active' : ''}`}
            onClick={() => navigate('/dashboard/calendar')}
          >
            <Icon name="calendar-month" className={location.pathname === '/dashboard/calendar' ? 'active' : ''} />
            <span>My Calendar</span>
          </button>
          {restMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
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
          {user?.role === 'OFFICER' && (
            <div className="sidebar-membership">
              <button
                type="button"
                className={`sidebar-item sidebar-item--membership-parent ${onMembershipPath ? 'sidebar-item--branch-active' : ''}`}
                onClick={() => setMembershipOpen((o) => !o)}
                aria-expanded={membershipOpen}
                aria-controls="sidebar-membership-subnav"
              >
                <Icon name="id-card" />
                <span>Membership Card</span>
                <MembershipChevron className={`sidebar-membership-chevron ${membershipOpen ? 'sidebar-membership-chevron--open' : ''}`} />
              </button>
              {membershipOpen && (
                <div id="sidebar-membership-subnav" className="sidebar-membership-sub">
                  {MEMBERSHIP_CARD_CHILDREN.map((child) => {
                    const subActive =
                      child.path === '/dashboard/membership-cards/irregulars'
                        ? location.pathname === child.path
                        : location.pathname === child.path || location.pathname.startsWith(`${child.path}/`);
                    return (
                      <button
                        key={child.path}
                        type="button"
                        className={`sidebar-item sidebar-item--sub ${subActive ? 'active' : ''}`}
                        onClick={() => navigate(child.path)}
                      >
                        <span>{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </nav>
      </aside>

      <main
        className={`dashboard-content${location.pathname === '/dashboard/announcements' ? ' dashboard-content--announcements' : ''}`}
      >
        <Outlet />
      </main>
    </div>
  );
}
