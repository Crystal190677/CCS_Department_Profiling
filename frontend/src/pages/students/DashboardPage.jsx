import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setNotifications(data.data || []);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    const res = await fetch('/api/announcements', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setAnnouncements(data.data || []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');

    if (!token || !userData) {
      navigate('/login');
      return;
    }

    setUser(JSON.parse(userData));
    fetchNotifications();
    fetchAnnouncements();
  }, [navigate, fetchNotifications, fetchAnnouncements]);

  if (!user) return null;

  return (
    <div className="student-dashboard">
      <header className="dashboard-welcome ccs-gradient-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner">
          <h1 className="ccs-gradient-hero-title">Welcome, {user.name}!</h1>
          <p className="ccs-gradient-hero-subtitle">{user.role} Dashboard</p>
        </div>
      </header>

      {notifications.length > 0 && (
        <section className="dashboard-notifications ccs-surface-gradient">
          <h2 className="notifications-title">Your Notifications</h2>
          <div className="notifications-list">
            {notifications.slice(0, 5).map((n) => (
              <div key={n.id} className={`notification-item ${n.read_at ? '' : 'unread'}`}>
                <strong>{n.title}</strong>
                <p>{n.message}</p>
                <span className="notification-date">
                  {new Date(n.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="dashboard-announcements ccs-surface-gradient">
        <div className="announcements-header">
          <div className="announcements-title-row">
            <svg className="announcements-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 11l18-5v12L3 14v-3z" />
              <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
            </svg>
            <div>
              <h2 className="announcements-title">Recent Announcements</h2>
              <p className="announcements-subtitle">Latest updates from CCS</p>
            </div>
          </div>
        </div>

        <div className="announcements-list">
          {announcements.length === 0 ? (
            <p className="announcements-empty">No announcements yet. Check back soon.</p>
          ) : (
            announcements.slice(0, 5).map((ann) => (
              <article key={ann.id} className="announcement-card">
                <h3 className="announcement-title">{ann.title}</h3>
                {ann.image_url && (
                  <div className="announcement-image-wrap">
                    <img src={ann.image_url} alt="" className="announcement-image" />
                  </div>
                )}
                <p className="announcement-content">{ann.content}</p>
                <div className="announcement-meta">
                  <div className="announcement-meta-left">
                    <span className="announcement-author">By {ann.author?.name ?? 'Staff'}</span>
                    <span className={`announcement-tag tag-${ann.tag || 'general'}`}>{ann.tag || 'general'}</span>
                  </div>
                  <span className="announcement-date">
                    {ann.created_at ? new Date(ann.created_at).toLocaleDateString() : ''}
                  </span>
                </div>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
