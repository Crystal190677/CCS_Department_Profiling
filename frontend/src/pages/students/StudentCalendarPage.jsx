import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentCalendarPage.css';

const TZ = 'Asia/Manila';
const VISIBLE_EVENTS = 3;

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

function jsonHeaders() {
  return { ...getAuthHeaders(), 'Content-Type': 'application/json' };
}

/** Gregorian civil Y-M-D weekday: 0=Sun … 6=Sat (independent of browser local TZ). */
function civilWeekdaySun0(y, m, d) {
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
}

function daysInMonth(y, m) {
  return new Date(y, m, 0).getDate();
}

function getManilaYearMonth(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit' }).formatToParts(date);
  const y = parseInt(parts.find((p) => p.type === 'year').value, 10);
  const mo = parseInt(parts.find((p) => p.type === 'month').value, 10);
  return { year: y, month: mo };
}

function manilaDateKeyFromIso(iso) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

function manilaTimeHHMM(iso) {
  if (!iso) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: TZ,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(iso));
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${h.padStart(2, '0')}:${m.padStart(2, '0')}`;
  } catch {
    return '';
  }
}

function formatTimeManila(iso) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('en-PH', {
      timeZone: TZ,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return '';
  }
}

function monthTitle(year, month) {
  return new Intl.DateTimeFormat('en-PH', {
    timeZone: TZ,
    month: 'long',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, 15, 12, 0, 0)));
}

function getManilaTodayKey() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year').value;
  const mo = parts.find((p) => p.type === 'month').value;
  const d = parts.find((p) => p.type === 'day').value;
  return `${y}-${mo}-${d}`;
}

function kindBarClass(kind) {
  const k = String(kind || '').toLowerCase();
  if (k === 'personal') return 'student-cal-event--personal';
  if (k === 'meet') return 'student-cal-event--meet';
  if (k === 'assignment') return 'student-cal-event--assignment';
  if (k === 'activity') return 'student-cal-event--activity';
  if (k === 'quiz') return 'student-cal-event--quiz';
  return 'student-cal-event--task';
}

const emptyForm = () => ({
  title: '',
  event_date: '',
  start_time: '09:00',
  end_time: '10:00',
  description: '',
});

export default function StudentCalendarPage() {
  const navigate = useNavigate();
  const [view, setView] = useState(() => getManilaYearMonth());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(
        `/api/student-calendar?year=${encodeURIComponent(view.year)}&month=${encodeURIComponent(view.month)}`,
        { headers: getAuthHeaders() },
      );
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not load calendar.');
        setEvents([]);
        return;
      }
      setEvents(Array.isArray(data.data?.events) ? data.data.events : []);
    } catch {
      setError('Unable to load calendar.');
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [view.year, view.month]);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchCalendar();
  }, [navigate, fetchCalendar]);

  useEffect(() => {
    if (!modalOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setModalOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const eventsByDay = useMemo(() => {
    const map = {};
    for (const e of events) {
      if (!e.starts_at) continue;
      const k = manilaDateKeyFromIso(e.starts_at);
      if (!k) continue;
      if (!map[k]) map[k] = [];
      map[k].push(e);
    }
    for (const k of Object.keys(map)) {
      map[k].sort((a, b) => String(a.starts_at).localeCompare(String(b.starts_at)));
    }
    return map;
  }, [events]);

  const grid = useMemo(() => {
    const { year: y, month: m } = view;
    const firstDow = civilWeekdaySun0(y, m, 1);
    const dim = daysInMonth(y, m);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    const dimPrev = daysInMonth(prevY, prevM);
    const cells = [];

    for (let i = 0; i < firstDow; i += 1) {
      const d = dimPrev - firstDow + i + 1;
      cells.push({ key: `p-${d}`, day: d, isPadding: true, isPrev: true, y: prevY, m: prevM });
    }
    for (let d = 1; d <= dim; d += 1) {
      const key = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ key, day: d, isPadding: false, y, m });
    }
    const nextM = m === 12 ? 1 : m + 1;
    const nextY = m === 12 ? y + 1 : y;
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      cells.push({
        key: `n-${nextDay}`,
        day: nextDay,
        isPadding: true,
        isPrev: false,
        y: nextY,
        m: nextM,
      });
      nextDay += 1;
    }
    return cells;
  }, [view.year, view.month]);

  const goPrev = () => {
    setView((v) => {
      if (v.month === 1) return { year: v.year - 1, month: 12 };
      return { year: v.year, month: v.month - 1 };
    });
  };

  const goNext = () => {
    setView((v) => {
      if (v.month === 12) return { year: v.year + 1, month: 1 };
      return { year: v.year, month: v.month + 1 };
    });
  };

  const goToday = () => {
    setView(getManilaYearMonth());
  };

  const openCreate = (dateKey) => {
    setModalMode('create');
    setEditingId(null);
    setForm({ ...emptyForm(), event_date: dateKey });
    setModalError('');
    setModalOpen(true);
  };

  const openEdit = (e) => {
    setModalMode('edit');
    setEditingId(e.id);
    setForm({
      title: e.title || '',
      event_date: manilaDateKeyFromIso(e.starts_at),
      start_time: manilaTimeHHMM(e.starts_at) || '09:00',
      end_time: manilaTimeHHMM(e.ends_at) || '10:00',
      description: e.description || '',
    });
    setModalError('');
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setModalError('');
    setSaving(false);
  };

  const formatApiErrors = (data) => {
    if (data?.message && typeof data.message === 'string') return data.message;
    if (data?.errors && typeof data.errors === 'object') {
      const first = Object.values(data.errors).flat()[0];
      if (first) return String(first);
    }
    return 'Something went wrong.';
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setSaving(true);
    setModalError('');
    const body = {
      title: form.title.trim(),
      event_date: form.event_date,
      start_time: form.start_time,
      end_time: form.end_time,
      description: form.description.trim() || null,
    };
    if (!body.title) {
      setModalError('Title is required.');
      setSaving(false);
      return;
    }
    try {
      if (modalMode === 'create') {
        const res = await fetch('/api/student-calendar/events', {
          method: 'POST',
          headers: jsonHeaders(),
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!data.success) {
          setModalError(formatApiErrors(data));
          return;
        }
        closeModal();
        fetchCalendar();
        return;
      }
      const res = await fetch(`/api/student-calendar/events/${encodeURIComponent(editingId)}`, {
        method: 'PUT',
        headers: jsonHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!data.success) {
        setModalError(formatApiErrors(data));
        return;
      }
      closeModal();
      fetchCalendar();
    } catch {
      setModalError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (modalMode !== 'edit' || editingId == null) return;
    if (!window.confirm('Delete this event?')) return;
    setSaving(true);
    setModalError('');
    try {
      const res = await fetch(`/api/student-calendar/events/${encodeURIComponent(editingId)}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        setModalError(formatApiErrors(data));
        return;
      }
      closeModal();
      fetchCalendar();
    } catch {
      setModalError('Network error. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="student-cal-page">
      <header className="student-cal-toolbar">
        <div className="student-cal-toolbar-spacer" aria-hidden />
        <div className="student-cal-nav">
          <button type="button" className="student-cal-arrow" onClick={goPrev} aria-label="Previous month">
            ‹
          </button>
          <h1 className="student-cal-month-title">{monthTitle(view.year, view.month)}</h1>
          <button type="button" className="student-cal-arrow" onClick={goNext} aria-label="Next month">
            ›
          </button>
        </div>

        <div className="student-cal-toolbar-end">
          <button type="button" className="student-cal-today" onClick={goToday}>
            Today
          </button>
        </div>
      </header>

      {error && <p className="student-cal-error">{error}</p>}

      <div className="student-cal-grid-wrap">
        {loading ? (
          <p className="student-cal-muted">Loading calendar…</p>
        ) : (
          <div className="student-cal-grid" role="grid" aria-label={`Calendar ${monthTitle(view.year, view.month)}`}>
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label) => (
              <div key={label} className="student-cal-dow" role="columnheader">
                {label}
              </div>
            ))}
            {grid.map((cell, idx) => {
              const dateKey = `${cell.y}-${String(cell.m).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
              const dayEvents = !cell.isPadding ? eventsByDay[dateKey] || [] : [];
              const isToday = !cell.isPadding && dateKey === getManilaTodayKey();
              const show = dayEvents.slice(0, VISIBLE_EVENTS);
              const more = Math.max(0, dayEvents.length - VISIBLE_EVENTS);
              const rowEnd = idx % 7 === 6;

              return (
                <div
                  key={cell.key}
                  role="gridcell"
                  className={`student-cal-cell ${cell.isPadding ? 'student-cal-cell--pad' : ''} ${isToday ? 'student-cal-cell--today' : ''} ${rowEnd ? 'student-cal-cell--row-end' : ''} ${!cell.isPadding ? 'student-cal-cell--clickable' : ''}`}
                >
                  {!cell.isPadding ? (
                    <button
                      type="button"
                      className="student-cal-cell-hit"
                      onClick={() => openCreate(dateKey)}
                      aria-label={`Add event on ${dateKey}`}
                    >
                      <span className="student-cal-daynum">{cell.day}</span>
                      <ul className="student-cal-events">
                        {show.map((e) => (
                          <li key={e.id} className={`student-cal-event ${kindBarClass(e.kind)}`}>
                            <span className="student-cal-event-bar" aria-hidden />
                            <button
                              type="button"
                              className="student-cal-event-body"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                openEdit(e);
                              }}
                            >
                              <span className="student-cal-event-main">
                                <span className="student-cal-event-time">
                                  {e.ends_at
                                    ? `${formatTimeManila(e.starts_at)} – ${formatTimeManila(e.ends_at)}`
                                    : formatTimeManila(e.starts_at)}
                                </span>
                                <span className="student-cal-event-title" title={e.title}>
                                  {e.title}
                                </span>
                              </span>
                            </button>
                          </li>
                        ))}
                        {more > 0 && <li className="student-cal-more">+ {more}</li>}
                      </ul>
                    </button>
                  ) : (
                    <>
                      <span className="student-cal-daynum">{cell.day}</span>
                      <ul className="student-cal-events" />
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modalOpen && (
        <div className="student-cal-modal-backdrop" role="presentation" onClick={closeModal}>
          <div
            className="student-cal-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="student-cal-modal-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="student-cal-modal-title" className="student-cal-modal-title">
              {modalMode === 'create' ? 'New event' : 'Edit event'}
            </h2>
            <form className="student-cal-modal-form" onSubmit={handleSubmit}>
              <label className="student-cal-field">
                <span>Title</span>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  maxLength={255}
                  required
                  autoFocus
                />
              </label>
              <label className="student-cal-field">
                <span>Date</span>
                <input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((f) => ({ ...f, event_date: e.target.value }))}
                  required
                />
              </label>
              <div className="student-cal-field-row">
                <label className="student-cal-field">
                  <span>Start</span>
                  <input
                    type="time"
                    value={form.start_time}
                    onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
                    required
                  />
                </label>
                <label className="student-cal-field">
                  <span>End</span>
                  <input
                    type="time"
                    value={form.end_time}
                    onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <label className="student-cal-field">
                <span>Description (optional)</span>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={3}
                  maxLength={5000}
                />
              </label>
              {modalError && <p className="student-cal-modal-error">{modalError}</p>}
              <div className="student-cal-modal-actions">
                {modalMode === 'edit' && (
                  <button type="button" className="student-cal-btn student-cal-btn--danger" onClick={handleDelete} disabled={saving}>
                    Delete
                  </button>
                )}
                <div className="student-cal-modal-actions-end">
                  <button type="button" className="student-cal-btn student-cal-btn--ghost" onClick={closeModal} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="student-cal-btn student-cal-btn--primary" disabled={saving}>
                    {saving ? 'Saving…' : modalMode === 'create' ? 'Create' : 'Save'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
