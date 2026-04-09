import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './AdminStudentProfileViewPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
}

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TYPE_LABELS = {
  past_activity: 'Past activity',
  award: 'Award',
  leadership: 'Leadership',
};

const TABS = [
  { id: 'personal', label: 'Personal Information' },
  { id: 'academic', label: 'Academic History' },
  { id: 'nonacademic', label: 'Non-Academic Activities' },
  { id: 'violations', label: 'Violations' },
  { id: 'skills', label: 'Skills' },
  { id: 'affiliations', label: 'Affiliations' },
];

const ACADEMIC_STANDING_OPTIONS = ['Regular', 'Irregular', 'Probationary', 'On hold'];
const ROLE_OPTIONS = ['STUDENT', 'OFFICER'];

function ProfileAvatar({ name, photoUrl }) {
  const [broken, setBroken] = useState(false);
  if (photoUrl && !broken) {
    return <img src={photoUrl} alt="" className="aspv-avatar-img" onError={() => setBroken(true)} />;
  }
  return <div className="aspv-avatar-fallback" aria-hidden>{initialsFromName(name)}</div>;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

function toDateInputValue(iso) {
  if (!iso) return '';
  const s = String(iso);
  if (s.length >= 10) return s.slice(0, 10);
  return '';
}

function normalizeGpaRows(raw) {
  if (!raw || !Array.isArray(raw)) return [];
  return raw.map((row, i) => {
    if (typeof row === 'object' && row !== null) {
      return {
        key: `g-${i}-${row.semester || row.term || i}`,
        semester: String(row.semester ?? row.term ?? `Term ${i + 1}`),
        gpa: row.gpa != null ? String(row.gpa) : '',
      };
    }
    return { key: `g-${i}`, semester: `Term ${i + 1}`, gpa: String(row) };
  });
}

function tagsToString(arr) {
  if (!Array.isArray(arr)) return '';
  return arr.filter(Boolean).join(', ');
}

function buildDraftFromData(data) {
  const prof = data?.student_profile || {};
  return {
    user: {
      name: data?.name ?? '',
      email: data?.email ?? '',
      student_number: data?.student_number ?? '',
      contact_number: data?.contact_number ?? '',
      role: data?.role ?? 'STUDENT',
    },
    profile: {
      photo_url: prof.photo_url ?? '',
      height_cm: prof.height_cm != null ? String(prof.height_cm) : '',
      weight_kg: prof.weight_kg != null ? String(prof.weight_kg) : '',
      dominant_hand: prof.dominant_hand ?? '',
      preferred_position: prof.preferred_position ?? '',
      notes: prof.notes ?? '',
      course: prof.course ?? '',
      year_level: prof.year_level ?? '',
      section: prof.section ?? '',
      academic_semester: prof.academic_semester != null ? String(prof.academic_semester) : '1',
      current_gpa: prof.current_gpa != null ? String(prof.current_gpa) : '',
      academic_standing: prof.academic_standing ?? 'Regular',
      failed_units: prof.failed_units != null ? String(prof.failed_units) : '',
      incomplete_grades: prof.incomplete_grades != null ? String(prof.incomplete_grades) : '',
      enrolled_units: prof.enrolled_units != null ? String(prof.enrolled_units) : '',
      skills: prof.skills ?? '',
      membership_card_availed_at: toDateInputValue(prof.membership_card_availed_at),
    },
    sports_interests_str: tagsToString(prof.sports_interests),
    activity_interests_str: tagsToString(prof.activity_interests),
    gpaRows: normalizeGpaRows(prof.gpa_per_semester),
    nonAcademic: (data?.non_academic_entries || []).map((e) => ({
      id: e.id,
      type: e.type || 'past_activity',
      title: e.title || '',
      description: e.description || '',
    })),
    conduct: (data?.conduct_entries || []).map((c) => ({
      id: c.id,
      type: c.type || 'violation',
      severity: c.severity || 'Minor',
      title: c.title || '',
      description: c.description || '',
      recorded_at: toDateInputValue(c.recorded_at),
    })),
    skillsList: (data?.skill_entries || []).map((s) => ({
      id: s.id,
      skill: s.skill || '',
      proficiency_level: s.proficiency_level || '',
      portfolio_url: s.portfolio_url || '',
      github_url: s.github_url || '',
    })),
    interests: (data?.interest_declarations || []).map((i) => ({
      id: i.id,
      activity_id: i.activity_id,
      note: i.note || '',
    })),
  };
}

function DlRow({ label, children }) {
  return (
    <div className="aspv-dl-row">
      <div className="aspv-field-label">{label}</div>
      <div className="aspv-field-value">{children ?? '—'}</div>
    </div>
  );
}

/** Centered modal with orange-themed actions (Save / Cancel edit confirmations). */
function AspvConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  confirmClassName = 'aspv-dialog-btn--primary',
  dialogId = 'aspv-dialog',
}) {
  if (!open) return null;
  const titleId = `${dialogId}-title`;
  const descId = `${dialogId}-desc`;
  return (
    <div className="aspv-dialog-overlay" role="presentation" onClick={onCancel}>
      <div
        className="aspv-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 id={titleId} className="aspv-dialog-title">
          {title}
        </h3>
        <p id={descId} className="aspv-dialog-message">
          {message}
        </p>
        <div className="aspv-dialog-actions">
          <button type="button" className="aspv-dialog-btn aspv-dialog-btn--secondary" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={`aspv-dialog-btn ${confirmClassName}`} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminStudentProfileViewPage() {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('personal');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(null);
  const [removed, setRemoved] = useState({
    nonAcademic: [],
    conduct: [],
    skills: [],
    interests: [],
  });
  const [saving, setSaving] = useState(false);
  const [saveConfirmOpen, setSaveConfirmOpen] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [activities, setActivities] = useState([]);

  const user = useMemo(() => JSON.parse(localStorage.getItem('ccs_user') || '{}'), []);
  const canStaffProfile = user?.role === 'ADMIN' || user?.role === 'OFFICER';

  const load = useCallback(async () => {
    if (!studentId) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/full-profile`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (!json.success) {
        setError(json.message || 'Could not load profile');
        setData(null);
        return;
      }
      setData(json.data);
    } catch {
      setError('Request failed');
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [studentId]);

  const fetchActivities = useCallback(async () => {
    try {
      const res = await fetch('/api/activities', { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) setActivities(json.data);
      else setActivities([]);
    } catch {
      setActivities([]);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (canStaffProfile && editMode) fetchActivities();
  }, [canStaffProfile, editMode, fetchActivities]);

  useEffect(() => {
    if (!showSuccessToast) return undefined;
    const t = setTimeout(() => setShowSuccessToast(false), 3200);
    return () => clearTimeout(t);
  }, [showSuccessToast]);

  useEffect(() => {
    if (!saveConfirmOpen && !cancelConfirmOpen) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (saveConfirmOpen) setSaveConfirmOpen(false);
        else setCancelConfirmOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [saveConfirmOpen, cancelConfirmOpen]);

  const prof = data?.student_profile;
  const na = data?.non_academic_entries || [];
  const sk = data?.skill_entries || [];
  const cd = data?.conduct_entries || [];
  const enr = data?.enrollments || [];
  const intr = data?.interest_declarations || [];

  const goBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/admin-dashboard/profiling/class-lists');
  };

  const enterEdit = () => {
    if (!data) return;
    setDraft(buildDraftFromData(data));
    setRemoved({ nonAcademic: [], conduct: [], skills: [], interests: [] });
    setEditMode(true);
    setError('');
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditMode(false);
    setRemoved({ nonAcademic: [], conduct: [], skills: [], interests: [] });
    setError('');
    setSaveConfirmOpen(false);
    setCancelConfirmOpen(false);
  };

  const updateDraft = (path, value) => {
    setDraft((d) => {
      if (!d) return d;
      const next = { ...d };
      if (path.length === 2) next[path[0]] = { ...next[path[0]], [path[1]]: value };
      return next;
    });
  };

  const executeSave = async () => {
    if (!draft || !studentId) return;
    setSaving(true);
    setError('');
    const id = Number(studentId);
    const headers = getAuthHeaders();

    const fail = (msg) => {
      setError(msg);
      setSaving(false);
    };

    try {
      const gpaPayload = draft.gpaRows
        .filter((r) => r.semester.trim() && r.gpa.trim() !== '')
        .map((r) => ({ semester: r.semester.trim(), gpa: parseFloat(r.gpa) }));

      const profileBody = {
        course: draft.profile.course.trim() || null,
        year_level: draft.profile.year_level.trim() || null,
        section: draft.profile.section.trim() || null,
        academic_semester: draft.profile.academic_semester === '' ? null : parseInt(draft.profile.academic_semester, 10),
        current_gpa: draft.profile.current_gpa === '' ? null : parseFloat(draft.profile.current_gpa),
        academic_standing: draft.profile.academic_standing || null,
        failed_units: draft.profile.failed_units === '' ? null : parseInt(draft.profile.failed_units, 10),
        incomplete_grades: draft.profile.incomplete_grades === '' ? null : parseInt(draft.profile.incomplete_grades, 10),
        enrolled_units: draft.profile.enrolled_units === '' ? null : parseInt(draft.profile.enrolled_units, 10),
        gpa_per_semester: gpaPayload,
        membership_card_availed_at: draft.profile.membership_card_availed_at || null,
      };

      const profRes = await fetch(`/api/students/${id}/profile`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(profileBody),
      });
      const profJson = await profRes.json();
      if (!profJson.success) {
        fail(profJson.message || 'Could not save profile');
        return;
      }

      for (const rid of removed.nonAcademic) {
        const r = await fetch(`/api/non-academic-entries/${rid}`, { method: 'DELETE', headers });
        const j = await r.json();
        if (!j.success) {
          fail(j.message || 'Could not delete a non-academic entry');
          return;
        }
      }

      for (const rid of removed.conduct) {
        const r = await fetch(`/api/conduct-entries/${rid}`, { method: 'DELETE', headers });
        const j = await r.json();
        if (!j.success) {
          fail(j.message || 'Could not delete a conduct record');
          return;
        }
      }

      for (const rid of removed.skills) {
        const r = await fetch(`/api/skill-entries/${rid}`, { method: 'DELETE', headers });
        const j = await r.json();
        if (!j.success) {
          fail(j.message || 'Could not delete a skill');
          return;
        }
      }

      for (const row of draft.nonAcademic) {
        if (row.id != null && removed.nonAcademic.includes(row.id)) continue;
        if (row.id != null) {
          const r = await fetch(`/api/non-academic-entries/${row.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              type: row.type,
              title: row.title.trim(),
              description: row.description.trim() || null,
            }),
          });
          const j = await r.json();
          if (!j.success) {
            fail(j.message || 'Could not update non-academic entry');
            return;
          }
        } else {
          const r = await fetch('/api/non-academic-entries', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: id,
              type: row.type,
              title: row.title.trim(),
              description: row.description.trim() || null,
            }),
          });
          const j = await r.json();
          if (!j.success) {
            fail(j.message || 'Could not add non-academic entry');
            return;
          }
        }
      }

      for (const row of draft.conduct) {
        if (row.id != null && removed.conduct.includes(row.id)) continue;
        if (row.id != null) {
          const conductBody = {
            type: row.type,
            title: row.title.trim(),
            description: row.description.trim() || null,
            recorded_at: row.recorded_at || new Date().toISOString().slice(0, 10),
          };
          if (row.type === 'violation') conductBody.severity = row.severity;
          else conductBody.severity = null;
          const r = await fetch(`/api/conduct-entries/${row.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify(conductBody),
          });
          const j = await r.json();
          if (!j.success) {
            fail(j.message || 'Could not update conduct record');
            return;
          }
        } else {
          const r = await fetch('/api/conduct-entries', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: id,
              type: row.type,
              severity: row.type === 'violation' ? row.severity : null,
              title: row.title.trim(),
              description: row.description.trim() || null,
              recorded_at: row.recorded_at || new Date().toISOString().slice(0, 10),
            }),
          });
          const j = await r.json();
          if (!j.success) {
            fail(j.message || 'Could not add conduct record');
            return;
          }
        }
      }

      for (const row of draft.skillsList) {
        if (row.id != null && removed.skills.includes(row.id)) continue;
        if (row.id != null) {
          const r = await fetch(`/api/skill-entries/${row.id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({
              skill: row.skill.trim(),
              proficiency_level: row.proficiency_level.trim() || null,
              portfolio_url: row.portfolio_url.trim() || null,
              github_url: row.github_url.trim() || null,
            }),
          });
          const j = await r.json();
          if (!j.success) {
            fail(j.message || 'Could not update skill');
            return;
          }
        } else if (row.skill.trim()) {
          const r = await fetch('/api/skill-entries', {
            method: 'POST',
            headers,
            body: JSON.stringify({
              user_id: id,
              skill: row.skill.trim(),
              proficiency_level: row.proficiency_level.trim() || null,
              portfolio_url: row.portfolio_url.trim() || null,
              github_url: row.github_url.trim() || null,
            }),
          });
          const j = await r.json();
          if (!j.success) {
            fail(j.message || 'Could not add skill');
            return;
          }
        }
      }

      setEditMode(false);
      setDraft(null);
      setRemoved({ nonAcademic: [], conduct: [], skills: [], interests: [] });
      await load();
      setShowSuccessToast(true);
    } catch {
      fail('Request failed while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveClick = () => {
    if (!draft || saving) return;
    setSaveConfirmOpen(true);
  };

  const handleConfirmSave = async () => {
    setSaveConfirmOpen(false);
    await executeSave();
  };

  const handleCancelEditClick = () => {
    if (saving) return;
    setCancelConfirmOpen(true);
  };

  const handleConfirmDiscard = () => {
    setCancelConfirmOpen(false);
    cancelEdit();
  };

  const gpaSemesterRows = useMemo(() => {
    const raw = prof?.gpa_per_semester;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return [];
  }, [prof?.gpa_per_semester]);

  const interestActivityOptions = useMemo(
    () => activities.filter((a) => a.is_active !== false),
    [activities]
  );

  const renderPersonal = () => {
    if (editMode && draft && canStaffProfile) {
      return (
        <section className="aspv-section" aria-labelledby="aspv-personal-heading">
          <h2 id="aspv-personal-heading" className="aspv-section-title">
            Personal Information
          </h2>
          <p className="aspv-hint aspv-hint--readonly">
            View only. Name, email, student number, contact, photo, physical details, and notes are maintained by the student (or official records), not by administrators.
          </p>
          <div className="aspv-fields">
            <DlRow label="Full name">{data.name}</DlRow>
            <DlRow label="Email">{data.email}</DlRow>
            <DlRow label="Student number">{data.student_number}</DlRow>
            <DlRow label="Contact number">{data.contact_number}</DlRow>
            <DlRow label="Role">{data.role}</DlRow>
            <DlRow label="Height (cm)">{prof?.height_cm != null ? `${prof.height_cm}` : null}</DlRow>
            <DlRow label="Weight (kg)">{prof?.weight_kg != null ? `${prof.weight_kg}` : null}</DlRow>
            <DlRow label="Dominant hand">{prof?.dominant_hand}</DlRow>
            <DlRow label="Preferred position">{prof?.preferred_position}</DlRow>
            <DlRow label="Notes">{prof?.notes}</DlRow>
          </div>
        </section>
      );
    }
    if (editMode && draft) {
      return (
        <section className="aspv-section" aria-labelledby="aspv-personal-heading">
          <h2 id="aspv-personal-heading" className="aspv-section-title">
            Personal Information
          </h2>
          <div className="aspv-form-grid">
            <label className="aspv-field">
              <span className="aspv-field-label">Full name</span>
              <input
                className="aspv-input"
                value={draft.user.name}
                onChange={(e) => updateDraft(['user', 'name'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Email</span>
              <input
                type="email"
                className="aspv-input"
                value={draft.user.email}
                onChange={(e) => updateDraft(['user', 'email'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Student number</span>
              <input
                className="aspv-input"
                value={draft.user.student_number}
                onChange={(e) => updateDraft(['user', 'student_number'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Contact number</span>
              <input
                className="aspv-input"
                value={draft.user.contact_number}
                onChange={(e) => updateDraft(['user', 'contact_number'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Role</span>
              <select
                className="aspv-select"
                value={draft.user.role}
                onChange={(e) => updateDraft(['user', 'role'], e.target.value)}
              >
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </label>
            <label className="aspv-field aspv-field--full">
              <span className="aspv-field-label">Photo URL</span>
              <input
                className="aspv-input"
                value={draft.profile.photo_url}
                onChange={(e) => updateDraft(['profile', 'photo_url'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Height (cm)</span>
              <input
                className="aspv-input"
                value={draft.profile.height_cm}
                onChange={(e) => updateDraft(['profile', 'height_cm'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Weight (kg)</span>
              <input
                className="aspv-input"
                value={draft.profile.weight_kg}
                onChange={(e) => updateDraft(['profile', 'weight_kg'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Dominant hand</span>
              <input
                className="aspv-input"
                value={draft.profile.dominant_hand}
                onChange={(e) => updateDraft(['profile', 'dominant_hand'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Preferred position</span>
              <input
                className="aspv-input"
                value={draft.profile.preferred_position}
                onChange={(e) => updateDraft(['profile', 'preferred_position'], e.target.value)}
              />
            </label>
            <label className="aspv-field aspv-field--full">
              <span className="aspv-field-label">Notes</span>
              <textarea
                className="aspv-textarea"
                rows={3}
                value={draft.profile.notes}
                onChange={(e) => updateDraft(['profile', 'notes'], e.target.value)}
              />
            </label>
          </div>
        </section>
      );
    }
    return (
      <section className="aspv-section" aria-labelledby="aspv-personal-heading">
        <h2 id="aspv-personal-heading" className="aspv-section-title">
          Personal Information
        </h2>
        <div className="aspv-fields">
          <DlRow label="Full name">{data.name}</DlRow>
          <DlRow label="Email">{data.email}</DlRow>
          <DlRow label="Student number">{data.student_number}</DlRow>
          <DlRow label="Contact number">{data.contact_number}</DlRow>
          <DlRow label="Role">{data.role}</DlRow>
          <DlRow label="Height (cm)">{prof?.height_cm != null ? `${prof.height_cm}` : null}</DlRow>
          <DlRow label="Weight (kg)">{prof?.weight_kg != null ? `${prof.weight_kg}` : null}</DlRow>
          <DlRow label="Dominant hand">{prof?.dominant_hand}</DlRow>
          <DlRow label="Preferred position">{prof?.preferred_position}</DlRow>
          <DlRow label="Notes">{prof?.notes}</DlRow>
        </div>
      </section>
    );
  };

  const renderAcademic = () => {
    if (editMode && draft) {
      return (
        <section className="aspv-section" aria-labelledby="aspv-academic-heading">
          <h2 id="aspv-academic-heading" className="aspv-section-title">
            Academic History
          </h2>
          <div className="aspv-form-grid">
            <label className="aspv-field">
              <span className="aspv-field-label">Program / course</span>
              <input
                className="aspv-input"
                value={draft.profile.course}
                onChange={(e) => updateDraft(['profile', 'course'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Year level</span>
              <input
                className="aspv-input"
                value={draft.profile.year_level}
                onChange={(e) => updateDraft(['profile', 'year_level'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Section</span>
              <input
                className="aspv-input"
                value={draft.profile.section}
                onChange={(e) => updateDraft(['profile', 'section'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Academic semester</span>
              <select
                className="aspv-select"
                value={draft.profile.academic_semester}
                onChange={(e) => updateDraft(['profile', 'academic_semester'], e.target.value)}
              >
                <option value="1">1st semester</option>
                <option value="2">2nd semester</option>
              </select>
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Current GPA</span>
              <input
                className="aspv-input"
                type="number"
                step="0.01"
                min="0"
                max="5"
                value={draft.profile.current_gpa}
                onChange={(e) => updateDraft(['profile', 'current_gpa'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Academic standing</span>
              <select
                className="aspv-select"
                value={draft.profile.academic_standing}
                onChange={(e) => updateDraft(['profile', 'academic_standing'], e.target.value)}
              >
                {ACADEMIC_STANDING_OPTIONS.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Failed units</span>
              <input
                className="aspv-input"
                type="number"
                min="0"
                value={draft.profile.failed_units}
                onChange={(e) => updateDraft(['profile', 'failed_units'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Incomplete grades</span>
              <input
                className="aspv-input"
                type="number"
                min="0"
                value={draft.profile.incomplete_grades}
                onChange={(e) => updateDraft(['profile', 'incomplete_grades'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Enrolled units</span>
              <input
                className="aspv-input"
                type="number"
                min="0"
                value={draft.profile.enrolled_units}
                onChange={(e) => updateDraft(['profile', 'enrolled_units'], e.target.value)}
              />
            </label>
            <label className="aspv-field">
              <span className="aspv-field-label">Membership card availed</span>
              <input
                type="date"
                className="aspv-input"
                value={draft.profile.membership_card_availed_at}
                onChange={(e) => updateDraft(['profile', 'membership_card_availed_at'], e.target.value)}
              />
            </label>
          </div>
          <div className="aspv-subblock">
            <h3 className="aspv-subblock-title">GPA by term</h3>
            <ul className="aspv-edit-list">
              {draft.gpaRows.map((row, idx) => (
                <li key={row.key} className="aspv-edit-row">
                  <input
                    className="aspv-input aspv-input--inline"
                    placeholder="Semester label"
                    value={row.semester}
                    onChange={(e) => {
                      const next = [...draft.gpaRows];
                      next[idx] = { ...next[idx], semester: e.target.value };
                      setDraft((d) => (d ? { ...d, gpaRows: next } : d));
                    }}
                  />
                  <input
                    className="aspv-input aspv-input--inline"
                    type="number"
                    step="0.01"
                    placeholder="GPA"
                    value={row.gpa}
                    onChange={(e) => {
                      const next = [...draft.gpaRows];
                      next[idx] = { ...next[idx], gpa: e.target.value };
                      setDraft((d) => (d ? { ...d, gpaRows: next } : d));
                    }}
                  />
                  <button
                    type="button"
                    className="aspv-btn aspv-btn--danger aspv-btn--small"
                    onClick={() => {
                      setDraft((d) =>
                        d ? { ...d, gpaRows: d.gpaRows.filter((_, i) => i !== idx) } : d
                      );
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="aspv-btn aspv-btn--ghost aspv-btn--small"
              onClick={() => {
                setDraft((d) =>
                  d
                    ? {
                        ...d,
                        gpaRows: [
                          ...d.gpaRows,
                          { key: `g-new-${Date.now()}`, semester: '', gpa: '' },
                        ],
                      }
                    : d
                );
              }}
            >
              + Add term
            </button>
          </div>
        </section>
      );
    }
    return (
      <section className="aspv-section" aria-labelledby="aspv-academic-heading">
        <h2 id="aspv-academic-heading" className="aspv-section-title">
          Academic History
        </h2>
        <div className="aspv-fields">
          <DlRow label="Program / course">{prof?.course}</DlRow>
          <DlRow label="Year level">{prof?.year_level}</DlRow>
          <DlRow label="Section">{prof?.section}</DlRow>
          <DlRow label="Academic semester">
            {prof?.academic_semester != null
              ? prof.academic_semester === 1
                ? '1st semester'
                : prof.academic_semester === 2
                  ? '2nd semester'
                  : String(prof.academic_semester)
              : null}
          </DlRow>
          <DlRow label="Current GPA">
            {prof?.current_gpa != null ? Number(prof.current_gpa).toFixed(2) : null}
          </DlRow>
          <DlRow label="Academic standing">{prof?.academic_standing}</DlRow>
          <DlRow label="Failed units">{prof?.failed_units != null ? String(prof.failed_units) : null}</DlRow>
          <DlRow label="Incomplete grades">{prof?.incomplete_grades != null ? String(prof.incomplete_grades) : null}</DlRow>
          <DlRow label="Enrolled units">{prof?.enrolled_units != null ? String(prof.enrolled_units) : null}</DlRow>
          <DlRow label="Membership card">{formatDate(prof?.membership_card_availed_at)}</DlRow>
        </div>
        {gpaSemesterRows.length > 0 && (
          <div className="aspv-subblock">
            <h3 className="aspv-subblock-title">GPA by term</h3>
            <ul className="aspv-card-list">
              {gpaSemesterRows.map((row, i) => (
                <li key={i} className="aspv-card aspv-card--compact">
                  {typeof row === 'object' && row !== null ? (
                    <>
                      <strong>{row.semester ?? row.term ?? `Term ${i + 1}`}</strong>
                      {row.gpa != null && <span className="aspv-muted"> — GPA {row.gpa}</span>}
                    </>
                  ) : (
                    String(row)
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="aspv-page">
      <AspvConfirmDialog
        dialogId="aspv-save-confirm"
        open={saveConfirmOpen}
        title="Save changes?"
        message="Are you sure you want to save the changes?"
        confirmLabel="Confirm"
        cancelLabel="Cancel"
        onConfirm={handleConfirmSave}
        onCancel={() => !saving && setSaveConfirmOpen(false)}
        confirmClassName="aspv-dialog-btn--primary"
      />
      <AspvConfirmDialog
        dialogId="aspv-cancel-confirm"
        open={cancelConfirmOpen}
        title="Discard changes?"
        message="Are you sure you want to cancel? Any unsaved changes will be lost."
        confirmLabel="Yes"
        cancelLabel="No"
        onConfirm={handleConfirmDiscard}
        onCancel={() => setCancelConfirmOpen(false)}
        confirmClassName="aspv-dialog-btn--warning"
      />
      {showSuccessToast && (
        <div className="aspv-toast" role="status" aria-live="polite">
          <span className="aspv-toast-text">Changes saved successfully!</span>
        </div>
      )}

      <div className="aspv-toolbar">
        <button type="button" className="aspv-btn aspv-btn--ghost" onClick={goBack}>
          ← Back
        </button>
        <div className="aspv-toolbar-actions">
          {canStaffProfile && !editMode && (
            <button type="button" className="aspv-btn aspv-btn--primary" onClick={enterEdit}>
              Edit
            </button>
          )}
          {canStaffProfile && editMode && (
            <>
              <button type="button" className="aspv-btn aspv-btn--ghost" onClick={handleCancelEditClick} disabled={saving}>
                Cancel
              </button>
              <button type="button" className="aspv-btn aspv-btn--primary" onClick={handleSaveClick} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {loading && <p className="aspv-muted aspv-center">Loading profile…</p>}
      {!loading && error && (
        <div className="aspv-error" role="alert">
          {error}
        </div>
      )}

      {!loading && data && (
        <>
          <header className="aspv-header">
            <ProfileAvatar
              name={editMode && draft ? draft.user.name : data.name}
              photoUrl={
                editMode && draft ? draft.profile.photo_url || data.avatar_url : prof?.photo_url || data.avatar_url
              }
            />
            <div className="aspv-header-text">
              <h1 className="aspv-title">{editMode && draft ? draft.user.name || '—' : data.name}</h1>
              <p className="aspv-sub">{editMode && draft ? draft.user.email : data.email}</p>
              <p className="aspv-sub">
                #{editMode && draft ? draft.user.student_number || '—' : data.student_number || '—'}
                {(editMode && draft ? draft.user.role : data.role) ? ` · ${editMode && draft ? draft.user.role : data.role}` : ''}
                {(editMode && draft ? draft.profile.course : prof?.course) ? ` · ${editMode && draft ? draft.profile.course : prof.course}` : ''}
              </p>
            </div>
          </header>

          <div className="aspv-tabs" role="tablist" aria-label="Profile sections">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                role="tab"
                aria-selected={activeTab === t.id}
                className={`aspv-tab ${activeTab === t.id ? 'aspv-tab--active' : ''}`}
                onClick={() => setActiveTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="aspv-panel" role="tabpanel">
            {activeTab === 'personal' && renderPersonal()}

            {activeTab === 'academic' && renderAcademic()}

            {activeTab === 'nonacademic' && (
              <section className="aspv-section" aria-labelledby="aspv-na-heading">
                <h2 id="aspv-na-heading" className="aspv-section-title">
                  Non-Academic Activities
                </h2>
                {editMode && draft ? (
                  <>
                    <ul className="aspv-edit-cards">
                      {draft.nonAcademic.map((row, idx) =>
                        removed.nonAcademic.includes(row.id) ? null : (
                          <li key={row.id || `new-na-${idx}`} className="aspv-edit-card">
                            <div className="aspv-edit-card-actions">
                              <button
                                type="button"
                                className="aspv-btn aspv-btn--danger aspv-btn--small"
                                onClick={() => {
                                  if (row.id) {
                                    setRemoved((r) => ({ ...r, nonAcademic: [...r.nonAcademic, row.id] }));
                                  } else {
                                    setDraft((d) =>
                                      d ? { ...d, nonAcademic: d.nonAcademic.filter((_, i) => i !== idx) } : d
                                    );
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <label className="aspv-field">
                              <span className="aspv-field-label">Type</span>
                              <select
                                className="aspv-select"
                                value={row.type}
                                onChange={(e) => {
                                  const next = [...draft.nonAcademic];
                                  next[idx] = { ...next[idx], type: e.target.value };
                                  setDraft((d) => (d ? { ...d, nonAcademic: next } : d));
                                }}
                              >
                                <option value="past_activity">Past activity</option>
                                <option value="award">Award</option>
                                <option value="leadership">Leadership</option>
                              </select>
                            </label>
                            <label className="aspv-field">
                              <span className="aspv-field-label">Title</span>
                              <input
                                className="aspv-input"
                                value={row.title}
                                onChange={(e) => {
                                  const next = [...draft.nonAcademic];
                                  next[idx] = { ...next[idx], title: e.target.value };
                                  setDraft((d) => (d ? { ...d, nonAcademic: next } : d));
                                }}
                              />
                            </label>
                            <label className="aspv-field aspv-field--full">
                              <span className="aspv-field-label">Description</span>
                              <textarea
                                className="aspv-textarea"
                                rows={2}
                                value={row.description}
                                onChange={(e) => {
                                  const next = [...draft.nonAcademic];
                                  next[idx] = { ...next[idx], description: e.target.value };
                                  setDraft((d) => (d ? { ...d, nonAcademic: next } : d));
                                }}
                              />
                            </label>
                          </li>
                        )
                      )}
                    </ul>
                    <button
                      type="button"
                      className="aspv-btn aspv-btn--ghost"
                      onClick={() => {
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                nonAcademic: [
                                  ...d.nonAcademic,
                                  { id: null, type: 'past_activity', title: '', description: '' },
                                ],
                              }
                            : d
                        );
                      }}
                    >
                      + Add entry
                    </button>
                  </>
                ) : na.length === 0 ? (
                  <p className="aspv-muted">No non-academic entries on record.</p>
                ) : (
                  <ul className="aspv-card-list">
                    {na.map((e) => (
                      <li key={e.id} className="aspv-card">
                        <div className="aspv-card-head">
                          <span className={`aspv-badge aspv-badge--${e.status || 'unknown'}`}>{e.status}</span>
                          <strong>{TYPE_LABELS[e.type] || e.type}</strong>
                        </div>
                        <p className="aspv-card-title">{e.title}</p>
                        {e.description && <p className="aspv-card-desc">{e.description}</p>}
                        <p className="aspv-card-meta">Submitted {formatDate(e.created_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {activeTab === 'violations' && (
              <section className="aspv-section" aria-labelledby="aspv-violations-heading">
                <h2 id="aspv-violations-heading" className="aspv-section-title">
                  Violations
                </h2>
                <p className="aspv-hint">Conduct records including violations and related notes.</p>
                {editMode && draft ? (
                  <>
                    <ul className="aspv-edit-cards">
                      {draft.conduct.map((row, idx) =>
                        removed.conduct.includes(row.id) ? null : (
                          <li key={row.id || `new-cd-${idx}`} className="aspv-edit-card">
                            <div className="aspv-edit-card-actions">
                              <button
                                type="button"
                                className="aspv-btn aspv-btn--danger aspv-btn--small"
                                onClick={() => {
                                  if (row.id) {
                                    setRemoved((r) => ({ ...r, conduct: [...r.conduct, row.id] }));
                                  } else {
                                    setDraft((d) =>
                                      d ? { ...d, conduct: d.conduct.filter((_, i) => i !== idx) } : d
                                    );
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <label className="aspv-field">
                              <span className="aspv-field-label">Type</span>
                              <select
                                className="aspv-select"
                                value={row.type}
                                onChange={(e) => {
                                  const next = [...draft.conduct];
                                  next[idx] = { ...next[idx], type: e.target.value };
                                  setDraft((d) => (d ? { ...d, conduct: next } : d));
                                }}
                              >
                                <option value="violation">Violation</option>
                                <option value="commendation">Commendation</option>
                              </select>
                            </label>
                            {row.type === 'violation' && (
                              <label className="aspv-field">
                                <span className="aspv-field-label">Severity</span>
                                <select
                                  className="aspv-select"
                                  value={row.severity}
                                  onChange={(e) => {
                                    const next = [...draft.conduct];
                                    next[idx] = { ...next[idx], severity: e.target.value };
                                    setDraft((d) => (d ? { ...d, conduct: next } : d));
                                  }}
                                >
                                  <option value="Minor">Minor</option>
                                  <option value="Major">Major</option>
                                  <option value="Grave">Grave</option>
                                </select>
                              </label>
                            )}
                            <label className="aspv-field aspv-field--full">
                              <span className="aspv-field-label">Title</span>
                              <input
                                className="aspv-input"
                                value={row.title}
                                onChange={(e) => {
                                  const next = [...draft.conduct];
                                  next[idx] = { ...next[idx], title: e.target.value };
                                  setDraft((d) => (d ? { ...d, conduct: next } : d));
                                }}
                              />
                            </label>
                            <label className="aspv-field aspv-field--full">
                              <span className="aspv-field-label">Description</span>
                              <textarea
                                className="aspv-textarea"
                                rows={2}
                                value={row.description}
                                onChange={(e) => {
                                  const next = [...draft.conduct];
                                  next[idx] = { ...next[idx], description: e.target.value };
                                  setDraft((d) => (d ? { ...d, conduct: next } : d));
                                }}
                              />
                            </label>
                            <label className="aspv-field">
                              <span className="aspv-field-label">Date recorded</span>
                              <input
                                type="date"
                                className="aspv-input"
                                value={row.recorded_at}
                                onChange={(e) => {
                                  const next = [...draft.conduct];
                                  next[idx] = { ...next[idx], recorded_at: e.target.value };
                                  setDraft((d) => (d ? { ...d, conduct: next } : d));
                                }}
                              />
                            </label>
                          </li>
                        )
                      )}
                    </ul>
                    <button
                      type="button"
                      className="aspv-btn aspv-btn--ghost"
                      onClick={() => {
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                conduct: [
                                  ...d.conduct,
                                  {
                                    id: null,
                                    type: 'violation',
                                    severity: 'Minor',
                                    title: '',
                                    description: '',
                                    recorded_at: new Date().toISOString().slice(0, 10),
                                  },
                                ],
                              }
                            : d
                        );
                      }}
                    >
                      + Add record
                    </button>
                  </>
                ) : cd.length === 0 ? (
                  <p className="aspv-muted">No conduct or violation records.</p>
                ) : (
                  <ul className="aspv-card-list">
                    {cd.map((c) => (
                      <li key={c.id} className="aspv-card">
                        <div className="aspv-card-head">
                          <span className="aspv-badge aspv-badge--conduct">{c.type}</span>
                          {c.severity && <span className="aspv-muted"> · {c.severity}</span>}
                        </div>
                        <p className="aspv-card-title">{c.title}</p>
                        {c.description && <p className="aspv-card-desc">{c.description}</p>}
                        <p className="aspv-card-meta">Recorded {formatDate(c.recorded_at)}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            {activeTab === 'skills' && (
              <section className="aspv-section" aria-labelledby="aspv-skills-heading">
                <h2 id="aspv-skills-heading" className="aspv-section-title">
                  Skills
                </h2>
                {editMode && draft ? (
                  <>
                    <label className="aspv-field aspv-field--full">
                      <span className="aspv-field-label">Summary (profile text)</span>
                      <textarea
                        className="aspv-textarea"
                        rows={3}
                        value={draft.profile.skills}
                        onChange={(e) => updateDraft(['profile', 'skills'], e.target.value)}
                      />
                    </label>
                    <h3 className="aspv-subblock-title">Structured skill entries</h3>
                    <ul className="aspv-edit-cards">
                      {draft.skillsList.map((row, idx) =>
                        removed.skills.includes(row.id) ? null : (
                          <li key={row.id || `new-sk-${idx}`} className="aspv-edit-card">
                            <div className="aspv-edit-card-actions">
                              <button
                                type="button"
                                className="aspv-btn aspv-btn--danger aspv-btn--small"
                                onClick={() => {
                                  if (row.id) {
                                    setRemoved((r) => ({ ...r, skills: [...r.skills, row.id] }));
                                  } else {
                                    setDraft((d) =>
                                      d ? { ...d, skillsList: d.skillsList.filter((_, i) => i !== idx) } : d
                                    );
                                  }
                                }}
                              >
                                Remove
                              </button>
                            </div>
                            <label className="aspv-field">
                              <span className="aspv-field-label">Skill</span>
                              <input
                                className="aspv-input"
                                value={row.skill}
                                onChange={(e) => {
                                  const next = [...draft.skillsList];
                                  next[idx] = { ...next[idx], skill: e.target.value };
                                  setDraft((d) => (d ? { ...d, skillsList: next } : d));
                                }}
                              />
                            </label>
                            <label className="aspv-field">
                              <span className="aspv-field-label">Proficiency</span>
                              <input
                                className="aspv-input"
                                value={row.proficiency_level}
                                onChange={(e) => {
                                  const next = [...draft.skillsList];
                                  next[idx] = { ...next[idx], proficiency_level: e.target.value };
                                  setDraft((d) => (d ? { ...d, skillsList: next } : d));
                                }}
                              />
                            </label>
                            <label className="aspv-field aspv-field--full">
                              <span className="aspv-field-label">Portfolio URL</span>
                              <input
                                className="aspv-input"
                                value={row.portfolio_url}
                                onChange={(e) => {
                                  const next = [...draft.skillsList];
                                  next[idx] = { ...next[idx], portfolio_url: e.target.value };
                                  setDraft((d) => (d ? { ...d, skillsList: next } : d));
                                }}
                              />
                            </label>
                            <label className="aspv-field aspv-field--full">
                              <span className="aspv-field-label">GitHub URL</span>
                              <input
                                className="aspv-input"
                                value={row.github_url}
                                onChange={(e) => {
                                  const next = [...draft.skillsList];
                                  next[idx] = { ...next[idx], github_url: e.target.value };
                                  setDraft((d) => (d ? { ...d, skillsList: next } : d));
                                }}
                              />
                            </label>
                          </li>
                        )
                      )}
                    </ul>
                    <button
                      type="button"
                      className="aspv-btn aspv-btn--ghost"
                      onClick={() => {
                        setDraft((d) =>
                          d
                            ? {
                                ...d,
                                skillsList: [
                                  ...d.skillsList,
                                  {
                                    id: null,
                                    skill: '',
                                    proficiency_level: '',
                                    portfolio_url: '',
                                    github_url: '',
                                  },
                                ],
                              }
                            : d
                        );
                      }}
                    >
                      + Add skill
                    </button>
                  </>
                ) : (
                  <>
                    {prof?.skills && String(prof.skills).trim() ? (
                      <div className="aspv-subblock">
                        <h3 className="aspv-subblock-title">Summary (profile)</h3>
                        <p className="aspv-free-text">{prof.skills}</p>
                      </div>
                    ) : null}
                    {sk.length === 0 && !(prof?.skills && String(prof.skills).trim()) ? (
                      <p className="aspv-muted">No structured skill entries.</p>
                    ) : sk.length > 0 ? (
                      <ul className="aspv-card-list">
                        {sk.map((s) => (
                          <li key={s.id} className="aspv-card aspv-card--compact">
                            <strong>{s.skill}</strong>
                            {s.proficiency_level && <span className="aspv-muted"> — {s.proficiency_level}</span>}
                            {(s.portfolio_url || s.github_url) && (
                              <p className="aspv-card-meta">
                                {s.portfolio_url && (
                                  <a href={s.portfolio_url} target="_blank" rel="noopener noreferrer">
                                    Portfolio
                                  </a>
                                )}
                                {s.portfolio_url && s.github_url && ' · '}
                                {s.github_url && (
                                  <a href={s.github_url} target="_blank" rel="noopener noreferrer">
                                    GitHub
                                  </a>
                                )}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </>
                )}
              </section>
            )}

            {activeTab === 'affiliations' && (
              <section className="aspv-section" aria-labelledby="aspv-aff-heading">
                <h2 id="aspv-aff-heading" className="aspv-section-title">
                  Affiliations
                </h2>
                <p className="aspv-hint">Activities, declared interests, and sports / org preferences.</p>
                {editMode && canStaffProfile ? (
                  <p className="aspv-hint aspv-hint--readonly">
                    Administrators cannot edit affiliation preferences or declared interests here; those are student-managed.
                  </p>
                ) : null}

                {editMode && draft && !canStaffProfile ? (
                  <>
                    <label className="aspv-field aspv-field--full">
                      <span className="aspv-field-label">Sports interests (comma-separated)</span>
                      <input
                        className="aspv-input"
                        value={draft.sports_interests_str}
                        onChange={(e) => setDraft((d) => (d ? { ...d, sports_interests_str: e.target.value } : d))}
                      />
                    </label>
                    <label className="aspv-field aspv-field--full">
                      <span className="aspv-field-label">Activity interests (comma-separated)</span>
                      <input
                        className="aspv-input"
                        value={draft.activity_interests_str}
                        onChange={(e) => setDraft((d) => (d ? { ...d, activity_interests_str: e.target.value } : d))}
                      />
                    </label>

                    <div className="aspv-subblock">
                      <h3 className="aspv-subblock-title">Declared interests</h3>
                      <ul className="aspv-edit-cards">
                        {draft.interests.map((row, idx) =>
                          removed.interests.includes(row.id) ? null : (
                            <li key={row.id || `new-int-${idx}`} className="aspv-edit-card">
                              <div className="aspv-edit-card-actions">
                                <button
                                  type="button"
                                  className="aspv-btn aspv-btn--danger aspv-btn--small"
                                  onClick={() => {
                                    if (row.id) {
                                      setRemoved((r) => ({ ...r, interests: [...r.interests, row.id] }));
                                    } else {
                                      setDraft((d) =>
                                        d ? { ...d, interests: d.interests.filter((_, i) => i !== idx) } : d
                                      );
                                    }
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                              {row.id ? (
                                <p className="aspv-muted">
                                  {intr.find((i) => i.id === row.id)?.activity?.name || `Activity #${row.activity_id}`}
                                </p>
                              ) : (
                                <label className="aspv-field aspv-field--full">
                                  <span className="aspv-field-label">Activity</span>
                                  <select
                                    className="aspv-select"
                                    value={row.activity_id === '' || row.activity_id == null ? '' : String(row.activity_id)}
                                    onChange={(e) => {
                                      const v = e.target.value;
                                      const next = [...draft.interests];
                                      next[idx] = {
                                        ...next[idx],
                                        activity_id: v === '' ? '' : parseInt(v, 10),
                                      };
                                      setDraft((d) => (d ? { ...d, interests: next } : d));
                                    }}
                                  >
                                    <option value="">Select activity…</option>
                                    {interestActivityOptions.map((a) => (
                                      <option key={a.id} value={a.id}>
                                        {a.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              )}
                              <label className="aspv-field aspv-field--full">
                                <span className="aspv-field-label">Note</span>
                                <input
                                  className="aspv-input"
                                  value={row.note}
                                  onChange={(e) => {
                                    const next = [...draft.interests];
                                    next[idx] = { ...next[idx], note: e.target.value };
                                    setDraft((d) => (d ? { ...d, interests: next } : d));
                                  }}
                                />
                              </label>
                            </li>
                          )
                        )}
                      </ul>
                      <button
                        type="button"
                        className="aspv-btn aspv-btn--ghost"
                        onClick={() => {
                          setDraft((d) =>
                            d
                              ? {
                                  ...d,
                                  interests: [...d.interests, { id: null, activity_id: '', note: '' }],
                                }
                              : d
                          );
                        }}
                      >
                        + Add declared interest
                      </button>
                    </div>

                    <div className="aspv-subblock">
                      <h3 className="aspv-subblock-title">Activity enrollments</h3>
                      <p className="aspv-muted">
                        Roster seats are managed from the student profiling dashboard (enrollment flow). Listed here for
                        reference only.
                      </p>
                      {enr.length === 0 ? (
                        <p className="aspv-muted">No enrollments.</p>
                      ) : (
                        <ul className="aspv-card-list">
                          {enr.map((e) => (
                            <li key={e.id} className="aspv-card aspv-card--compact">
                              <strong>{e.activity?.name || `Activity #${e.activity_id}`}</strong>
                              <span className="aspv-muted"> — {e.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                ) : (
                  <>
                    {(Array.isArray(prof?.sports_interests) && prof.sports_interests.length > 0) ||
                    (Array.isArray(prof?.activity_interests) && prof.activity_interests.length > 0) ? (
                      <div className="aspv-subblock">
                        <h3 className="aspv-subblock-title">Sports & activity interests (profile)</h3>
                        {Array.isArray(prof?.sports_interests) && prof.sports_interests.length > 0 && (
                          <div className="aspv-tag-group">
                            <span className="aspv-tag-label">Sports</span>
                            <div className="aspv-tags">
                              {prof.sports_interests.map((s, i) => (
                                <span key={`sp-${i}`} className="aspv-tag">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {Array.isArray(prof?.activity_interests) && prof.activity_interests.length > 0 && (
                          <div className="aspv-tag-group">
                            <span className="aspv-tag-label">Activities</span>
                            <div className="aspv-tags">
                              {prof.activity_interests.map((s, i) => (
                                <span key={`act-${i}`} className="aspv-tag">
                                  {s}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : null}

                    <div className="aspv-subblock">
                      <h3 className="aspv-subblock-title">Activity enrollments</h3>
                      {enr.length === 0 ? (
                        <p className="aspv-muted">No enrollments.</p>
                      ) : (
                        <ul className="aspv-card-list">
                          {enr.map((e) => (
                            <li key={e.id} className="aspv-card aspv-card--compact">
                              <strong>{e.activity?.name || `Activity #${e.activity_id}`}</strong>
                              <span className="aspv-muted"> — {e.status}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <div className="aspv-subblock">
                      <h3 className="aspv-subblock-title">Declared interests</h3>
                      {intr.length === 0 ? (
                        <p className="aspv-muted">No declared interests.</p>
                      ) : (
                        <ul className="aspv-card-list">
                          {intr.map((i) => (
                            <li key={i.id} className="aspv-card aspv-card--compact">
                              {i.activity?.name || `Activity #${i.activity_id}`}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </>
                )}
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
