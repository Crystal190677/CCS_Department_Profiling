import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './StudentProfilingDashboard.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export default function StudentProfilingDashboard() {
  const navigate = useNavigate();
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [error, setError] = useState('');
  const [officerActivityId, setOfficerActivityId] = useState('');
  const [officerPositions, setOfficerPositions] = useState([]);
  const [studentsForOfficers, setStudentsForOfficers] = useState([]);
  const [assignUserId, setAssignUserId] = useState('');
  const [assignPosition, setAssignPosition] = useState('President');
  const [assigningOfficer, setAssigningOfficer] = useState(false);
  const [removingOfficer, setRemovingOfficer] = useState(null);
  const user = JSON.parse(localStorage.getItem('ccs_user') || '{}');

  const fetchStudents = useCallback(async () => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (activityFilter) params.set('qualify_for', activityFilter);
    const res = await fetch(`/api/students?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setStudents(data.data.data || []);
    else setError(data.message || 'Failed to load students');
  }, [search, activityFilter]);

  const fetchActivities = useCallback(async () => {
    const res = await fetch('/api/activities', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setActivities(data.data || []);
  }, []);

  const fetchOfficerPositions = useCallback(async () => {
    if (!officerActivityId) {
      setOfficerPositions([]);
      return;
    }
    const res = await fetch(`/api/officer-positions?activity_id=${officerActivityId}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setOfficerPositions(data.data || []);
  }, [officerActivityId]);

  const fetchStudentsForOfficers = useCallback(async () => {
    const res = await fetch('/api/students?per_page=500&include_officers=1', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setStudentsForOfficers(data.data?.data || []);
  }, []);

  useEffect(() => {
    if (officerActivityId) fetchOfficerPositions();
    else setOfficerPositions([]);
  }, [officerActivityId, fetchOfficerPositions]);

  useEffect(() => {
    if (user?.role === 'ADMIN' || user?.role === 'FACULTY') fetchStudentsForOfficers();
  }, [user?.role, fetchStudentsForOfficers]);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const role = user?.role;
    if (!token || (role !== 'ADMIN' && role !== 'FACULTY')) {
      navigate('/login');
      return;
    }
    Promise.all([fetchStudents(), fetchActivities()]).finally(() => setLoading(false));
  }, [navigate, user?.role, fetchStudents, fetchActivities]);

  const handleEnroll = async (studentId, activityId) => {
    setEnrolling(studentId);
    try {
      const res = await fetch('/api/students/enroll', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_id: studentId, activity_id: activityId }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudents();
      } else {
        setError(data.message || 'Enrollment failed');
      }
    } catch (err) {
      setError('Enrollment request failed');
    } finally {
      setEnrolling(null);
    }
  };

  const isEnrolled = (student, activityId) =>
    student.enrollments?.some((e) => e.activity_id === activityId);

  const handleAssignOfficer = async (e) => {
    e.preventDefault();
    if (!officerActivityId || !assignUserId || !assignPosition.trim()) return;
    setAssigningOfficer(true);
    setError('');
    try {
      const res = await fetch('/api/officer-positions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          activity_id: Number(officerActivityId),
          user_id: Number(assignUserId),
          position: assignPosition.trim(),
        }),
      });
      const data = await res.json();
      if (data.success) {
        fetchOfficerPositions();
        setAssignUserId('');
      } else {
        setError(data.message || 'Failed to assign');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setAssigningOfficer(false);
    }
  };

  const handleRemoveOfficer = async (positionId) => {
    setRemovingOfficer(positionId);
    try {
      const res = await fetch(`/api/officer-positions/${positionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) fetchOfficerPositions();
      else setError(data.message || 'Failed to remove');
    } catch (err) {
      setError('Request failed');
    } finally {
      setRemovingOfficer(null);
    }
  };

  if (!user?.role) return null;

  return (
    <div className="student-profiling-dashboard">
      <div className="spd-header">
        <h1>Student Profiling Dashboard</h1>
        <p>Search and filter students by profile. Enroll qualified students in activities.</p>
      </div>

      <div className="spd-toolbar">
        <div className="spd-search">
          <svg className="spd-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            placeholder="Search by name, student number, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
            className="spd-search-input"
          />
        </div>
        <div className="spd-filter">
          <select
            value={activityFilter}
            onChange={(e) => setActivityFilter(e.target.value)}
            className="spd-filter-select"
          >
            <option value="">All students</option>
            <option value="" disabled>— Filter by activity —</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
        <button type="button" className="spd-search-btn" onClick={fetchStudents}>
          Search
        </button>
      </div>

      {error && (
        <div className="spd-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <div className="spd-loading">Loading students...</div>
      ) : (
        <div className="spd-table-wrap">
          <table className="spd-table">
            <thead>
              <tr>
                <th>Student</th>
                <th>Student #</th>
                <th>Course</th>
                <th>Profile</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="spd-empty">
                    No students found. Try adjusting your search or filter.
                  </td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <strong>{student.name}</strong>
                      <br />
                      <span className="spd-email">{student.email}</span>
                    </td>
                    <td>{student.student_number || '—'}</td>
                    <td>{student.student_profile?.course || '—'}</td>
                    <td>
                      <div className="spd-profile-tags">
                        {student.student_profile?.sports_interests?.map((s, i) => (
                          <span key={i} className="spd-tag">
                            {s}
                          </span>
                        ))}
                        {student.student_profile?.activity_interests?.map((s, i) => (
                          <span key={i} className="spd-tag spd-tag-activity">
                            {s}
                          </span>
                        ))}
                        {!student.student_profile && <span className="spd-tag spd-tag-none">No profile</span>}
                      </div>
                    </td>
                    <td>
                      {activities.length > 0 ? (
                        <div className="spd-enroll-group">
                          {activities.map((activity) => {
                            const enrolled = isEnrolled(student, activity.id);
                            return (
                              <button
                                key={activity.id}
                                type="button"
                                className={`spd-enroll-btn ${enrolled ? 'enrolled' : ''}`}
                                disabled={enrolled || enrolling === student.id}
                                onClick={() => handleEnroll(student.id, activity.id)}
                                title={enrolled ? 'Enrolled' : `Enroll in ${activity.name}`}
                              >
                                {enrolled ? '✓ Enrolled' : activity.name}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="spd-muted">No activities</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <section className="spd-officer-section">
        <h2 className="spd-officer-title">Assign officer positions</h2>
        <p className="spd-officer-desc">Assign students or officers to roles (e.g., President, VP, Secretary) per activity.</p>
        <div className="spd-officer-toolbar">
          <select
            value={officerActivityId}
            onChange={(e) => setOfficerActivityId(e.target.value)}
            className="spd-filter-select"
          >
            <option value="">Select activity</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {officerActivityId && (
            <form className="spd-officer-form" onSubmit={handleAssignOfficer}>
              <select
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
                className="spd-filter-select"
                required
              >
                <option value="">Select person</option>
                {studentsForOfficers.map((u) => (
                  <option key={u.id} value={u.id}>{u.name} {u.student_number ? `(${u.student_number})` : ''} — {u.role}</option>
                ))}
              </select>
              <select
                value={assignPosition}
                onChange={(e) => setAssignPosition(e.target.value)}
                className="spd-filter-select"
              >
                <option value="President">President</option>
                <option value="VP">VP</option>
                <option value="Secretary">Secretary</option>
                <option value="Treasurer">Treasurer</option>
                <option value="Other">Other</option>
              </select>
              <button type="submit" className="spd-search-btn" disabled={assigningOfficer || !assignUserId}>
                {assigningOfficer ? 'Assigning…' : 'Assign'}
              </button>
            </form>
          )}
        </div>
        {officerActivityId && (
          <div className="spd-officer-list">
            {officerPositions.length === 0 ? (
              <p className="spd-muted">No officer positions assigned for this activity.</p>
            ) : (
              <ul className="spd-officer-ul">
                {officerPositions.map((p) => (
                  <li key={p.id} className="spd-officer-li">
                    <span className="spd-officer-role">{p.position}</span>
                    <span className="spd-officer-name">{p.user?.name} {p.user?.student_number && `(${p.user.student_number})`}</span>
                    <button
                      type="button"
                      className="spd-officer-remove"
                      onClick={() => handleRemoveOfficer(p.id)}
                      disabled={removingOfficer === p.id}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
