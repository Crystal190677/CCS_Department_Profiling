import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COURSE_OPTIONS,
  SECTION_LETTERS,
  SECTION_CAPACITY,
  DEFAULT_YEAR_LEVEL_NEW_STUDENT,
  REGULAR_IRREGULAR_OPTIONS,
} from '../../constants/academicPlacement';
import './AdminAccountPages.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

export default function AdminAddStudentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    student_number: '',
    password: '',
    course: 'BSCS',
    section: 'A',
    academic_standing: 'Regular',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const raw = localStorage.getItem('ccs_user');
    if (!token || !raw) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(raw);
    if (u.role !== 'ADMIN') {
      navigate('/admin-dashboard');
    }
  }, [navigate]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        student_number: form.student_number.trim(),
        course: form.course,
        section: form.section,
        academic_standing: form.academic_standing,
      };
      if (form.password.trim()) body.password = form.password.trim();
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setSuccess('Student account created (1st year). View class lists under Student Profiling → Class lists.');
        setForm({
          name: '',
          email: '',
          student_number: '',
          password: '',
          course: 'BSCS',
          section: 'A',
          academic_standing: 'Regular',
        });
      } else {
        setError(data.message || 'Could not create student');
      }
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="admin-account-page admin-add-student-page">
      <h1>Add student</h1>
      <p className="admin-account-lead">
        New students are enrolled as <strong>{DEFAULT_YEAR_LEVEL_NEW_STUDENT}</strong> automatically. Assign course (BSCS or BSIT), section A–E, and Regular or Irregular standing.
        Sections are tracked up to {SECTION_CAPACITY} students for your records. Open{' '}
        <strong>Student Profiling</strong> → <strong>Class lists</strong> to browse by section.
      </p>

      {error ? <div className="admin-account-error" role="alert">{error}</div> : null}
      {success ? <div className="admin-account-success" role="status">{success}</div> : null}

      <div className="admin-account-card">
        <form className="admin-account-form" onSubmit={submit}>
          <div className="admin-account-row">
            <label htmlFor="aas-name">Full name</label>
            <input
              id="aas-name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="admin-account-row">
            <label htmlFor="aas-email">Email</label>
            <input
              id="aas-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              required
            />
          </div>
          <div className="admin-account-row">
            <label htmlFor="aas-sn">Student number</label>
            <input
              id="aas-sn"
              value={form.student_number}
              onChange={(e) => setForm((f) => ({ ...f, student_number: e.target.value }))}
              required
            />
          </div>
          <div className="admin-account-row">
            <label htmlFor="aas-pw">Initial password (optional)</label>
            <input
              id="aas-pw"
              type="password"
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              minLength={6}
              placeholder="Leave blank for claim-only activation"
            />
          </div>
          <div className="admin-account-row">
            <label htmlFor="aas-course">Course</label>
            <select
              id="aas-course"
              value={form.course}
              onChange={(e) => setForm((f) => ({ ...f, course: e.target.value }))}
              required
            >
              {COURSE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-account-row">
            <span className="admin-account-label-static">Year level</span>
            <p className="admin-account-readonly">{DEFAULT_YEAR_LEVEL_NEW_STUDENT} (automatic for new accounts)</p>
          </div>
          <div className="admin-account-row">
            <label htmlFor="aas-section">Section</label>
            <select
              id="aas-section"
              value={form.section}
              onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}
              required
            >
              {SECTION_LETTERS.map((s) => (
                <option key={s} value={s}>
                  Section {s}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-account-row">
            <label htmlFor="aas-standing">Regular / Irregular</label>
            <select
              id="aas-standing"
              value={form.academic_standing}
              onChange={(e) => setForm((f) => ({ ...f, academic_standing: e.target.value }))}
              required
            >
              {REGULAR_IRREGULAR_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="admin-account-actions">
            <button type="button" className="admin-account-btn-ghost" onClick={() => navigate('/admin-dashboard/profiling')}>
              Back to roster
            </button>
            <button type="submit" className="admin-account-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Create student'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
