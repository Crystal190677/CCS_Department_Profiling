import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import './MyProfilePage.css';

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

function MyProfileSectionHead({ icon, title, subtitle }) {
  return (
    <div className="my-profile-section-head">
      <div className="my-profile-section-icon" aria-hidden>
        {icon}
      </div>
      <div className="my-profile-section-titles">
        <h2 className="my-profile-section-title">{title}</h2>
        {subtitle ? <p className="my-profile-section-sub">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    height_cm: '',
    weight_kg: '',
    dominant_hand: '',
    preferred_position: '',
    sports_interests: '',
    activity_interests: '',
    skills: '',
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [nonAcademicEntries, setNonAcademicEntries] = useState([]);
  const [naForm, setNaForm] = useState({ type: 'past_activity', title: '', description: '' });
  const [naProofFile, setNaProofFile] = useState(null);
  const [naSubmitting, setNaSubmitting] = useState(false);
  const [naMessage, setNaMessage] = useState('');
  const [skillEntries, setSkillEntries] = useState([]);
  const [skillForm, setSkillForm] = useState({ skill: '', proficiency_level: 'Intermediate', portfolio_url: '', github_url: '' });
  const [skillSubmitting, setSkillSubmitting] = useState(false);
  const [skillMessage, setSkillMessage] = useState('');
  const [editingSkillId, setEditingSkillId] = useState(null);
  const [conductEntries, setConductEntries] = useState([]);
  const [conductLoading, setConductLoading] = useState(false);
  const [disputeModalEntry, setDisputeModalEntry] = useState(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeSubmitting, setDisputeSubmitting] = useState(false);
  const [disputeMessage, setDisputeMessage] = useState('');
  const [interestDeclarations, setInterestDeclarations] = useState([]);
  const [activitiesAvailable, setActivitiesAvailable] = useState([]);
  const [interestLoading, setInterestLoading] = useState(false);
  const [addInterestActivityId, setAddInterestActivityId] = useState('');
  const [addInterestNote, setAddInterestNote] = useState('');
  const [addInterestSubmitting, setAddInterestSubmitting] = useState(false);
  const [interestMessage, setInterestMessage] = useState('');
  const [confirmModal, setConfirmModal] = useState({ open: false, type: null, id: null, onConfirm: null });
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const [confirmingEnrollmentId, setConfirmingEnrollmentId] = useState(null);
  const [enrollmentNotice, setEnrollmentNotice] = useState('');

  const fetchProfile = useCallback(async () => {
    const res = await fetch('/api/student-profile', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.data) {
      setProfile(data.data);
      setForm({
        height_cm: data.data.height_cm ?? '',
        weight_kg: data.data.weight_kg ?? '',
        dominant_hand: data.data.dominant_hand ?? '',
        preferred_position: data.data.preferred_position ?? '',
        sports_interests: Array.isArray(data.data.sports_interests) ? data.data.sports_interests.join(', ') : (data.data.sports_interests || ''),
        activity_interests: Array.isArray(data.data.activity_interests) ? data.data.activity_interests.join(', ') : (data.data.activity_interests || ''),
        skills: data.data.skills || '',
        notes: data.data.notes || '',
      });
    }
  }, []);

  const fetchNonAcademicEntries = useCallback(async () => {
    const res = await fetch('/api/non-academic-entries', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.data?.data) setNonAcademicEntries(data.data.data);
    else if (data.success && Array.isArray(data.data)) setNonAcademicEntries(data.data);
  }, []);

  const fetchSkillEntries = useCallback(async () => {
    const res = await fetch('/api/skill-entries', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) setSkillEntries(data.data);
    else setSkillEntries([]);
  }, []);

  const fetchConductEntries = useCallback(async () => {
    setConductLoading(true);
    try {
      const res = await fetch('/api/conduct-entries', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data?.data) setConductEntries(data.data.data);
      else if (data.success && Array.isArray(data.data)) setConductEntries(data.data);
      else setConductEntries([]);
    } catch {
      setConductEntries([]);
    } finally {
      setConductLoading(false);
    }
  }, []);

  const fetchInterestDeclarations = useCallback(async () => {
    setInterestLoading(true);
    try {
      const res = await fetch('/api/interest-declarations', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && data.data?.data) setInterestDeclarations(data.data.data);
      else if (data.success && Array.isArray(data.data)) setInterestDeclarations(data.data);
      else setInterestDeclarations([]);
    } catch {
      setInterestDeclarations([]);
    } finally {
      setInterestLoading(false);
    }
  }, []);

  const fetchActivitiesAvailable = useCallback(async () => {
    const res = await fetch('/api/activities/available', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.data) setActivitiesAvailable(data.data);
    else setActivitiesAvailable([]);
  }, []);

  const fetchMyEnrollments = useCallback(async () => {
    setEnrollmentsLoading(true);
    try {
      const res = await fetch('/api/enrollments/mine', { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) setMyEnrollments(data.data);
      else setMyEnrollments([]);
    } catch {
      setMyEnrollments([]);
    } finally {
      setEnrollmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');
    if (!token || !userData) navigate('/login');
    else {
      const u = JSON.parse(userData);
      setUser(u);
      fetchProfile();
      if (u.role === 'STUDENT' || u.role === 'OFFICER') fetchNonAcademicEntries();
      if (u.role === 'STUDENT') {
        fetchSkillEntries();
        fetchConductEntries();
        fetchInterestDeclarations();
        fetchActivitiesAvailable();
        fetchMyEnrollments();
      }
    }
  }, [navigate, fetchProfile, fetchNonAcademicEntries, fetchSkillEntries, fetchConductEntries, fetchInterestDeclarations, fetchActivitiesAvailable, fetchMyEnrollments]);

  const enrollmentStatusLabel = (status) => {
    if (status === 'pending_confirmation') return 'Pending your confirmation';
    if (status === 'confirmed' || status === 'active') return 'Confirmed';
    if (status === 'waitlist') return 'Waitlist';
    return status || '—';
  };

  const handleConfirmEnrollment = async (enrollmentId) => {
    setEnrollmentNotice('');
    setConfirmingEnrollmentId(enrollmentId);
    try {
      const res = await fetch(`/api/enrollments/${enrollmentId}/confirm`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) {
        setEnrollmentNotice(data.message || 'Enrollment confirmed.');
        fetchMyEnrollments();
      } else {
        setEnrollmentNotice(data.message || 'Could not confirm enrollment.');
      }
    } catch {
      setEnrollmentNotice('Request failed. Try again.');
    } finally {
      setConfirmingEnrollmentId(null);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const payload = {
        height_cm: form.height_cm !== '' ? parseFloat(form.height_cm) : null,
        weight_kg: form.weight_kg !== '' ? parseFloat(form.weight_kg) : null,
        dominant_hand: form.dominant_hand?.trim() || null,
        preferred_position: form.preferred_position?.trim() || null,
        sports_interests: form.sports_interests ? form.sports_interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
        activity_interests: form.activity_interests ? form.activity_interests.split(',').map((s) => s.trim()).filter(Boolean) : [],
        skills: form.skills || null,
        notes: form.notes || null,
      };
      const res = await fetch('/api/student-profile', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setProfile(data.data);
        setMessage('Profile saved. You may now appear in activity filters based on your interests.');
      } else setMessage(data.message || 'Failed to save');
    } catch (err) {
      setMessage('Request failed');
    } finally {
      setSaving(false);
    }
  };

  const handleNonAcademicSubmit = async (e) => {
    e.preventDefault();
    if (!naForm.title.trim()) return;
    setNaSubmitting(true);
    setNaMessage('');
    try {
      const formData = new FormData();
      formData.append('type', naForm.type);
      formData.append('title', naForm.title.trim());
      if (naForm.description) formData.append('description', naForm.description);
      if (naProofFile) formData.append('proof', naProofFile);
      const token = localStorage.getItem('ccs_token');
      const res = await fetch('/api/non-academic-entries', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setNaForm({ type: 'past_activity', title: '', description: '' });
        setNaProofFile(null);
        fetchNonAcademicEntries();
        setNaMessage('Submitted for Admin approval.');
      } else setNaMessage(data.message || 'Submit failed');
    } catch (err) {
      setNaMessage('Request failed');
    } finally {
      setNaSubmitting(false);
    }
  };

  const canSubmitNonAcademic = user?.role === 'STUDENT' || user?.role === 'OFFICER';
  const typeLabels = { past_activity: 'Past activity', award: 'Award / recognition', leadership: 'Leadership role' };

  const handleDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!disputeModalEntry || !disputeReason.trim()) return;
    setDisputeSubmitting(true);
    setDisputeMessage('');
    try {
      const res = await fetch(`/api/conduct-entries/${disputeModalEntry.id}/dispute`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ reason: disputeReason.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setDisputeModalEntry(null);
        setDisputeReason('');
        fetchConductEntries();
      } else {
        setDisputeMessage(data.message || 'Failed to submit dispute');
      }
    } catch {
      setDisputeMessage('Request failed');
    } finally {
      setDisputeSubmitting(false);
    }
  };

  const disputeStatusLabels = {
    pending: 'Dispute pending',
    resolved_upheld: 'Dispute upheld (record stands)',
    resolved_revised: 'Dispute resolved (record revised)',
    dismissed: 'Dispute dismissed',
  };

  const handleSkillSubmit = async (e) => {
    e.preventDefault();
    if (!skillForm.skill.trim()) return;
    setSkillSubmitting(true);
    setSkillMessage('');
    try {
      const url = editingSkillId ? `/api/skill-entries/${editingSkillId}` : '/api/skill-entries';
      const method = editingSkillId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          skill: skillForm.skill.trim(),
          proficiency_level: skillForm.proficiency_level || null,
          portfolio_url: skillForm.portfolio_url.trim() || null,
          github_url: skillForm.github_url.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSkillForm({ skill: '', proficiency_level: 'Intermediate', portfolio_url: '', github_url: '' });
        setEditingSkillId(null);
        fetchSkillEntries();
        setSkillMessage(editingSkillId ? 'Skill updated.' : 'Skill added.');
      } else setSkillMessage(data.message || 'Failed');
    } catch (err) {
      setSkillMessage('Request failed');
    } finally {
      setSkillSubmitting(false);
    }
  };

  const handleDeleteSkill = (id) => {
    setConfirmModal({
      open: true,
      type: 'skill',
      id,
      title: 'Remove skill',
      message: 'Are you sure you want to remove this skill from your profile?',
      confirmLabel: 'Remove',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/skill-entries/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
          const data = await res.json();
          if (data.success) {
            fetchSkillEntries();
            setEditingSkillId(null);
            setConfirmModal((m) => ({ ...m, open: false }));
          }
        } catch (err) {}
        finally { setConfirmLoading(false); }
      },
    });
  };

  const canManageSkills = user?.role === 'STUDENT';

  const handleAddInterest = async (e) => {
    e.preventDefault();
    if (!addInterestActivityId) return;
    setAddInterestSubmitting(true);
    setInterestMessage('');
    try {
      const res = await fetch('/api/interest-declarations', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ activity_id: Number(addInterestActivityId), note: addInterestNote.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setAddInterestActivityId('');
        setAddInterestNote('');
        fetchInterestDeclarations();
      } else {
        setInterestMessage(data.message || 'Failed to add');
      }
    } catch {
      setInterestMessage('Request failed');
    } finally {
      setAddInterestSubmitting(false);
    }
  };

  const handleRetractInterest = (id) => {
    setConfirmModal({
      open: true,
      type: 'interest',
      id,
      title: 'Retract interest',
      message: 'Are you sure you want to retract your interest in this activity?',
      confirmLabel: 'Retract',
      onConfirm: async () => {
        setConfirmLoading(true);
        try {
          const res = await fetch(`/api/interest-declarations/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
          const data = await res.json();
          if (data.success) {
            fetchInterestDeclarations();
            setConfirmModal((m) => ({ ...m, open: false }));
          } else setInterestMessage(data.message || 'Failed to retract');
        } catch {
          setInterestMessage('Request failed');
        }
        finally { setConfirmLoading(false); }
      },
    });
  };

  const hasAcademic = Boolean(
    user &&
      profile &&
      (profile.current_gpa != null ||
        profile.academic_standing ||
        profile.course ||
        profile.year_level ||
        profile.academic_semester != null ||
        profile.section != null ||
        profile.failed_units != null ||
        profile.incomplete_grades != null ||
        profile.enrolled_units != null ||
        (Array.isArray(profile.gpa_per_semester) && profile.gpa_per_semester.length > 0)),
  );

  const academicStats = useMemo(() => {
    if (!profile) return [];
    const sem =
      profile.academic_semester === 2 ? '2nd semester' : profile.academic_semester === 1 ? '1st semester' : '—';
    return [
      { label: 'Course / program', value: profile.course || '—' },
      { label: 'Year level', value: profile.year_level || '—' },
      { label: 'Semester', value: sem },
      { label: 'Section', value: profile.section != null && profile.section !== '' ? String(profile.section) : '—' },
      { label: 'Current GPA', value: profile.current_gpa != null ? Number(profile.current_gpa).toFixed(2) : '—' },
      { label: 'Academic standing', value: profile.academic_standing || '—' },
      { label: 'Enrolled units', value: profile.enrolled_units ?? '—' },
      { label: 'Failed units', value: profile.failed_units ?? '—' },
      { label: 'Incomplete grades', value: profile.incomplete_grades ?? '—' },
    ];
  }, [profile]);

  if (!user) return null;

  return (
    <div className="my-profile-page">
      <ConfirmModal
        open={confirmModal.open}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmLabel={confirmModal.confirmLabel}
        cancelLabel="Cancel"
        loading={confirmLoading}
        onConfirm={() => typeof confirmModal.onConfirm === 'function' && confirmModal.onConfirm()}
        onCancel={() => setConfirmModal({ open: false, type: null, id: null, onConfirm: null })}
      />
      <header className="ccs-gradient-hero ccs-gradient-hero--compact my-profile-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner">
          <h1 className="ccs-gradient-hero-title">My Profile</h1>
          <p className="ccs-gradient-hero-subtitle">
            Your CCS One Dangal record — academic details from the registrar, plus interests and activities you control.
          </p>
        </div>
      </header>

      <nav className="my-profile-toc" aria-label="On this page">
        <span className="my-profile-toc-label">Jump to</span>
        <a href="#my-profile-identity">Identity</a>
        {hasAcademic ? <a href="#my-profile-academic">Academic record</a> : null}
        <a href="#my-profile-about">Interests &amp; skills</a>
        {canSubmitNonAcademic ? <a href="#my-profile-nonacademic">Non-academic</a> : null}
        {canManageSkills ? <a href="#my-profile-skills">Tagged skills</a> : null}
        {user?.role === 'STUDENT' ? <a href="#my-profile-interests">Activity interests</a> : null}
        {user?.role === 'STUDENT' ? <a href="#my-profile-enrollments">Enrollments</a> : null}
        {user?.role === 'STUDENT' ? <a href="#my-profile-conduct">Conduct</a> : null}
      </nav>

      <section id="my-profile-identity" className="my-profile-section">
        <div className="my-profile-card my-profile-card--identity">
          <div className="my-profile-identity-visual">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="my-profile-avatar my-profile-avatar--photo" />
            ) : (
              <div className="my-profile-avatar" aria-hidden>
                {initialsFromName(user.name)}
              </div>
            )}
          </div>
          <div className="my-profile-identity-body">
            <div className="my-profile-identity-top">
              <h2 className="my-profile-identity-name">{user.name}</h2>
              <span className="my-profile-role-pill">{user.role === 'OFFICER' ? 'Officer' : 'Student'}</span>
            </div>
            <dl className="my-profile-identity-meta">
              <dt>Email</dt>
              <dd>{user.email || '—'}</dd>
              <dt>Student number</dt>
              <dd>{user.student_number || '—'}</dd>
            </dl>
            <Link to="/dashboard/profile-settings" className="my-profile-settings-link">
              Contact number &amp; profile photo → Profile settings
            </Link>
          </div>
        </div>
      </section>

      {hasAcademic && (
        <section id="my-profile-academic" className="my-profile-section">
          <div className="my-profile-card">
            <MyProfileSectionHead
              icon="📋"
              title="Academic record"
              subtitle="Maintained by the department. Contact the office if something needs correction."
            />
            <div className="my-profile-stat-grid">
              {academicStats.map((row) => (
                <div key={row.label} className="my-profile-stat">
                  <span className="my-profile-stat-label">{row.label}</span>
                  <span className="my-profile-stat-value">{row.value}</span>
                </div>
              ))}
            </div>
            {Array.isArray(profile.gpa_per_semester) && profile.gpa_per_semester.length > 0 && (
              <div className="my-profile-gpa-block">
                <strong>GPA per semester</strong>
                <ul>
                  {profile.gpa_per_semester.map((item, i) => (
                    <li key={i}>
                      {item.semester || `Semester ${i + 1}`}: {Number(item.gpa).toFixed(2)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section id="my-profile-about" className="my-profile-section">
      <form className="my-profile-card my-profile-card--form" onSubmit={handleSubmit}>
        <MyProfileSectionHead
          icon="✏️"
          title="Interests & profile details"
          subtitle="You can edit these fields anytime. They help advisors and activity leads understand your strengths."
        />
        <p className="profile-form-hint">Academic placement above is read-only; only admins can change it.</p>
        {user.role === 'STUDENT' && (
          <>
            <h3 className="my-profile-subhead">Physical data (optional — sports)</h3>
            <p className="profile-form-hint">Optional. Used for sports/PE context; only sports coordinators can view.</p>
            <div className="my-profile-form-grid-2">
              <div className="profile-form-row">
                <label htmlFor="mp-height">Height (cm)</label>
                <input id="mp-height" type="number" name="height_cm" value={form.height_cm} onChange={handleChange} placeholder="170" step="0.01" />
              </div>
              <div className="profile-form-row">
                <label htmlFor="mp-weight">Weight (kg)</label>
                <input id="mp-weight" type="number" name="weight_kg" value={form.weight_kg} onChange={handleChange} placeholder="65" step="0.01" />
              </div>
              <div className="profile-form-row">
                <label htmlFor="mp-hand">Dominant hand</label>
                <select id="mp-hand" name="dominant_hand" value={form.dominant_hand} onChange={handleChange}>
                  <option value="">— Optional —</option>
                  <option value="Right">Right</option>
                  <option value="Left">Left</option>
                  <option value="Ambidextrous">Ambidextrous</option>
                </select>
              </div>
              <div className="profile-form-row">
                <label htmlFor="mp-position">Preferred position</label>
                <input id="mp-position" type="text" name="preferred_position" value={form.preferred_position} onChange={handleChange} placeholder="e.g. Point Guard" />
              </div>
            </div>
          </>
        )}
        <div className="profile-form-row">
          <label>Sports interests (comma-separated)</label>
          <input type="text" name="sports_interests" value={form.sports_interests} onChange={handleChange} placeholder="basketball, volleyball" />
        </div>
        <div className="profile-form-row">
          <label>Activity interests (comma-separated)</label>
          <input type="text" name="activity_interests" value={form.activity_interests} onChange={handleChange} placeholder="hackathon, chess" />
        </div>
        <div className="profile-form-row">
          <label>Skills / Notes</label>
          <textarea name="skills" value={form.skills} onChange={handleChange} rows={2} />
        </div>
        {message && <p className="profile-message">{message}</p>}
        <button type="submit" disabled={saving} className="profile-save-btn">
          {saving ? 'Saving...' : 'Save changes'}
        </button>
      </form>
      </section>

      {canSubmitNonAcademic && (
        <>
          <section id="my-profile-nonacademic" className="my-profile-section">
            <div className="my-profile-card">
              <MyProfileSectionHead
                icon="🏅"
                title="Non-academic achievements"
                subtitle="Awards, activities, and leadership roles. Submissions are reviewed by an admin before they appear on your record."
              />
            {nonAcademicEntries.length > 0 ? (
              <ul className="profile-na-list">
                {nonAcademicEntries.map((entry) => (
                  <li key={entry.id} className="profile-na-item">
                    <span className={`profile-na-badge profile-na-badge-${entry.status}`}>{entry.status}</span>
                    <strong>{typeLabels[entry.type] || entry.type}:</strong> {entry.title}
                    {entry.description && <span className="profile-na-desc"> — {entry.description}</span>}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="spd-muted">No entries yet.</p>
            )}
            </div>
          <form className="my-profile-card my-profile-card--form" onSubmit={handleNonAcademicSubmit} style={{ marginTop: '1rem' }}>
            <h2 className="my-profile-section-title" style={{ marginBottom: '0.5rem' }}>Submit a new entry</h2>
            <p className="profile-form-hint">Attach proof if you have a certificate or photo (PDF, JPG, PNG).</p>
            <div className="profile-form-row">
              <label>Type</label>
              <select value={naForm.type} onChange={(e) => setNaForm((f) => ({ ...f, type: e.target.value }))}>
                <option value="past_activity">Past activity participation</option>
                <option value="award">Award / recognition</option>
                <option value="leadership">Leadership role</option>
              </select>
            </div>
            <div className="profile-form-row">
              <label>Title</label>
              <input type="text" value={naForm.title} onChange={(e) => setNaForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Basketball varsity 2024" required />
            </div>
            <div className="profile-form-row">
              <label>Description (optional)</label>
              <textarea value={naForm.description} onChange={(e) => setNaForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="profile-form-row">
              <label>Proof (optional, PDF or image)</label>
              <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => setNaProofFile(e.target.files?.[0] || null)} />
            </div>
            {naMessage && <p className="profile-message">{naMessage}</p>}
            <button type="submit" disabled={naSubmitting} className="profile-save-btn">
              {naSubmitting ? 'Submitting…' : 'Submit for approval'}
            </button>
          </form>
          </section>
        </>
      )}

      {canManageSkills && (
        <>
          <section id="my-profile-skills" className="my-profile-section">
            <div className="my-profile-card">
              <MyProfileSectionHead
                icon="⚡"
                title="Tagged skills"
                subtitle="Show proficiency and link a portfolio or GitHub. Staff may endorse skills for official activities."
              />
            {skillEntries.length > 0 ? (
              <ul className="profile-skill-list">
                {skillEntries.map((entry) => (
                  <li key={entry.id} className="profile-skill-item">
                    <strong>{entry.skill}</strong>
                    {entry.proficiency_level && <span className="profile-skill-proficiency"> — {entry.proficiency_level}</span>}
                    {entry.endorsed_at && <span className="profile-na-badge profile-na-badge-approved">Endorsed</span>}
                    {entry.disputed_at && <span className="profile-na-badge profile-na-badge-rejected">Disputed</span>}
                    <div className="profile-skill-links">
                      {entry.portfolio_url && <a href={entry.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio</a>}
                      {entry.github_url && <a href={entry.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}
                    </div>
                    <div className="profile-skill-actions">
                      <button type="button" onClick={() => { setEditingSkillId(entry.id); setSkillForm({ skill: entry.skill, proficiency_level: entry.proficiency_level || 'Intermediate', portfolio_url: entry.portfolio_url || '', github_url: entry.github_url || '' }); }}>Edit</button>
                      <button type="button" onClick={() => handleDeleteSkill(entry.id)}>Remove</button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="profile-form-hint">No skills added yet.</p>
            )}
            </div>
          <form className="my-profile-card my-profile-card--form" onSubmit={handleSkillSubmit} style={{ marginTop: '1rem' }}>
            <h2 className="my-profile-section-title" style={{ marginBottom: '0.5rem' }}>{editingSkillId ? 'Edit skill' : 'Add a skill'}</h2>
            <div className="profile-form-row">
              <label>Skill / tag</label>
              <input type="text" value={skillForm.skill} onChange={(e) => setSkillForm((f) => ({ ...f, skill: e.target.value }))} placeholder="e.g. JavaScript, React" required />
            </div>
            <div className="profile-form-row">
              <label>Proficiency</label>
              <select value={skillForm.proficiency_level} onChange={(e) => setSkillForm((f) => ({ ...f, proficiency_level: e.target.value }))}>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
                <option value="Expert">Expert</option>
              </select>
            </div>
            <div className="profile-form-row">
              <label>Portfolio URL (optional)</label>
              <input type="url" value={skillForm.portfolio_url} onChange={(e) => setSkillForm((f) => ({ ...f, portfolio_url: e.target.value }))} placeholder="https://..." />
            </div>
            <div className="profile-form-row">
              <label>GitHub URL (optional)</label>
              <input type="url" value={skillForm.github_url} onChange={(e) => setSkillForm((f) => ({ ...f, github_url: e.target.value }))} placeholder="https://github.com/..." />
            </div>
            {skillMessage && <p className="profile-message">{skillMessage}</p>}
            <button type="submit" disabled={skillSubmitting} className="profile-save-btn">
              {skillSubmitting ? 'Saving…' : (editingSkillId ? 'Update skill' : 'Add skill')}
            </button>
            {editingSkillId && (
              <button
                type="button"
                className="profile-save-btn profile-save-btn--secondary"
                style={{ marginLeft: '0.5rem' }}
                onClick={() => {
                  setEditingSkillId(null);
                  setSkillForm({ skill: '', proficiency_level: 'Intermediate', portfolio_url: '', github_url: '' });
                }}
              >
                Cancel edit
              </button>
            )}
          </form>
          </section>
        </>
      )}

      {user?.role === 'STUDENT' && (
        <>
          <section id="my-profile-interests" className="my-profile-section">
            <div className="my-profile-card">
              <MyProfileSectionHead
                icon="🎯"
                title="Activity interests"
                subtitle="Tell us which activities you want to join. You can retract interest anytime."
              />
            {interestLoading ? (
              <p className="profile-form-hint">Loading…</p>
            ) : interestDeclarations.length === 0 ? (
              <p className="profile-form-hint">No interest declarations yet.</p>
            ) : (
              <ul className="profile-na-list">
                {interestDeclarations.map((decl) => (
                  <li key={decl.id} className="profile-conduct-item">
                    <strong>{decl.activity?.name || `Activity #${decl.activity_id}`}</strong>
                    {decl.note && <span className="profile-na-desc"> — {decl.note}</span>}
                    <button type="button" className="profile-conduct-dispute-btn" onClick={() => handleRetractInterest(decl.id)}>Retract</button>
                  </li>
                ))}
              </ul>
            )}
            </div>
          <form className="my-profile-card my-profile-card--form" onSubmit={handleAddInterest} style={{ marginTop: '1rem' }}>
            <h2 className="my-profile-section-title" style={{ marginBottom: '0.5rem' }}>Declare interest</h2>
            <div className="profile-form-row">
              <label>Activity</label>
              <select value={addInterestActivityId} onChange={(e) => setAddInterestActivityId(e.target.value)} required>
                <option value="">— Select —</option>
                {activitiesAvailable.filter((a) => !interestDeclarations.some((d) => d.activity_id === a.id)).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
                {activitiesAvailable.length > 0 && interestDeclarations.length >= activitiesAvailable.length && (
                  <option value="" disabled>All activities selected</option>
                )}
              </select>
            </div>
            <div className="profile-form-row">
              <label>Note (optional)</label>
              <input type="text" value={addInterestNote} onChange={(e) => setAddInterestNote(e.target.value)} placeholder="e.g. Prefer weekends" />
            </div>
            {interestMessage && <p className="profile-message">{interestMessage}</p>}
            <button type="submit" disabled={addInterestSubmitting || !addInterestActivityId} className="profile-save-btn">
              {addInterestSubmitting ? 'Adding…' : 'Add interest'}
            </button>
          </form>
          </section>
        </>
      )}

      {user?.role === 'STUDENT' && (
        <section id="my-profile-enrollments" className="my-profile-section">
        <div className="my-profile-card">
          <MyProfileSectionHead
            icon="📌"
            title="Activity enrollments"
            subtitle="When you are selected for a roster, confirm here to finalize your spot when prompted."
          />
          {enrollmentNotice && <p className="profile-message">{enrollmentNotice}</p>}
          {enrollmentsLoading ? (
            <p className="profile-form-hint">Loading…</p>
          ) : myEnrollments.length === 0 ? (
            <p className="profile-form-hint">No enrollments yet.</p>
          ) : (
            <ul className="profile-na-list">
              {myEnrollments.map((enr) => (
                <li key={enr.id} className="profile-conduct-item">
                  <strong>{enr.activity?.name || `Activity #${enr.activity_id}`}</strong>
                  <span className="profile-na-desc">
                    {' '}· {enrollmentStatusLabel(enr.status)}
                    {enr.enrolled_by_user?.name && (
                      <> · Selected by {enr.enrolled_by_user.name}</>
                    )}
                    {enr.enrolled_at && (
                      <> · {new Date(enr.enrolled_at).toLocaleString()}</>
                    )}
                  </span>
                  {enr.status === 'pending_confirmation' && (
                    <button
                      type="button"
                      className="profile-save-btn"
                      style={{ marginTop: '0.65rem', display: 'inline-block' }}
                      disabled={confirmingEnrollmentId === enr.id}
                      onClick={() => handleConfirmEnrollment(enr.id)}
                    >
                      {confirmingEnrollmentId === enr.id ? 'Confirming…' : 'Confirm enrollment'}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        </section>
      )}

      {user?.role === 'STUDENT' && (
        <>
          <section id="my-profile-conduct" className="my-profile-section">
          <div className="my-profile-card">
            <MyProfileSectionHead
              icon="⚖️"
              title="Conduct record"
              subtitle="Violations and commendations are read-only. You may dispute a violation you believe is incorrect."
            />
            {conductLoading ? (
              <p className="profile-form-hint">Loading…</p>
            ) : conductEntries.length === 0 ? (
              <p className="profile-form-hint">No conduct records.</p>
            ) : (
              <ul className="profile-na-list">
                {conductEntries.map((entry) => (
                  <li key={entry.id} className="profile-conduct-item">
                    <span className={`profile-conduct-badge profile-conduct-${entry.type}`}>
                      {entry.type === 'violation' ? 'Violation' : 'Commendation'}
                      {entry.severity && ` · ${entry.severity}`}
                    </span>
                    <strong>{entry.title}</strong>
                    {entry.description && <span className="profile-na-desc"> — {entry.description}</span>}
                    <span className="profile-conduct-date">{entry.recorded_at}</span>
                    {entry.dispute_status && (
                      <span className={`profile-na-badge profile-na-badge-${entry.dispute_status === 'pending' ? 'pending' : 'approved'}`}>
                        {disputeStatusLabels[entry.dispute_status] || entry.dispute_status}
                      </span>
                    )}
                    {entry.type === 'violation' && entry.dispute_status !== 'pending' && (
                      <button type="button" className="profile-conduct-dispute-btn" onClick={() => { setDisputeModalEntry(entry); setDisputeReason(''); setDisputeMessage(''); }}>
                        Submit dispute
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
          </section>
          {disputeModalEntry && (
            <div className="profile-modal-overlay" onClick={() => { setDisputeModalEntry(null); setDisputeReason(''); setDisputeMessage(''); }}>
              <div className="profile-modal" onClick={(e) => e.stopPropagation()}>
                <h3>Submit dispute — {disputeModalEntry.title}</h3>
                <p className="profile-form-hint">Explain why you believe this violation record is incorrect. Admin will review and resolve. All conduct changes remain traceable.</p>
                <form onSubmit={handleDisputeSubmit}>
                  <div className="profile-form-row">
                    <label>Reason (required)</label>
                    <textarea value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} rows={4} required placeholder="Describe why this record is incorrect…" />
                  </div>
                  {disputeMessage && <p className="profile-message">{disputeMessage}</p>}
                  <div className="profile-modal-actions">
                    <button type="button" className="spd-modal-cancel" onClick={() => { setDisputeModalEntry(null); setDisputeReason(''); setDisputeMessage(''); }}>Cancel</button>
                    <button type="submit" disabled={disputeSubmitting} className="profile-save-btn">{disputeSubmitting ? 'Submitting…' : 'Submit dispute'}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
