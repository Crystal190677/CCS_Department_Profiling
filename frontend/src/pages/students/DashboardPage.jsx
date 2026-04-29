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
const CABUYAO_COORDS = { lat: 14.2471, lon: 121.1367 };

function weatherCodeLabel(code) {
  const c = Number(code);
  if (c === 0) return 'Clear sky';
  if (c === 1 || c === 2) return 'Partly cloudy';
  if (c === 3) return 'Overcast';
  if (c === 45 || c === 48) return 'Fog';
  if ([51, 53, 55, 56, 57].includes(c)) return 'Drizzle';
  if ([61, 63, 65, 66, 67].includes(c)) return 'Rain';
  if ([71, 73, 75, 77].includes(c)) return 'Snow';
  if ([80, 81, 82].includes(c)) return 'Rain showers';
  if ([95, 96, 99].includes(c)) return 'Thunderstorm';
  return 'Unknown';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [now, setNow] = useState(() => new Date());
  const [weather, setWeather] = useState({ loading: true, error: '', current: null, hourly: [] });

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

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000 * 30);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setWeather((w) => ({ ...w, loading: true, error: '' }));
        const params = new URLSearchParams({
          latitude: String(CABUYAO_COORDS.lat),
          longitude: String(CABUYAO_COORDS.lon),
          current: 'temperature_2m,apparent_temperature,relative_humidity_2m,surface_pressure,wind_speed_10m,weather_code',
          hourly: 'temperature_2m,weather_code',
          daily: 'sunrise,sunset',
          timezone: 'Asia/Manila',
          forecast_days: '1',
        });
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
        const data = await res.json();
        if (cancelled) return;
        const hourlyRows = Array.isArray(data?.hourly?.time)
          ? data.hourly.time
              .map((t, i) => ({
                time: t,
                temp: data.hourly?.temperature_2m?.[i],
                code: data.hourly?.weather_code?.[i],
              }))
              .filter((x) => x.time && x.temp != null)
              .slice(0, 8)
          : [];
        setWeather({
          loading: false,
          error: '',
          current: {
            ...data?.current,
            sunrise: data?.daily?.sunrise?.[0] || null,
            sunset: data?.daily?.sunset?.[0] || null,
          },
          hourly: hourlyRows,
        });
      } catch {
        if (!cancelled) {
          setWeather({ loading: false, error: 'Weather service unavailable right now.', current: null, hourly: [] });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!user) return null;

  const roleLabel =
    user.role === 'STUDENT' ? 'Student' : user.role === 'OFFICER' ? 'Officer' : user.role === 'ADMIN' ? 'Admin' : user.role;

  const feedSlice = announcements.slice(0, FEED_LIMIT);
  const dateLabel = now.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const dayLabel = now.toLocaleDateString(undefined, { weekday: 'long' });
  const timeLabel = now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const quickLinks = [
    { label: 'CCS Official Website', href: 'https://www.pnc.edu.ph/' },
    { label: 'CCS Facebook Page', href: 'https://www.facebook.com/' },
    { label: 'CCS YouTube Channel', href: 'https://www.youtube.com/' },
    { label: 'Announcements Page', href: '/dashboard/announcements', local: true },
  ];

  return (
    <div className="student-dashboard nf-page dbx-page">
      <header className="dbx-hero ccs-gradient-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner">
          <h1 className="ccs-gradient-hero-title">Welcome to CCS Portal</h1>
          <p className="ccs-gradient-hero-subtitle">
            College of Computing Studies · Pamantasan ng Cabuyao · {roleLabel}
          </p>
        </div>
      </header>

      <div className="dbx-grid">
        <main className="dbx-main">
          <div className="dbx-welcome-card">
            <h2>Welcome back, {user.name}!</h2>
            <p>Stay updated with CCS announcements, events, and important reminders.</p>
          </div>

          <section className="dbx-announcements" aria-labelledby="dbx-announce-heading">
            <div className="dbx-section-head">
              <h2 id="dbx-announce-heading">Announcements</h2>
              <button type="button" className="dbx-link-btn" onClick={() => navigate('/dashboard/announcements')}>
                View all
              </button>
            </div>

            {feedSlice.length === 0 ? (
              <p className="nf-empty">No announcements yet. Check back soon for news and events.</p>
            ) : (
              <div className="nf-feed-list">
                {feedSlice.map((ann) => (
                  <div key={ann.id} className="dbx-ann-card">
                    <FeedAnnouncementPost announcement={ann} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        <aside className="dbx-side">
          <section className="dbx-side-card dbx-side-card--datetime">
            <p className="dbx-side-date">{dateLabel}</p>
            <p className="dbx-side-year">{now.getFullYear()}</p>
            <p className="dbx-side-day">{dayLabel}</p>
            <p className="dbx-side-time">{timeLabel}</p>
          </section>

          <section className="dbx-side-card">
            <h3>Weather Forecast</h3>
            {weather.loading ? (
              <p className="dbx-muted">Loading weather…</p>
            ) : weather.error ? (
              <p className="dbx-muted">{weather.error}</p>
            ) : weather.current ? (
              <>
                <div className="dbx-weather-top">
                  <strong>{Math.round(Number(weather.current.temperature_2m ?? 0))}°C</strong>
                  <span>{weatherCodeLabel(weather.current.weather_code)}</span>
                </div>
                <div className="dbx-weather-meta">
                  <p>Feels like: {Math.round(Number(weather.current.apparent_temperature ?? 0))}°C</p>
                  <p>Wind: {Math.round(Number(weather.current.wind_speed_10m ?? 0))} km/h</p>
                  <p>Humidity: {Math.round(Number(weather.current.relative_humidity_2m ?? 0))}%</p>
                  <p>Pressure: {Math.round(Number(weather.current.surface_pressure ?? 0))} hPa</p>
                  <p>
                    Sunrise: {weather.current.sunrise ? new Date(weather.current.sunrise).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
                  </p>
                  <p>
                    Sunset: {weather.current.sunset ? new Date(weather.current.sunset).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
                  </p>
                </div>
                {weather.hourly.length > 0 && (
                  <div className="dbx-hourly">
                    {weather.hourly.map((h) => (
                      <div key={h.time} className="dbx-hour-row">
                        <span>{new Date(h.time).toLocaleTimeString([], { hour: 'numeric' })}</span>
                        <span>{Math.round(Number(h.temp))}°C</span>
                        <span>{weatherCodeLabel(h.code)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="dbx-muted">No weather data.</p>
            )}
          </section>

          <section className="dbx-side-card">
            <h3>Quick Links</h3>
            <ul className="dbx-links">
              {quickLinks.map((l) => (
                <li key={l.label}>
                  {l.local ? (
                    <button type="button" className="dbx-link-btn dbx-link-btn--inline" onClick={() => navigate(l.href)}>
                      {l.label}
                    </button>
                  ) : (
                    <a href={l.href} target="_blank" rel="noopener noreferrer">
                      {l.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </section>

          {notifications.length > 0 && (
            <section className="dbx-side-card">
              <h3>Recent Notifications</h3>
              <div className="nf-notifications-stack">
                {notifications.slice(0, 4).map((n) => (
                  <div key={n.id} className={`nf-notif-card ${n.read_at ? '' : 'nf-notif-card--unread'}`}>
                    <span className="nf-notif-dot" aria-hidden />
                    <div className="nf-notif-body">
                      <strong>{n.title}</strong>
                      <p>{n.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}
