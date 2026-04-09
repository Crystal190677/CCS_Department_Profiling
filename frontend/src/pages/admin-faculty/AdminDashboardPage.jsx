import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CountUp from 'react-countup';
import { GraduationCap, Shield, TriangleAlert } from 'lucide-react';
import FeedAnnouncementPost from '../../components/FeedAnnouncementPost';
import '../../components/news-feed.css';
import './AdminDashboardPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

const FEED_LIMIT = 20;

const STAT_CONFIG = [
  {
    key: 'students',
    label: 'Students',
    icon: GraduationCap,
    wrapClass: 'nf-stat-mini--blue',
  },
  {
    key: 'officers',
    label: 'Officers',
    icon: Shield,
    wrapClass: 'nf-stat-mini--orange',
  },
  {
    key: 'violations_this_month',
    label: 'Violations (mo.)',
    icon: TriangleAlert,
    wrapClass: 'nf-stat-mini--rose',
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
    if (u.role !== 'ADMIN' && u.role !== 'OFFICER') {
      navigate('/dashboard');
      return;
    }
    loadStats();
    loadAnnouncements();
  }, [navigate, loadStats, loadAnnouncements]);

  const viewerRole = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ccs_user') || '{}').role;
    } catch {
      return '';
    }
  }, []);

  const dashTitle = viewerRole === 'OFFICER' ? 'Officer home' : 'Admin home';
  const announcementsPath = '/admin-dashboard/announcements';
  const feedSlice = announcements.slice(0, FEED_LIMIT);
  const isAdmin = viewerRole === 'ADMIN';

  return (
    <div className="adm-dash nf-page nf-page--wide">
      <header className="ccs-gradient-hero adm-dash-hero adm-dash-hero--feed">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner adm-dash-hero-inner adm-dash-hero-inner--feed">
          <div>
            <h1 className="ccs-gradient-hero-title">{dashTitle}</h1>
            <p className="ccs-gradient-hero-subtitle adm-dash-hero-tagline">
              Department pulse, live stats, and the same announcement feed students see — keep messaging consistent.
            </p>
          </div>
          <div className="adm-dash-hero-actions">
            <button type="button" className="adm-dash-link-profiling" onClick={() => navigate('/admin-dashboard/profiling/talent-directory')}>
              Student profiling →
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="adm-dash-error" role="alert">
          {error}
        </div>
      )}

      <div className="nf-stats-strip">
        {loading
          ? STAT_CONFIG.map((c) => (
              <div key={c.key} className={`nf-stat-mini ${c.wrapClass} adm-stat-skeleton`}>
                <div className="adm-stat-skeleton-shimmer" />
              </div>
            ))
          : STAT_CONFIG.map((c) => {
              const Icon = c.icon;
              const endVal = stats ? Number(stats[c.key]) || 0 : 0;
              return (
                <div key={c.key} className={`nf-stat-mini ${c.wrapClass}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', marginBottom: '0.25rem', opacity: 0.95 }}>
                    <Icon size={20} strokeWidth={2} aria-hidden />
                    <p className="nf-stat-mini-label" style={{ margin: 0 }}>
                      {c.label}
                    </p>
                  </div>
                  <p className="nf-stat-mini-value" aria-live="polite">
                    <CountUp key={countKey} end={endVal} duration={1.2} separator="," preserveValue />
                  </p>
                </div>
              );
            })}
      </div>

      <div className="nf-admin-toolbar">
        <div>
          <h2 className="nf-feed-title" style={{ margin: 0, fontSize: '1.15rem' }}>
            Announcement feed
          </h2>
          <p className="nf-feed-sub" style={{ margin: '0.25rem 0 0' }}>
            Posts with images appear here and on student dashboards.
          </p>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          <button type="button" className="nf-btn-primary-outline" onClick={() => navigate(announcementsPath)}>
            {isAdmin ? 'New post or manage' : 'Post announcement'}
          </button>
          <button type="button" className="nf-btn-ghost" onClick={() => navigate(announcementsPath)}>
            Full list
          </button>
        </div>
      </div>

      <section className="nf-timeline" aria-label="Announcements">
        {feedSlice.length === 0 ? (
          <p className="nf-empty">
            No announcements yet. {isAdmin ? 'Open announcements to add the first post and optional cover image.' : 'Post an update for the CCS community.'}
          </p>
        ) : (
          <div className="nf-feed-list">
            {feedSlice.map((ann) => (
              <FeedAnnouncementPost key={ann.id} announcement={ann} />
            ))}
          </div>
        )}

        <button type="button" className="nf-see-all" onClick={() => navigate(announcementsPath)}>
          Go to announcements →
        </button>
      </section>
    </div>
  );
}
