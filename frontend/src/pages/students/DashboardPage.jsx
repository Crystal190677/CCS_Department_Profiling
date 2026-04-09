import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import FeedAnnouncementPost from '../../components/FeedAnnouncementPost';
import '../../components/news-feed.css';
import './DashboardPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

const FEED_LIMIT = 25;

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

  const roleLabel =
    user.role === 'STUDENT' ? 'Student' : user.role === 'OFFICER' ? 'Officer' : user.role === 'ADMIN' ? 'Admin' : user.role;

  const feedSlice = announcements.slice(0, FEED_LIMIT);

  return (
    <div className="student-dashboard nf-page">
      <header className="nf-feed-header">
        <h1 className="nf-feed-title">Your feed</h1>
        <p className="nf-feed-sub">Stay current with CCS announcements and your latest notifications.</p>
      </header>

      <div className="nf-welcome-card">
        <h2 className="nf-welcome-title">Welcome back, {user.name}!</h2>
        <p className="nf-welcome-sub">{roleLabel} · CCS Student Profiling</p>
      </div>

      {notifications.length > 0 && (
        <section className="nf-notifications-block" aria-labelledby="nf-notif-heading">
          <h2 id="nf-notif-heading" className="nf-section-label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            Notifications
          </h2>
          <div className="nf-notifications-stack">
            {notifications.slice(0, 6).map((n) => (
              <div key={n.id} className={`nf-notif-card ${n.read_at ? '' : 'nf-notif-card--unread'}`}>
                <span className="nf-notif-dot" aria-hidden />
                <div className="nf-notif-body">
                  <strong>{n.title}</strong>
                  <p>{n.message}</p>
                  <span className="nf-notif-time">{new Date(n.created_at).toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="nf-timeline" aria-labelledby="nf-announce-heading">
        <h2 id="nf-announce-heading" className="nf-section-label">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
            <path d="M3 11l18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
          </svg>
          Latest announcements
        </h2>

        {feedSlice.length === 0 ? (
          <p className="nf-empty">No announcements yet. Check back soon for news and events.</p>
        ) : (
          <div className="nf-feed-list">
            {feedSlice.map((ann) => (
              <FeedAnnouncementPost key={ann.id} announcement={ann} />
            ))}
          </div>
        )}

        <button type="button" className="nf-see-all" onClick={() => navigate('/dashboard/announcements')}>
          Open announcements page →
        </button>
      </section>
    </div>
  );
}
