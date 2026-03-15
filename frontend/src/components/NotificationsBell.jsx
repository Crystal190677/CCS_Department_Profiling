import { useCallback, useEffect, useState } from 'react';
import './NotificationsBell.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

function BellIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

export default function NotificationsBell() {
  const [list, setList] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/notifications', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data) setList(Array.isArray(data.data) ? data.data : []);
      else setList([]);
    } catch {
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  const handleMarkRead = async (id) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) fetchNotifications();
    } catch (err) {}
  };

  const unreadCount = list.filter((n) => !n.read_at).length;

  return (
    <div className="notifications-bell-wrap">
      <button
        type="button"
        className="notifications-bell-btn"
        onClick={() => setOpen((o) => !o)}
        aria-label={unreadCount ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notifications-bell-badge" aria-hidden="true">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="notifications-bell-backdrop" onClick={() => setOpen(false)} aria-hidden="true" />
          <div className="notifications-bell-dropdown" role="dialog" aria-label="Notifications">
            <div className="notifications-bell-header">
              <span className="notifications-bell-title">Notifications</span>
              <button type="button" className="notifications-bell-close" onClick={() => setOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="notifications-bell-list">
              {loading ? (
                <p className="notifications-bell-empty">Loading…</p>
              ) : list.length === 0 ? (
                <p className="notifications-bell-empty">No notifications yet.</p>
              ) : (
                list.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    className={`notifications-bell-item ${n.read_at ? 'read' : 'unread'}`}
                    onClick={() => {
                      if (!n.read_at) handleMarkRead(n.id);
                    }}
                  >
                    <span className="notifications-bell-item-title">{n.title}</span>
                    <span className="notifications-bell-item-message">{n.message}</span>
                    {n.created_at && (
                      <span className="notifications-bell-item-time">
                        {new Date(n.created_at).toLocaleDateString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
