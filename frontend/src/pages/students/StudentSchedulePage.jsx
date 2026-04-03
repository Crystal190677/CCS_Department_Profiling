import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCsCourseFromCatalog } from '../../data/ccsCsCurriculum';
import './StudentSchedulePage.css';

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const START_HOUR = 7;
const END_HOUR = 19;
const SLOT_MINUTES = 30;
const PX_PER_SLOT = 28;

const BLOCK_PALETTE = [
  '#7ec8e3',
  '#ffe066',
  '#8ce99a',
  '#ffa8a8',
  '#e599f7',
  '#69db7c',
  '#ffd8a8',
  '#b197fc',
  '#99e9e2',
  '#ffa94d',
];

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

function parseToMinutes(hm) {
  if (!hm) return 0;
  const s = String(hm).slice(0, 5);
  const [h, m] = s.split(':').map((x) => parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return 0;
  return h * 60 + m;
}

function formatSlotLabel(minutesFromMidnight) {
  const h24 = Math.floor(minutesFromMidnight / 60);
  const m = minutesFromMidnight % 60;
  const ampm = h24 >= 12 ? 'PM' : 'AM';
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  const time = m === 0 ? `${h12}:00` : `${h12}:${String(m).padStart(2, '0')}`;
  return `${time} ${ampm}`;
}

function formatRangeLabel(startHm, endHm) {
  const a = parseToMinutes(startHm);
  const b = parseToMinutes(endHm);
  return `${formatSlotLabel(a)} – ${formatSlotLabel(b)}`;
}

function colorForCode(code) {
  const s = String(code || '');
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return BLOCK_PALETTE[h % BLOCK_PALETTE.length];
}

export default function StudentSchedulePage() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const t0 = START_HOUR * 60;
  const t1 = END_HOUR * 60;
  const totalSlots = (t1 - t0) / SLOT_MINUTES;

  const timeLabels = useMemo(() => {
    const labels = [];
    for (let i = 0; i < totalSlots; i += 1) {
      labels.push(formatSlotLabel(t0 + i * SLOT_MINUTES));
    }
    return labels;
  }, [totalSlots, t0]);

  const fetchSchedule = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/student-schedule', { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) {
        if (res.status === 403) {
          setError('You do not have access to this page.');
        } else {
          setError(data.message || 'Could not load schedule.');
        }
        setEntries([]);
        return;
      }
      const d = data.data || {};
      setEntries(Array.isArray(d.entries) ? d.entries : []);
    } catch {
      setError('Unable to load schedule.');
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    if (!token) {
      navigate('/login');
      return;
    }
    fetchSchedule();
  }, [navigate, fetchSchedule]);

  const byDay = useMemo(() => {
    const map = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    for (const e of entries) {
      const d = Number(e.day_of_week);
      if (map[d]) map[d].push(e);
    }
    for (const d of Object.keys(map)) {
      map[d].sort((a, b) => parseToMinutes(a.start_time) - parseToMinutes(b.start_time));
    }
    return map;
  }, [entries]);

  const blockLayout = (startHm, endHm) => {
    const startMin = parseToMinutes(startHm);
    const endMin = parseToMinutes(endHm);
    const startSlot = (startMin - t0) / SLOT_MINUTES;
    const span = (endMin - startMin) / SLOT_MINUTES;
    return {
      top: startSlot * PX_PER_SLOT,
      height: Math.max(span * PX_PER_SLOT, PX_PER_SLOT * 1.5),
    };
  };

  const bodyHeight = totalSlots * PX_PER_SLOT;

  return (
    <div className="student-schedule-page">
      {error && <p className="student-schedule-error">{error}</p>}

      {loading ? (
        <p className="student-schedule-muted">Loading schedule…</p>
      ) : entries.length === 0 ? (
        <div className="student-schedule-empty ccs-surface-gradient">
          <p>No class schedule is on file for your account yet.</p>
          <p className="student-schedule-muted">Schedules are created for BSCS students based on curriculum and registrar data.</p>
        </div>
      ) : (
        <div className="student-schedule-calendar-wrap">
          <div
            className="student-schedule-calendar"
            role="grid"
            aria-label="Weekly schedule"
            style={{ gridTemplateRows: `auto ${bodyHeight}px` }}
          >
            <div className="student-schedule-corner" aria-hidden style={{ gridColumn: 1, gridRow: 1 }} />
            {DAY_LABELS.map((label, i) => (
              <div key={label} className="student-schedule-day-head" role="columnheader" style={{ gridColumn: i + 2, gridRow: 1 }}>
                {label}
              </div>
            ))}

            <div className="student-schedule-time-rail" style={{ gridColumn: 1, gridRow: 2, minHeight: bodyHeight }}>
              {timeLabels.map((lbl) => (
                <div key={lbl} className="student-schedule-time-label" style={{ height: PX_PER_SLOT }}>
                  {lbl}
                </div>
              ))}
            </div>

            {[1, 2, 3, 4, 5, 6].map((day, i) => (
              <div
                key={day}
                className="student-schedule-day-column"
                style={{ gridColumn: i + 2, gridRow: 2, minHeight: bodyHeight }}
                role="rowgroup"
              >
                <div className="student-schedule-day-grid-bg" style={{ height: bodyHeight }} />
                {byDay[day].map((e) => {
                  const course = getCsCourseFromCatalog(e.course_code);
                  const title = course?.title || e.course_code;
                  const layout = blockLayout(e.start_time, e.end_time);
                  return (
                    <div
                      key={`${e.course_code}-${e.start_time}-${e.day_of_week}`}
                      className="student-schedule-block"
                      style={{
                        top: layout.top,
                        height: layout.height,
                        backgroundColor: colorForCode(e.course_code),
                      }}
                      title={`${title} · ${formatRangeLabel(e.start_time, e.end_time)}`}
                    >
                      <span className="student-schedule-block-code">{e.course_code}</span>
                      <span className="student-schedule-block-name">{title}</span>
                      <span className="student-schedule-block-time">{formatRangeLabel(e.start_time, e.end_time)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
