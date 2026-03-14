import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './DashboardPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { ...(token && { Authorization: `Bearer ${token}` }) };
}

const MOCK_ANNOUNCEMENTS = [
  {
    id: 1,
    title: 'Upcoming Hackathon 2026',
    content: 'Join us for the annual CCS Hackathon on March 20-21, 2026. Prizes worth $5,000! Register now.',
    author: 'Dr. Robert Anderson',
    tag: 'event',
    date: '2026-03-01',
  },
  {
    id: 2,
    title: 'New CCS Merch Available!',
    content: 'Check out our latest collection of CCS hoodies, t-shirts, and mugs. Limited stocks available!',
    author: 'Maria Clara Reyes',
    tag: 'general',
    date: '2026-03-04',
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);

  const fetchNotifications = useCallback(async () => {
    const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setNotifications(data.data || []);
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
  }, [navigate, fetchNotifications]);

  if (!user) return null;

  return (
    <div className="student-dashboard">
      <div className="dashboard-welcome">
        <h1 className="dashboard-welcome-title">Welcome, {user.name}!</h1>
        <p className="dashboard-welcome-subtitle">{user.role} Dashboard</p>
      </div>

      {notifications.length > 0 && (
        <section className="dashboard-notifications">
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

      <section className="dashboard-announcements">
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
          {MOCK_ANNOUNCEMENTS.map((ann) => (
            <article key={ann.id} className="announcement-card">
              <h3 className="announcement-title">{ann.title}</h3>
              <p className="announcement-content">{ann.content}</p>
              <div className="announcement-meta">
                <div className="announcement-meta-left">
                  <span className="announcement-author">By {ann.author}</span>
                  <span className={`announcement-tag tag-${ann.tag}`}>{ann.tag}</span>
                </div>
                <span className="announcement-date">{ann.date}</span>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
