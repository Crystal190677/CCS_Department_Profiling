import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './PlaceholderPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

const typeLabels = { past_activity: 'Past activity', award: 'Award', leadership: 'Leadership' };

export default function StudentHistoryPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    setUser(u);
    if (u.role !== 'OFFICER') {
      navigate('/dashboard');
    }
  }, [navigate]);

  const fetchStudents = useCallback(async () => {
    const res = await fetch('/api/students/list-for-officers', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setStudents(data.data || []);
  }, []);

  const fetchEntries = useCallback(async (userId) => {
    if (!userId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/non-academic-entries?user_id=${userId}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data?.data) setEntries(data.data.data);
      else setEntries([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === 'OFFICER') fetchStudents();
  }, [user?.role, fetchStudents]);

  useEffect(() => {
    if (selectedUserId) fetchEntries(selectedUserId);
    else setEntries([]);
  }, [selectedUserId, fetchEntries]);

  if (!user || user.role !== 'OFFICER') return null;

  const selectedStudent = students.find((s) => String(s.id) === String(selectedUserId));

  return (
    <div className="placeholder-page">
      <header className="ccs-gradient-hero ccs-gradient-hero--compact student-history-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner">
          <h1 className="ccs-gradient-hero-title">Student non-academic history</h1>
          <p className="ccs-gradient-hero-subtitle">View other students&apos; non-academic entries (read-only) for org-related context.</p>
        </div>
      </header>
      <div className="profile-form">
        <div className="profile-form-row">
          <label>Select student</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="profile-form-select"
          >
            <option value="">— Select —</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>{s.name} {s.student_number ? `(${s.student_number})` : ''}</option>
            ))}
          </select>
        </div>
      </div>
      {selectedUserId && (
        <div className="profile-info profile-academic">
          <h2 className="profile-academic-title">{selectedStudent?.name} — Non-academic entries</h2>
          {loading ? (
            <p className="profile-form-hint">Loading…</p>
          ) : entries.length === 0 ? (
            <p className="profile-form-hint">No entries.</p>
          ) : (
            <ul className="profile-na-list">
              {entries.map((entry) => (
                <li key={entry.id} className="profile-na-item">
                  <span className={`profile-na-badge profile-na-badge-${entry.status}`}>{entry.status}</span>
                  <strong>{typeLabels[entry.type] || entry.type}:</strong> {entry.title}
                  {entry.description && <span className="profile-na-desc"> — {entry.description}</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
