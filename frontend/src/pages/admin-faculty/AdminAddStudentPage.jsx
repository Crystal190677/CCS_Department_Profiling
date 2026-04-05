import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  COURSE_OPTIONS,
  SECTION_LETTERS,
  SECTION_CAPACITY,
  DEFAULT_YEAR_LEVEL_NEW_STUDENT,
  REGULAR_IRREGULAR_OPTIONS,
  YEAR_LEVEL_OPTIONS,
  ACADEMIC_SEMESTER_OPTIONS,
} from '../../constants/academicPlacement';
import './AdminAccountPages.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function linesToList(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/\n/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function commaLinesToList(text) {
  if (!text || !String(text).trim()) return [];
  return String(text)
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const NON_ACADEMIC_TYPES = [
  { value: 'past_activity', label: 'Club / activity / event' },
  { value: 'award', label: 'Award' },
  { value: 'leadership', label: 'Leadership' },
];

const VIOLATION_SEVERITIES = ['Minor', 'Major', 'Grave'];

function emptyNonAcademicRow() {
  return { type: 'past_activity', title: '', description: '' };
}

function emptyViolationRow() {
  return { title: '', description: '', severity: 'Minor', recorded_at: '' };
}

function getInitialForm() {
  return {
    name: '',
    email: '',
    student_number: '',
    contact_number: '',
    address: '',
    birthdate: '',
    password: '',
    course: 'BSCS',
    year_level: DEFAULT_YEAR_LEVEL_NEW_STUDENT,
    section: 'A',
    academic_semester: '',
    current_gpa: '',
    academic_standing: 'Regular',
    skills_notes: '',
    sports_affiliations: '',
    org_affiliations: '',
    technical_skills_text: '',
    non_technical_skills_text: '',
  };
}

export default function AdminAddStudentPage() {
  const navigate = useNavigate();
  const [form, setForm] = useState(getInitialForm);
  const [nonAcademicRows, setNonAcademicRows] = useState([emptyNonAcademicRow()]);
  const [violationRows, setViolationRows] = useState([emptyViolationRow()]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

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

  useEffect(() => {
    if (!showSuccessToast) return undefined;
    const t = setTimeout(() => setShowSuccessToast(false), 3200);
    return () => clearTimeout(t);
  }, [showSuccessToast]);

  useEffect(() => {
    if (!showConfirmSubmit) return undefined;
    const onKey = (ev) => {
      if (ev.key === 'Escape') setShowConfirmSubmit(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showConfirmSubmit]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    setShowConfirmSubmit(true);
  };

  const performSubmit = async () => {
    if (saving) return;
    setShowConfirmSubmit(false);
    setSaving(true);
    setError('');
    try {
      const body = {
        name: form.name.trim(),
        email: form.email.trim(),
        student_number: form.student_number.trim(),
        course: form.course,
        section: form.section,
        year_level: form.year_level,
        academic_standing: form.academic_standing,
        contact_number: form.contact_number.trim() || null,
        address: form.address.trim() || null,
        birthdate: form.birthdate || null,
        skills_notes: form.skills_notes.trim() || null,
        sports_interests: commaLinesToList(form.sports_affiliations),
        activity_interests: commaLinesToList(form.org_affiliations),
        technical_skills: linesToList(form.technical_skills_text),
        non_technical_skills: linesToList(form.non_technical_skills_text),
        non_academic_entries: nonAcademicRows
          .filter((r) => r.title.trim())
          .map((r) => ({
            type: r.type,
            title: r.title.trim(),
            description: r.description.trim() || null,
          })),
        violations: violationRows
          .filter((r) => r.title.trim())
          .map((r) => ({
            title: r.title.trim(),
            description: r.description.trim() || null,
            severity: r.severity || null,
            recorded_at: r.recorded_at || null,
          })),
      };
      if (form.password.trim()) body.password = form.password.trim();
      if (form.academic_semester !== '' && form.academic_semester != null) {
        body.academic_semester = Number(form.academic_semester);
      }
      if (form.current_gpa !== '' && form.current_gpa != null) {
        const g = parseFloat(String(form.current_gpa).trim());
        if (!Number.isNaN(g)) body.current_gpa = g;
      }

      const res = await fetch('/api/students', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setForm(getInitialForm());
        setNonAcademicRows([emptyNonAcademicRow()]);
        setViolationRows([emptyViolationRow()]);
        setShowSuccessToast(true);
      } else {
        const msg =
          data.message ||
          (data.errors && typeof data.errors === 'object'
            ? Object.values(data.errors).flat().join(' ')
            : null) ||
          'Could not create student';
        setError(msg);
      }
    } catch {
      setError('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const cancelConfirmSubmit = () => {
    if (saving) return;
    setShowConfirmSubmit(false);
  };

  return (
    <div className="admin-account-page admin-add-student-page admin-add-student-page--wide">
      <h1>Add student</h1>
      <p className="admin-account-lead">
        Complete all sections to create a full student profile. Academic placement (course, year level, section, and
        Regular or Irregular standing) determines where the student appears under{' '}
        <strong>Student Profiling</strong> → <strong>Class List</strong>. Sections are tracked up to {SECTION_CAPACITY}{' '}
        students for your records.
      </p>

      {error ? (
        <div className="admin-account-error" role="alert">
          {error}
        </div>
      ) : null}

      {showSuccessToast ? (
        <div className="aas-toast" role="status" aria-live="polite">
          <span className="aas-toast-text">Student added successfully!</span>
        </div>
      ) : null}

      {showConfirmSubmit ? (
        <div className="aas-confirm-overlay" role="presentation" onClick={cancelConfirmSubmit}>
          <div
            className="aas-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="aas-confirm-title"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h3 id="aas-confirm-title" className="aas-confirm-title">
              Confirm add student
            </h3>
            <p className="aas-confirm-body">
              Add this student with the details you entered? They will be placed in Class List under the selected course,
              year level, and section.
            </p>
            <div className="aas-confirm-actions">
              <button type="button" className="aas-confirm-btn aas-confirm-btn--ghost" onClick={cancelConfirmSubmit}>
                Cancel
              </button>
              <button
                type="button"
                className="aas-confirm-btn aas-confirm-btn--primary"
                onClick={() => void performSubmit()}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Yes, add student'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div className="admin-account-card admin-add-student-card">
        <form className="admin-account-form admin-add-student-form" onSubmit={handleFormSubmit}>
          <section className="admin-add-student-section" aria-labelledby="aas-sec-personal">
            <h2 id="aas-sec-personal" className="admin-add-student-section-title">
              Personal information
            </h2>
            <div className="admin-add-student-grid">
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
                <label htmlFor="aas-contact">Contact number</label>
                <input
                  id="aas-contact"
                  type="tel"
                  value={form.contact_number}
                  onChange={(e) => setForm((f) => ({ ...f, contact_number: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="admin-account-row admin-add-student-span-2">
                <label htmlFor="aas-address">Address</label>
                <textarea
                  id="aas-address"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                  placeholder="Street, city, province (optional)"
                />
              </div>
              <div className="admin-account-row">
                <label htmlFor="aas-birth">Birthdate</label>
                <input
                  id="aas-birth"
                  type="date"
                  value={form.birthdate}
                  onChange={(e) => setForm((f) => ({ ...f, birthdate: e.target.value }))}
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
            </div>
          </section>

          <section className="admin-add-student-section" aria-labelledby="aas-sec-academic">
            <h2 id="aas-sec-academic" className="admin-add-student-section-title">
              Academic history
            </h2>
            <div className="admin-add-student-grid">
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
                <label htmlFor="aas-year">Year level</label>
                <select
                  id="aas-year"
                  value={form.year_level}
                  onChange={(e) => setForm((f) => ({ ...f, year_level: e.target.value }))}
                  required
                >
                  {YEAR_LEVEL_OPTIONS.map((yl) => (
                    <option key={yl} value={yl}>
                      {yl}
                    </option>
                  ))}
                </select>
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
                <label htmlFor="aas-gpa">GPA</label>
                <input
                  id="aas-gpa"
                  type="number"
                  step="0.01"
                  min="0"
                  max="5"
                  value={form.current_gpa}
                  onChange={(e) => setForm((f) => ({ ...f, current_gpa: e.target.value }))}
                  placeholder="Optional"
                />
              </div>
              <div className="admin-account-row">
                <label htmlFor="aas-sem">Academic semester</label>
                <select
                  id="aas-sem"
                  value={form.academic_semester}
                  onChange={(e) => setForm((f) => ({ ...f, academic_semester: e.target.value }))}
                >
                  <option value="">—</option>
                  {ACADEMIC_SEMESTER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-account-row">
                <label htmlFor="aas-standing">Academic standing</label>
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
            </div>
          </section>

          <section className="admin-add-student-section" aria-labelledby="aas-sec-nonacad">
            <h2 id="aas-sec-nonacad" className="admin-add-student-section-title">
              Non-academic activities
            </h2>
            <p className="admin-add-student-section-hint">Clubs, organizations, and events (add a row per entry).</p>
            <div className="admin-add-student-repeaters">
              {nonAcademicRows.map((row, idx) => (
                <div key={idx} className="admin-add-student-repeater-card">
                  <div className="admin-add-student-grid">
                    <div className="admin-account-row">
                      <label htmlFor={`aas-na-type-${idx}`}>Category</label>
                      <select
                        id={`aas-na-type-${idx}`}
                        value={row.type}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNonAcademicRows((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, type: v } : r)),
                          );
                        }}
                      >
                        {NON_ACADEMIC_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-account-row admin-add-student-span-2">
                      <label htmlFor={`aas-na-title-${idx}`}>Title</label>
                      <input
                        id={`aas-na-title-${idx}`}
                        value={row.title}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNonAcademicRows((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, title: v } : r)),
                          );
                        }}
                        placeholder="e.g. Chess club, Hackathon 2025"
                      />
                    </div>
                    <div className="admin-account-row admin-add-student-span-2">
                      <label htmlFor={`aas-na-desc-${idx}`}>Description</label>
                      <textarea
                        id={`aas-na-desc-${idx}`}
                        rows={2}
                        value={row.description}
                        onChange={(e) => {
                          const v = e.target.value;
                          setNonAcademicRows((rows) =>
                            rows.map((r, i) => (i === idx ? { ...r, description: v } : r)),
                          );
                        }}
                        placeholder="Optional details"
                      />
                    </div>
                  </div>
                  {nonAcademicRows.length > 1 ? (
                    <button
                      type="button"
                      className="admin-add-student-btn-remove"
                      onClick={() => setNonAcademicRows((rows) => rows.filter((_, i) => i !== idx))}
                    >
                      Remove row
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="admin-add-student-btn-add"
                onClick={() => setNonAcademicRows((rows) => [...rows, emptyNonAcademicRow()])}
              >
                + Add activity
              </button>
            </div>
          </section>

          <section className="admin-add-student-section" aria-labelledby="aas-sec-violations">
            <h2 id="aas-sec-violations" className="admin-add-student-section-title">
              Violations
            </h2>
            <p className="admin-add-student-section-hint">Record conduct incidents if any (optional).</p>
            <div className="admin-add-student-repeaters">
              {violationRows.map((row, idx) => (
                <div key={idx} className="admin-add-student-repeater-card">
                  <div className="admin-add-student-grid">
                    <div className="admin-account-row">
                      <label htmlFor={`aas-v-type-${idx}`}>Type</label>
                      <input
                        id={`aas-v-type-${idx}`}
                        value={row.title}
                        onChange={(e) => {
                          const v = e.target.value;
                          setViolationRows((rows) => rows.map((r, i) => (i === idx ? { ...r, title: v } : r)));
                        }}
                        placeholder="e.g. Tardiness, dress code"
                      />
                    </div>
                    <div className="admin-account-row">
                      <label htmlFor={`aas-v-date-${idx}`}>Date</label>
                      <input
                        id={`aas-v-date-${idx}`}
                        type="date"
                        value={row.recorded_at}
                        onChange={(e) => {
                          const v = e.target.value;
                          setViolationRows((rows) => rows.map((r, i) => (i === idx ? { ...r, recorded_at: v } : r)));
                        }}
                      />
                    </div>
                    <div className="admin-account-row">
                      <label htmlFor={`aas-v-sev-${idx}`}>Severity</label>
                      <select
                        id={`aas-v-sev-${idx}`}
                        value={row.severity}
                        onChange={(e) => {
                          const v = e.target.value;
                          setViolationRows((rows) => rows.map((r, i) => (i === idx ? { ...r, severity: v } : r)));
                        }}
                      >
                        {VIOLATION_SEVERITIES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="admin-account-row admin-add-student-span-2">
                      <label htmlFor={`aas-v-desc-${idx}`}>Description</label>
                      <textarea
                        id={`aas-v-desc-${idx}`}
                        rows={2}
                        value={row.description}
                        onChange={(e) => {
                          const v = e.target.value;
                          setViolationRows((rows) => rows.map((r, i) => (i === idx ? { ...r, description: v } : r)));
                        }}
                        placeholder="Optional"
                      />
                    </div>
                  </div>
                  {violationRows.length > 1 ? (
                    <button
                      type="button"
                      className="admin-add-student-btn-remove"
                      onClick={() => setViolationRows((rows) => rows.filter((_, i) => i !== idx))}
                    >
                      Remove row
                    </button>
                  ) : null}
                </div>
              ))}
              <button
                type="button"
                className="admin-add-student-btn-add"
                onClick={() => setViolationRows((rows) => [...rows, emptyViolationRow()])}
              >
                + Add violation
              </button>
            </div>
          </section>

          <section className="admin-add-student-section" aria-labelledby="aas-sec-skills">
            <h2 id="aas-sec-skills" className="admin-add-student-section-title">
              Skills
            </h2>
            <div className="admin-add-student-grid">
              <div className="admin-account-row admin-add-student-span-2">
                <label htmlFor="aas-tech-skills">Technical skills</label>
                <textarea
                  id="aas-tech-skills"
                  rows={4}
                  value={form.technical_skills_text}
                  onChange={(e) => setForm((f) => ({ ...f, technical_skills_text: e.target.value }))}
                  placeholder="One skill per line (e.g. Python, SQL, network administration)"
                />
              </div>
              <div className="admin-account-row admin-add-student-span-2">
                <label htmlFor="aas-ntech-skills">Non-technical skills</label>
                <textarea
                  id="aas-ntech-skills"
                  rows={4}
                  value={form.non_technical_skills_text}
                  onChange={(e) => setForm((f) => ({ ...f, non_technical_skills_text: e.target.value }))}
                  placeholder="One skill per line (e.g. Public speaking, teamwork)"
                />
              </div>
              <div className="admin-account-row admin-add-student-span-2">
                <label htmlFor="aas-skills-notes">Additional notes (optional)</label>
                <textarea
                  id="aas-skills-notes"
                  rows={2}
                  value={form.skills_notes}
                  onChange={(e) => setForm((f) => ({ ...f, skills_notes: e.target.value }))}
                  placeholder="Summary or context for skills"
                />
              </div>
            </div>
          </section>

          <section className="admin-add-student-section" aria-labelledby="aas-sec-affil">
            <h2 id="aas-sec-affil" className="admin-add-student-section-title">
              Affiliations
            </h2>
            <div className="admin-add-student-grid">
              <div className="admin-account-row admin-add-student-span-2">
                <label htmlFor="aas-sports">Sports</label>
                <textarea
                  id="aas-sports"
                  rows={2}
                  value={form.sports_affiliations}
                  onChange={(e) => setForm((f) => ({ ...f, sports_affiliations: e.target.value }))}
                  placeholder="Comma- or line-separated (e.g. Basketball, Volleyball)"
                />
              </div>
              <div className="admin-account-row admin-add-student-span-2">
                <label htmlFor="aas-orgs">Organizations</label>
                <textarea
                  id="aas-orgs"
                  rows={2}
                  value={form.org_affiliations}
                  onChange={(e) => setForm((f) => ({ ...f, org_affiliations: e.target.value }))}
                  placeholder="Comma- or line-separated"
                />
              </div>
            </div>
          </section>

          <div className="admin-account-actions admin-add-student-actions">
            <button
              type="button"
              className="admin-account-btn-ghost"
              onClick={() => navigate('/admin-dashboard/profiling/talent-directory')}
            >
              Back to roster
            </button>
            <button type="submit" className="admin-account-btn-primary" disabled={saving}>
              {saving ? 'Saving…' : 'Submit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
