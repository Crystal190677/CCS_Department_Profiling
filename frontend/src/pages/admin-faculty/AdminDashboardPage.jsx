import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import { GraduationCap, Shield, TriangleAlert } from 'lucide-react';
import './AdminDashboardPage.css';
import '../students/DashboardPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

const CARDS = [
  {
    key: 'students',
    label: 'Total Students',
    icon: GraduationCap,
    cardClass: 'adm-card-students',
    iconWrapClass: 'adm-icon-students',
  },
  {
    key: 'officers',
    label: 'Total Officers',
    icon: Shield,
    cardClass: 'adm-card-officers',
    iconWrapClass: 'adm-icon-officers',
  },
  {
    key: 'violations_this_month',
    label: 'Violations This Month',
    icon: TriangleAlert,
    cardClass: 'adm-card-violations',
    iconWrapClass: 'adm-icon-violations',
  },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [countKey, setCountKey] = useState(0);
  const [announcements, setAnnouncements] = useState([]);

  const loadStats = useCallback(async () => {
    setError('');
    const res = await fetch('/api/admin/stats', { headers: getAuthHeaders() });
    const data = await res.json();
    if (!data.success) {
      setError(data.message || 'Could not load statistics');
      setLoading(false);
      return;
    }
    setStats(data.data);
    setCountKey((k) => k + 1);
    setLoading(false);
  }, []);

  const loadAnnouncements = useCallback(async () => {
    const res = await fetch('/api/announcements', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setAnnouncements(data.data || []);
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const raw = localStorage.getItem('ccs_user');
    if (!token || !raw) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(raw);
    if (u.role !== 'ADMIN') {
      navigate('/dashboard');
      return;
    }
    loadStats();
    loadAnnouncements();
  }, [navigate, loadStats, loadAnnouncements]);

  return (
    <div className="adm-dash">
      <header className="ccs-gradient-hero adm-dash-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner adm-dash-hero-inner">
          <div>
            <h1 className="ccs-gradient-hero-title">Admin dashboard</h1>
            <p className="ccs-gradient-hero-subtitle">Live overview of CCS department metrics</p>
          </div>
          <button type="button" className="adm-dash-link-profiling" onClick={() => navigate('/admin-dashboard/profiling/talent-directory')}>
            Open student profiling →
          </button>
        </div>
      </header>

      {error && (
        <div className="adm-dash-error" role="alert">
          {error}
        </div>
      )}

      <div className="adm-stats-grid">
        {loading
          ? CARDS.map((c, i) => (
              <div key={c.key} className={`adm-stat-card adm-skeleton ${c.cardClass}`} style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="adm-skeleton-shimmer" />
              </div>
            ))
          : CARDS.map((c, i) => {
              const Icon = c.icon;
              const endVal = stats ? Number(stats[c.key]) || 0 : 0;
              return (
                <article
                  key={c.key}
                  className={`adm-stat-card ${c.cardClass}`}
                  style={{ animationDelay: `${i * 0.08}s` }}
                >
                  <div className="adm-stat-card-inner">
                    <div className={`adm-stat-icon-wrap ${c.iconWrapClass}`}>
                      <Icon className="adm-stat-lucide" strokeWidth={2} aria-hidden />
                    </div>
                    <div className="adm-stat-body">
                      <p className="adm-stat-label">{c.label}</p>
                      <p className="adm-stat-value" aria-live="polite">
                        <CountUp
                          key={countKey}
                          end={endVal}
                          duration={1.35}
                          separator=","
                          preserveValue
                        />
                      </p>
                    </div>
                  </div>
                  <div className="adm-stat-glow" aria-hidden />
                </article>
              );
            })}
      </div>

      <section className="dashboard-announcements ccs-surface-gradient adm-dash-announcements">
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
            <p className="announcements-empty">No announcements yet.</p>
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
