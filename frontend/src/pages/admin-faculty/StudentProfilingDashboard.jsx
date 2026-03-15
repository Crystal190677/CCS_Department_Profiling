import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
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
  const [editProfileStudent, setEditProfileStudent] = useState(null);
  const [profileForm, setProfileForm] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [pendingEntries, setPendingEntries] = useState([]);
  const [entriesModalStudent, setEntriesModalStudent] = useState(null);
  const [studentEntries, setStudentEntries] = useState([]);
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [skillsModalStudent, setSkillsModalStudent] = useState(null);
  const [studentSkills, setStudentSkills] = useState([]);
  const [skillFormModal, setSkillFormModal] = useState({ skill: '', proficiency_level: 'Intermediate', portfolio_url: '', github_url: '' });
  const [savingSkill, setSavingSkill] = useState(false);
  const [conductModalStudent, setConductModalStudent] = useState(null);
  const [conductEntries, setConductEntries] = useState([]);
  const [conductLoading, setConductLoading] = useState(false);
  const [conductForm, setConductForm] = useState({ type: 'violation', severity: 'Minor', title: '', description: '', recorded_at: '' });
  const [savingConduct, setSavingConduct] = useState(false);
  const [editingConductId, setEditingConductId] = useState(null);
  const [resolveDisputeEntry, setResolveDisputeEntry] = useState(null);
  const [resolveDisputeStatus, setResolveDisputeStatus] = useState('resolved_upheld');
  const [resolveDisputeNote, setResolveDisputeNote] = useState('');
  const [savingResolve, setSavingResolve] = useState(false);
  const [activitiesForAdmin, setActivitiesForAdmin] = useState([]);
  const [activitySetupOpen, setActivitySetupOpen] = useState(false);
  const [activityForm, setActivityForm] = useState(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const user = JSON.parse(localStorage.getItem('ccs_user') || '{}');

  const typeLabels = { past_activity: 'Past activity', award: 'Award', leadership: 'Leadership' };

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

  const fetchPendingEntries = useCallback(async () => {
    if (user?.role !== 'ADMIN') return;
    const res = await fetch('/api/non-academic-entries?status=pending', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.data?.data) setPendingEntries(data.data.data);
  }, [user?.role]);

  const fetchStudentEntries = useCallback(async (userId) => {
    const res = await fetch(`/api/non-academic-entries?user_id=${userId}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && data.data?.data) setStudentEntries(data.data.data);
    else setStudentEntries([]);
  }, []);

  const fetchStudentSkills = useCallback(async (userId) => {
    const res = await fetch(`/api/skill-entries?user_id=${userId}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success && Array.isArray(data.data)) setStudentSkills(data.data);
    else setStudentSkills([]);
  }, []);

  const fetchActivitiesForAdmin = useCallback(async () => {
    const res = await fetch('/api/activities/list-for-admin', { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) setActivitiesForAdmin(data.data || []);
    else setActivitiesForAdmin([]);
  }, []);

  const fetchConductEntries = useCallback(async (userId) => {
    if (!userId) return;
    setConductLoading(true);
    try {
      const res = await fetch(`/api/conduct-entries?user_id=${userId}`, { headers: getAuthHeaders() });
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

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const role = user?.role;
    if (!token || (role !== 'ADMIN' && role !== 'FACULTY')) {
      navigate('/login');
      return;
    }
    Promise.all([fetchStudents(), fetchActivities()]).finally(() => setLoading(false));
    if (role === 'ADMIN') {
      fetchPendingEntries();
      fetchActivitiesForAdmin();
    }
  }, [navigate, user?.role, fetchStudents, fetchActivities, fetchPendingEntries, fetchActivitiesForAdmin]);

  const handleApproveEntry = async (id) => {
    try {
      const res = await fetch(`/api/non-academic-entries/${id}/approve`, { method: 'PATCH', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        fetchPendingEntries();
        if (entriesModalStudent) fetchStudentEntries(entriesModalStudent.id);
      } else setError(data.message);
    } catch (err) { setError('Request failed'); }
  };

  const handleRejectEntry = async (id) => {
    setRejectingId(id);
    try {
      const res = await fetch(`/api/non-academic-entries/${id}/reject`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ rejection_reason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        setRejectReason('');
        setRejectingId(null);
        fetchPendingEntries();
        if (entriesModalStudent) fetchStudentEntries(entriesModalStudent.id);
      } else setError(data.message);
    } catch (err) { setError('Request failed'); setRejectingId(null); }
  };

  const handleFlagEntry = async (id) => {
    try {
      const res = await fetch(`/api/non-academic-entries/${id}/flag`, { method: 'PATCH', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && entriesModalStudent) fetchStudentEntries(entriesModalStudent.id);
    } catch (err) { setError('Request failed'); }
  };

  const handleEndorseEntry = async (id) => {
    try {
      const res = await fetch(`/api/non-academic-entries/${id}/endorse`, { method: 'PATCH', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && entriesModalStudent) fetchStudentEntries(entriesModalStudent.id);
    } catch (err) { setError('Request failed'); }
  };

  const openEntriesModal = (student) => {
    setEntriesModalStudent(student);
    fetchStudentEntries(student.id);
  };

  const openSkillsModal = (student) => {
    setSkillsModalStudent(student);
    setSkillFormModal({ skill: '', proficiency_level: 'Intermediate', portfolio_url: '', github_url: '' });
    fetchStudentSkills(student.id);
  };

  const openConductModal = (student) => {
    setConductModalStudent(student);
    setConductForm({ type: 'violation', severity: 'Minor', title: '', description: '', recorded_at: new Date().toISOString().slice(0, 10) });
    setEditingConductId(null);
    setResolveDisputeEntry(null);
    fetchConductEntries(student.id);
  };

  const handleAddConduct = async (e) => {
    e.preventDefault();
    if (!conductModalStudent || !conductForm.title.trim()) return;
    setSavingConduct(true);
    setError('');
    try {
      const res = await fetch('/api/conduct-entries', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          user_id: conductModalStudent.id,
          type: conductForm.type,
          severity: conductForm.type === 'violation' ? conductForm.severity : null,
          title: conductForm.title.trim(),
          description: conductForm.description.trim() || null,
          recorded_at: conductForm.recorded_at || new Date().toISOString().slice(0, 10),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setConductForm({ type: 'violation', severity: 'Minor', title: '', description: '', recorded_at: new Date().toISOString().slice(0, 10) });
        fetchConductEntries(conductModalStudent.id);
      } else setError(data.message || 'Failed to add record');
    } catch (err) { setError('Request failed'); }
    finally { setSavingConduct(false); }
  };

  const handleUpdateConduct = async (e) => {
    e.preventDefault();
    if (!editingConductId || !conductForm.title.trim()) return;
    setSavingConduct(true);
    setError('');
    try {
      const res = await fetch(`/api/conduct-entries/${editingConductId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          type: conductForm.type,
          severity: conductForm.type === 'violation' ? conductForm.severity : null,
          title: conductForm.title.trim(),
          description: conductForm.description.trim() || null,
          recorded_at: conductForm.recorded_at,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingConductId(null);
        setConductForm({ type: 'violation', severity: 'Minor', title: '', description: '', recorded_at: new Date().toISOString().slice(0, 10) });
        fetchConductEntries(conductModalStudent?.id);
      } else setError(data.message || 'Failed to update');
    } catch (err) { setError('Request failed'); }
    finally { setSavingConduct(false); }
  };

  const handleDeleteConduct = async (id) => {
    if (!conductModalStudent) return;
    try {
      const res = await fetch(`/api/conduct-entries/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) fetchConductEntries(conductModalStudent.id);
      else setError(data.message || 'Failed to delete');
    } catch (err) { setError('Request failed'); }
  };

  const handleResolveDisputeSubmit = async (e) => {
    e.preventDefault();
    if (!resolveDisputeEntry) return;
    setSavingResolve(true);
    setError('');
    try {
      const res = await fetch(`/api/conduct-entries/${resolveDisputeEntry.id}/resolve-dispute`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ dispute_status: resolveDisputeStatus, resolve_note: resolveDisputeNote.trim() || null }),
      });
      const data = await res.json();
      if (data.success) {
        setResolveDisputeEntry(null);
        setResolveDisputeStatus('resolved_upheld');
        setResolveDisputeNote('');
        fetchConductEntries(conductModalStudent?.id);
      } else setError(data.message || 'Failed to resolve');
    } catch (err) { setError('Request failed'); }
    finally { setSavingResolve(false); }
  };

  const openActivitySetup = (activity = null) => {
    const c = activity?.criteria || {};
    setActivityForm(activity ? {
      id: activity.id,
      name: activity.name,
      type: activity.type || 'sport',
      description: activity.description || '',
      time_slot: activity.time_slot || '',
      max_enrollees: activity.max_enrollees ?? '',
      reserve_slots: activity.reserve_slots ?? '',
      is_active: activity.is_active !== false,
      min_gpa: c.min_gpa ?? '',
      max_failed_units: c.max_failed_units ?? '',
      academic_standings: Array.isArray(c.academic_standings) ? c.academic_standings : [],
      year_level_min: c.year_level_min ?? '',
      enrolled_units_min: c.enrolled_units_min ?? '',
      min_height_cm: c.min_height_cm ?? c.min_height ?? '',
      required_skills: Array.isArray(c.required_skills) ? c.required_skills.map((s) => (typeof s === 'string' ? { skill: s, min_proficiency: 'Intermediate' } : { skill: s.skill || s.name || '', min_proficiency: s.min_proficiency || 'Intermediate' })) : [],
      bonus_skills: Array.isArray(c.bonus_skills) ? c.bonus_skills : [],
      conflicting_activity_ids: Array.isArray(c.conflicting_activity_ids) ? c.conflicting_activity_ids : [],
      no_major_grave: !!c.no_major_grave,
      max_minor_violations: c.max_minor_violations ?? '',
    } : {
      id: null,
      name: '',
      type: 'sport',
      description: '',
      time_slot: '',
      max_enrollees: '',
      reserve_slots: '',
      is_active: true,
      min_gpa: '',
      max_failed_units: '',
      academic_standings: [],
      year_level_min: '',
      enrolled_units_min: '',
      min_height_cm: '',
      required_skills: [],
      bonus_skills: [],
      conflicting_activity_ids: [],
      no_major_grave: false,
      max_minor_violations: '',
    });
    setActivitySetupOpen(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!activityForm?.name?.trim()) return;
    setSavingActivity(true);
    setError('');
    try {
      const criteria = {
        ...(activityForm.min_gpa !== '' && { min_gpa: parseFloat(activityForm.min_gpa) }),
        ...(activityForm.max_failed_units !== '' && { max_failed_units: parseInt(activityForm.max_failed_units, 10) }),
        ...(activityForm.academic_standings?.length > 0 && { academic_standings: activityForm.academic_standings }),
        ...(activityForm.year_level_min !== '' && { year_level_min: parseInt(activityForm.year_level_min, 10) }),
        ...(activityForm.enrolled_units_min !== '' && { enrolled_units_min: parseInt(activityForm.enrolled_units_min, 10) }),
        ...(activityForm.min_height_cm !== '' && { min_height_cm: parseFloat(activityForm.min_height_cm) }),
        ...(activityForm.required_skills?.length > 0 && { required_skills: activityForm.required_skills.filter((s) => s.skill?.trim()) }),
        ...(activityForm.bonus_skills?.length > 0 && { bonus_skills: activityForm.bonus_skills.filter(Boolean) }),
        ...(activityForm.conflicting_activity_ids?.length > 0 && { conflicting_activity_ids: activityForm.conflicting_activity_ids }),
        ...(activityForm.no_major_grave && { no_major_grave: true }),
        ...(activityForm.max_minor_violations !== '' && { max_minor_violations: parseInt(activityForm.max_minor_violations, 10) }),
      };
      const payload = {
        name: activityForm.name.trim(),
        type: activityForm.type,
        description: activityForm.description.trim() || null,
        time_slot: activityForm.time_slot.trim() || null,
        max_enrollees: activityForm.max_enrollees === '' ? null : parseInt(activityForm.max_enrollees, 10),
        reserve_slots: activityForm.reserve_slots === '' ? null : parseInt(activityForm.reserve_slots, 10),
        is_active: activityForm.is_active,
        criteria,
      };
      const url = activityForm.id ? `/api/activities/${activityForm.id}` : '/api/activities';
      const method = activityForm.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: getAuthHeaders(), body: JSON.stringify(payload) });
      const data = await res.json();
      if (data.success) {
        setActivitySetupOpen(false);
        setActivityForm(null);
        fetchActivities();
        fetchActivitiesForAdmin();
      } else setError(data.message || 'Failed to save');
    } catch (err) { setError('Request failed'); }
    finally { setSavingActivity(false); }
  };

  const handleDeleteActivity = (id) => {
    setConfirmDeleteActivityId(id);
  };

  const handleConfirmDeleteActivity = async () => {
    if (!confirmDeleteActivityId) return;
    setDeletingActivity(true);
    try {
      const res = await fetch(`/api/activities/${confirmDeleteActivityId}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        fetchActivities();
        fetchActivitiesForAdmin();
        setConfirmDeleteActivityId(null);
      } else setError(data.message || 'Failed to delete');
    } catch (err) { setError('Request failed'); }
    finally { setDeletingActivity(false); }
  };

  const handleSaveSkillModal = async (e) => {
    e.preventDefault();
    if (!skillFormModal.skill.trim() || !skillsModalStudent) return;
    setSavingSkill(true);
    try {
      const payload = {
        skill: skillFormModal.skill.trim(),
        proficiency_level: skillFormModal.proficiency_level || null,
        portfolio_url: skillFormModal.portfolio_url.trim() || null,
        github_url: skillFormModal.github_url.trim() || null,
      };
      if (user.role === 'ADMIN' && skillsModalStudent) payload.user_id = skillsModalStudent.id;
      const res = await fetch('/api/skill-entries', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setSkillFormModal({ skill: '', proficiency_level: 'Intermediate', portfolio_url: '', github_url: '' });
        fetchStudentSkills(skillsModalStudent.id);
      } else setError(data.message);
    } catch (err) { setError('Request failed'); }
    setSavingSkill(false);
  };

  const handleEndorseSkill = async (id) => {
    try {
      const res = await fetch(`/api/skill-entries/${id}/endorse`, { method: 'PATCH', headers: getAuthHeaders() });
      if (res.ok && skillsModalStudent) fetchStudentSkills(skillsModalStudent.id);
    } catch (err) { setError('Request failed'); }
  };

  const handleDisputeSkill = async (id) => {
    try {
      const res = await fetch(`/api/skill-entries/${id}/dispute`, { method: 'PATCH', headers: getAuthHeaders() });
      if (res.ok && skillsModalStudent) fetchStudentSkills(skillsModalStudent.id);
    } catch (err) { setError('Request failed'); }
  };

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

  const openEditProfile = (student) => {
    const p = student.student_profile || {};
    setEditProfileStudent(student);
    setProfileForm({
      height_cm: p.height_cm ?? '',
      weight_kg: p.weight_kg ?? '',
      course: p.course ?? '',
      year_level: p.year_level ?? '',
      current_gpa: p.current_gpa ?? '',
      academic_standing: p.academic_standing ?? '',
      section: p.section ?? '',
      failed_units: p.failed_units ?? '',
      incomplete_grades: p.incomplete_grades ?? '',
      enrolled_units: p.enrolled_units ?? '',
      dominant_hand: p.dominant_hand ?? '',
      preferred_position: p.preferred_position ?? '',
      sports_interests: Array.isArray(p.sports_interests) ? p.sports_interests : [],
      activity_interests: Array.isArray(p.activity_interests) ? p.activity_interests : [],
      skills: p.skills ?? '',
      notes: p.notes ?? '',
    });
  };

  const showPhysicalColumn = user?.role === 'ADMIN' || user?.is_sports_faculty;

  const handleProfileFormChange = (field, value) => {
    setProfileForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!editProfileStudent || !profileForm) return;
    setSavingProfile(true);
    setError('');
    try {
      const payload = {
        ...profileForm,
        height_cm: profileForm.height_cm !== '' ? parseFloat(profileForm.height_cm) : null,
        weight_kg: profileForm.weight_kg !== '' ? parseFloat(profileForm.weight_kg) : null,
        course: profileForm.course || null,
        year_level: profileForm.year_level || null,
        current_gpa: profileForm.current_gpa !== '' ? parseFloat(profileForm.current_gpa) : null,
        academic_standing: profileForm.academic_standing || null,
        section: profileForm.section || null,
        failed_units: profileForm.failed_units !== '' ? parseInt(profileForm.failed_units, 10) : null,
        incomplete_grades: profileForm.incomplete_grades !== '' ? parseInt(profileForm.incomplete_grades, 10) : null,
        enrolled_units: profileForm.enrolled_units !== '' ? parseInt(profileForm.enrolled_units, 10) : null,
        dominant_hand: profileForm.dominant_hand?.trim() || null,
        preferred_position: profileForm.preferred_position?.trim() || null,
        skills: profileForm.skills || null,
        notes: profileForm.notes || null,
      };
      const res = await fetch(`/api/students/${editProfileStudent.id}/profile`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setEditProfileStudent(null);
        setProfileForm(null);
        fetchStudents();
      } else {
        setError(data.message || 'Failed to save profile');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setSavingProfile(false);
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

      {user?.role === 'ADMIN' && (
        <section className="spd-activity-setup">
          <h2 className="spd-officer-title">Activity / Event Setup</h2>
          <p className="spd-officer-desc">Configure activities and qualification criteria before enrollment. Students are filtered by these rules when you use &quot;Filter by activity&quot;.</p>
          <div className="spd-activity-setup-toolbar">
            <button type="button" className="spd-search-btn" onClick={() => openActivitySetup()}>Add activity</button>
          </div>
          <div className="spd-table-wrap">
            <table className="spd-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Type</th>
                  <th>Slots</th>
                  <th>Enrolled / Waitlist</th>
                  <th>Criteria summary</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {activitiesForAdmin.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="spd-empty">No activities. Add one to get started.</td>
                  </tr>
                ) : (
                  activitiesForAdmin.map((a) => (
                    <tr key={a.id}>
                      <td><strong>{a.name}</strong>{!a.is_active && <span className="spd-muted"> (inactive)</span>}</td>
                      <td>{a.type}</td>
                      <td>{a.max_enrollees != null ? `${a.max_enrollees} max` : '—'} {a.reserve_slots > 0 ? `, ${a.reserve_slots} waitlist` : ''}</td>
                      <td>{(a.enrollment_counts?.active ?? 0)} / {(a.enrollment_counts?.waitlist ?? 0)}</td>
                      <td className="spd-criteria-summary">
                        {a.criteria?.min_gpa != null && <span>GPA≥{a.criteria.min_gpa}</span>}
                        {a.criteria?.min_height_cm != null && <span>H≥{a.criteria.min_height_cm}cm</span>}
                        {a.criteria?.no_major_grave && <span>No Major/Grave</span>}
                        {!a.criteria?.min_gpa && !a.criteria?.min_height_cm && !a.criteria?.no_major_grave && '—'}
                      </td>
                      <td>
                        <button type="button" className="spd-edit-profile-btn" onClick={() => openActivitySetup(a)}>Edit</button>
                        <button type="button" className="spd-officer-remove" onClick={() => handleDeleteActivity(a.id)}>Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <ConfirmModal
            open={!!confirmDeleteActivityId}
            title="Delete activity"
            message="Delete this activity? All enrollments for it will be removed. This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            loading={deletingActivity}
            onConfirm={handleConfirmDeleteActivity}
            onCancel={() => setConfirmDeleteActivityId(null)}
          />
        </section>
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
                <th>Academic</th>
                {showPhysicalColumn && <th>Physical</th>}
                <th>Profile</th>
                <th>Interests</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.length === 0 ? (
                <tr>
                  <td colSpan={showPhysicalColumn ? 8 : 7} className="spd-empty">
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
                    <td className="spd-academic-cell">
                      {student.student_profile?.current_gpa != null && (
                        <span className="spd-academic-gpa">GPA {Number(student.student_profile.current_gpa).toFixed(2)}</span>
                      )}
                      {student.student_profile?.academic_standing && (
                        <span className="spd-academic-standing">{student.student_profile.academic_standing}</span>
                      )}
                      {(!student.student_profile?.current_gpa && !student.student_profile?.academic_standing) && '—'}
                    </td>
                    {showPhysicalColumn && (
                      <td className="spd-physical-cell">
                        {student.student_profile?.height_cm != null || student.student_profile?.weight_kg != null
                          ? `${student.student_profile?.height_cm ?? '—'} cm / ${student.student_profile?.weight_kg ?? '—'} kg`
                          : '—'}
                        {(student.student_profile?.dominant_hand || student.student_profile?.preferred_position) && (
                          <span className="spd-physical-extra">
                            {[student.student_profile?.dominant_hand, student.student_profile?.preferred_position].filter(Boolean).join(' · ')}
                          </span>
                        )}
                      </td>
                    )}
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
                    <td className="spd-interests-cell">
                      {(student.interest_declarations?.length > 0) ? (
                        <div className="spd-profile-tags">
                          {student.interest_declarations.map((d) => (
                            <span key={d.id} className="spd-tag spd-tag-activity">{d.activity?.name ?? `#${d.activity_id}`}</span>
                          ))}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      <div className="spd-actions-cell">
                        {(user.role === 'ADMIN' || user.role === 'FACULTY') && (
                          <>
                            <button type="button" className="spd-edit-profile-btn" onClick={() => openEntriesModal(student)}>
                              Entries
                            </button>
                            <button type="button" className="spd-edit-profile-btn" onClick={() => openSkillsModal(student)}>
                              Skills
                            </button>
                            <button type="button" className="spd-edit-profile-btn" onClick={() => openConductModal(student)}>
                              Conduct
                            </button>
                          </>
                        )}
                        {user.role === 'ADMIN' && (
                          <button
                            type="button"
                            className="spd-edit-profile-btn"
                            onClick={() => openEditProfile(student)}
                          >
                            Edit profile
                          </button>
                        )}
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
                      </div>
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

      {user.role === 'ADMIN' && (
        <section className="spd-officer-section">
          <h2 className="spd-officer-title">Pending non-academic submissions</h2>
          <p className="spd-officer-desc">Verify and approve student-submitted entries (past activity, awards, leadership).</p>
          {pendingEntries.length === 0 ? (
            <p className="spd-muted">No pending submissions.</p>
          ) : (
            <div className="spd-table-wrap">
              <table className="spd-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Title</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{entry.user?.name} {entry.user?.student_number && `(${entry.user.student_number})`}</td>
                      <td>{typeLabels[entry.type] || entry.type}</td>
                      <td>{entry.title}</td>
                      <td>
                        <button type="button" className="spd-enroll-btn" onClick={() => handleApproveEntry(entry.id)}>Approve</button>
                        <button type="button" className="spd-officer-remove" onClick={() => setRejectingId(entry.id)}>Reject</button>
                        {rejectingId === entry.id && (
                          <div className="spd-reject-inline">
                            <input placeholder="Reason (optional)" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                            <button type="button" className="spd-search-btn" onClick={() => handleRejectEntry(entry.id)}>Confirm reject</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {skillsModalStudent && (
        <div className="spd-modal-overlay" onClick={() => setSkillsModalStudent(null)}>
          <div className="spd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Skills — {skillsModalStudent.name}</h3>
              <button type="button" className="spd-modal-close" onClick={() => setSkillsModalStudent(null)} aria-label="Close">×</button>
            </div>
            <div className="spd-modal-form">
              {user.role === 'ADMIN' && (
                <form onSubmit={handleSaveSkillModal} className="spd-modal-fieldset">
                  <legend>Add skill (Admin)</legend>
                  <div className="spd-modal-row">
                    <input placeholder="Skill / tag" value={skillFormModal.skill} onChange={(e) => setSkillFormModal((f) => ({ ...f, skill: e.target.value }))} required />
                  </div>
                  <div className="spd-modal-row">
                    <select value={skillFormModal.proficiency_level} onChange={(e) => setSkillFormModal((f) => ({ ...f, proficiency_level: e.target.value }))}>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                  </div>
                  <div className="spd-modal-row">
                    <input placeholder="Portfolio URL" value={skillFormModal.portfolio_url} onChange={(e) => setSkillFormModal((f) => ({ ...f, portfolio_url: e.target.value }))} />
                  </div>
                  <div className="spd-modal-row">
                    <input placeholder="GitHub URL" value={skillFormModal.github_url} onChange={(e) => setSkillFormModal((f) => ({ ...f, github_url: e.target.value }))} />
                  </div>
                  <button type="submit" className="spd-search-btn" disabled={savingSkill}>{savingSkill ? 'Adding…' : 'Add skill'}</button>
                </form>
              )}
              {studentSkills.length === 0 ? (
                <p className="spd-muted">No skills.</p>
              ) : (
                <ul className="spd-entries-list">
                  {studentSkills.map((entry) => (
                    <li key={entry.id} className="spd-entries-item">
                      <strong>{entry.skill}</strong>
                      {entry.proficiency_level && ` — ${entry.proficiency_level}`}
                      {entry.endorsed_at && <span className="profile-na-badge profile-na-badge-approved">Endorsed</span>}
                      {entry.disputed_at && <span className="profile-na-badge profile-na-badge-rejected">Disputed</span>}
                      <div className="profile-skill-links">
                        {entry.portfolio_url && <a href={entry.portfolio_url} target="_blank" rel="noopener noreferrer">Portfolio</a>}
                        {entry.github_url && <a href={entry.github_url} target="_blank" rel="noopener noreferrer">GitHub</a>}
                      </div>
                      <div className="spd-entries-actions">
                        {user.role === 'FACULTY' && (
                          <>
                            <button type="button" className="spd-enroll-btn" onClick={() => handleEndorseSkill(entry.id)}>Endorse</button>
                            <button type="button" className="spd-officer-remove" onClick={() => handleDisputeSkill(entry.id)}>Dispute</button>
                          </>
                        )}
                        {user.role === 'ADMIN' && (
                          <button type="button" className="spd-officer-remove" onClick={async () => {
                            try {
                              const res = await fetch(`/api/skill-entries/${entry.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                              if (res.ok && skillsModalStudent) fetchStudentSkills(skillsModalStudent.id);
                            } catch (err) {}
                          }}>Delete</button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {entriesModalStudent && (
        <div className="spd-modal-overlay" onClick={() => { setEntriesModalStudent(null); setRejectingId(null); }}>
          <div className="spd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Non-academic entries — {entriesModalStudent.name}</h3>
              <button type="button" className="spd-modal-close" onClick={() => { setEntriesModalStudent(null); setRejectingId(null); }} aria-label="Close">×</button>
            </div>
            <div className="spd-modal-form">
              {studentEntries.length === 0 ? (
                <p className="spd-muted">No entries.</p>
              ) : (
                <ul className="spd-entries-list">
                  {studentEntries.map((entry) => (
                    <li key={entry.id} className="spd-entries-item">
                      <span className={`profile-na-badge profile-na-badge-${entry.status}`}>{entry.status}</span>
                      <strong>{typeLabels[entry.type]}:</strong> {entry.title}
                      {entry.description && <span className="profile-na-desc"> — {entry.description}</span>}
                      <div className="spd-entries-actions">
                        {entry.status === 'pending' && user.role === 'ADMIN' && (
                          <>
                            <button type="button" className="spd-enroll-btn" onClick={() => handleApproveEntry(entry.id)}>Approve</button>
                            <button type="button" className="spd-officer-remove" onClick={() => setRejectingId(entry.id)}>Reject</button>
                            {rejectingId === entry.id && (
                              <div className="spd-reject-inline">
                                <input placeholder="Reason" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                                <button type="button" className="spd-search-btn" onClick={() => handleRejectEntry(entry.id)}>Confirm</button>
                              </div>
                            )}
                          </>
                        )}
                        {user.role === 'FACULTY' && (
                          <>
                            <button type="button" className="spd-edit-profile-btn" onClick={() => handleFlagEntry(entry.id)} title="Flag">Flag</button>
                            <button type="button" className="spd-enroll-btn" onClick={() => handleEndorseEntry(entry.id)} title="Endorse">Endorse</button>
                          </>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {editProfileStudent && profileForm && (
        <div className="spd-modal-overlay" onClick={() => { setEditProfileStudent(null); setProfileForm(null); }}>
          <div className="spd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Edit profile — {editProfileStudent.name}</h3>
              <button type="button" className="spd-modal-close" onClick={() => { setEditProfileStudent(null); setProfileForm(null); }} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSaveProfile} className="spd-modal-form">
              <fieldset className="spd-modal-fieldset">
                <legend>Academic data</legend>
                <div className="spd-modal-row">
                  <label>Course / Program</label>
                  <input value={profileForm.course} onChange={(e) => handleProfileFormChange('course', e.target.value)} placeholder="BS Computer Science" />
                </div>
                <div className="spd-modal-row">
                  <label>Year level</label>
                  <input value={profileForm.year_level} onChange={(e) => handleProfileFormChange('year_level', e.target.value)} placeholder="2" />
                </div>
                <div className="spd-modal-row">
                  <label>Section</label>
                  <input value={profileForm.section} onChange={(e) => handleProfileFormChange('section', e.target.value)} placeholder="A" />
                </div>
                <div className="spd-modal-row">
                  <label>Current GPA</label>
                  <input type="number" step="0.01" min="0" max="5" value={profileForm.current_gpa} onChange={(e) => handleProfileFormChange('current_gpa', e.target.value)} placeholder="0–5" />
                </div>
                <div className="spd-modal-row">
                  <label>Academic standing</label>
                  <select value={profileForm.academic_standing} onChange={(e) => handleProfileFormChange('academic_standing', e.target.value)}>
                    <option value="">—</option>
                    <option value="Regular">Regular</option>
                    <option value="Irregular">Irregular</option>
                    <option value="Probationary">Probationary</option>
                  </select>
                </div>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label>Enrolled units</label>
                    <input type="number" min="0" value={profileForm.enrolled_units} onChange={(e) => handleProfileFormChange('enrolled_units', e.target.value)} />
                  </div>
                  <div>
                    <label>Failed units</label>
                    <input type="number" min="0" value={profileForm.failed_units} onChange={(e) => handleProfileFormChange('failed_units', e.target.value)} />
                  </div>
                  <div>
                    <label>Incomplete grades</label>
                    <input type="number" min="0" value={profileForm.incomplete_grades} onChange={(e) => handleProfileFormChange('incomplete_grades', e.target.value)} />
                  </div>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Other</legend>
                <div className="spd-modal-row">
                  <label>Height (cm)</label>
                  <input type="number" step="0.01" value={profileForm.height_cm} onChange={(e) => handleProfileFormChange('height_cm', e.target.value)} />
                </div>
                <div className="spd-modal-row">
                  <label>Weight (kg)</label>
                  <input type="number" step="0.01" value={profileForm.weight_kg} onChange={(e) => handleProfileFormChange('weight_kg', e.target.value)} />
                </div>
                <div className="spd-modal-row">
                  <label>Dominant hand</label>
                  <select value={profileForm.dominant_hand} onChange={(e) => handleProfileFormChange('dominant_hand', e.target.value)}>
                    <option value="">—</option>
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                    <option value="Ambidextrous">Ambidextrous</option>
                  </select>
                </div>
                <div className="spd-modal-row">
                  <label>Preferred position (sports)</label>
                  <input value={profileForm.preferred_position} onChange={(e) => handleProfileFormChange('preferred_position', e.target.value)} placeholder="e.g. Point Guard" />
                </div>
                <div className="spd-modal-row">
                  <label>Sports interests (comma-separated)</label>
                  <input
                    value={Array.isArray(profileForm.sports_interests) ? profileForm.sports_interests.join(', ') : (profileForm.sports_interests || '')}
                    onChange={(e) => handleProfileFormChange('sports_interests', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  />
                </div>
                <div className="spd-modal-row">
                  <label>Activity interests (comma-separated)</label>
                  <input
                    value={Array.isArray(profileForm.activity_interests) ? profileForm.activity_interests.join(', ') : (profileForm.activity_interests || '')}
                    onChange={(e) => handleProfileFormChange('activity_interests', e.target.value.split(',').map((s) => s.trim()).filter(Boolean))}
                  />
                </div>
                <div className="spd-modal-row">
                  <label>Skills / Notes</label>
                  <textarea value={profileForm.skills} onChange={(e) => handleProfileFormChange('skills', e.target.value)} rows={2} />
                </div>
              </fieldset>
              <div className="spd-modal-actions">
                <button type="button" className="spd-modal-cancel" onClick={() => { setEditProfileStudent(null); setProfileForm(null); }}>Cancel</button>
                <button type="submit" className="spd-search-btn" disabled={savingProfile}>{savingProfile ? 'Saving…' : 'Save profile'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {conductModalStudent && (
        <div className="spd-modal-overlay" onClick={() => { setConductModalStudent(null); setResolveDisputeEntry(null); setEditingConductId(null); }}>
          <div className="spd-modal spd-modal-conduct" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Conduct — {conductModalStudent.name}</h3>
              <button type="button" className="spd-modal-close" onClick={() => { setConductModalStudent(null); setResolveDisputeEntry(null); setEditingConductId(null); }} aria-label="Close">×</button>
            </div>
            <p className="spd-conduct-desc">{user.role === 'ADMIN' ? 'Create and edit violation or commendation records. Resolve student disputes.' : 'Read-only. Use conduct history to inform enrollment decisions.'}</p>
            {conductLoading ? (
              <p className="spd-muted">Loading…</p>
            ) : (
              <>
                <ul className="spd-conduct-list">
                  {conductEntries.length === 0 ? (
                    <li className="spd-muted">No conduct records.</li>
                  ) : (
                    conductEntries.map((entry) => (
                      <li key={entry.id} className={`spd-conduct-item spd-conduct-${entry.type}`}>
                        <span className="spd-conduct-badge">{entry.type === 'violation' ? 'Violation' : 'Commendation'}{entry.severity ? ` · ${entry.severity}` : ''}</span>
                        <strong>{entry.title}</strong>
                        {entry.description && <span className="profile-na-desc"> — {entry.description}</span>}
                        <span className="spd-conduct-date">{entry.recorded_at}</span>
                        {entry.dispute_status === 'pending' && (
                          <div className="spd-conduct-dispute-pending">
                            Dispute submitted: {entry.dispute_reason}
                            {user.role === 'ADMIN' && (
                              <button type="button" className="spd-edit-profile-btn" onClick={() => { setResolveDisputeEntry(entry); setResolveDisputeStatus('resolved_upheld'); setResolveDisputeNote(''); }}>Resolve</button>
                            )}
                          </div>
                        )}
                        {entry.dispute_status && entry.dispute_status !== 'pending' && (
                          <span className="spd-conduct-dispute-resolved">Dispute: {entry.dispute_status.replace('resolved_', '')}</span>
                        )}
                        {user.role === 'ADMIN' && !resolveDisputeEntry && (
                          <div className="spd-conduct-actions">
                            <button type="button" className="spd-edit-profile-btn" onClick={() => { setEditingConductId(entry.id); setConductForm({ type: entry.type, severity: entry.severity || 'Minor', title: entry.title, description: entry.description || '', recorded_at: entry.recorded_at }); }}>Edit</button>
                            <button type="button" className="spd-officer-remove" onClick={() => handleDeleteConduct(entry.id)}>Delete</button>
                          </div>
                        )}
                      </li>
                    ))
                  )}
                </ul>
                {user.role === 'ADMIN' && !editingConductId && !resolveDisputeEntry && (
                  <form onSubmit={handleAddConduct} className="spd-modal-form spd-conduct-form">
                    <legend className="spd-modal-legend">Add record</legend>
                    <div className="spd-modal-row">
                      <label>Type</label>
                      <select value={conductForm.type} onChange={(e) => setConductForm((f) => ({ ...f, type: e.target.value }))}>
                        <option value="violation">Violation</option>
                        <option value="commendation">Commendation</option>
                      </select>
                    </div>
                    {conductForm.type === 'violation' && (
                      <div className="spd-modal-row">
                        <label>Severity</label>
                        <select value={conductForm.severity} onChange={(e) => setConductForm((f) => ({ ...f, severity: e.target.value }))}>
                          <option value="Minor">Minor</option>
                          <option value="Major">Major</option>
                          <option value="Grave">Grave</option>
                        </select>
                      </div>
                    )}
                    <div className="spd-modal-row">
                      <label>Title</label>
                      <input value={conductForm.title} onChange={(e) => setConductForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Late submission" required />
                    </div>
                    <div className="spd-modal-row">
                      <label>Description (optional)</label>
                      <textarea value={conductForm.description} onChange={(e) => setConductForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                    </div>
                    <div className="spd-modal-row">
                      <label>Date</label>
                      <input type="date" value={conductForm.recorded_at} onChange={(e) => setConductForm((f) => ({ ...f, recorded_at: e.target.value }))} />
                    </div>
                    <button type="submit" className="spd-search-btn" disabled={savingConduct}>{savingConduct ? 'Adding…' : 'Add record'}</button>
                  </form>
                )}
                {user.role === 'ADMIN' && editingConductId && (
                  <form onSubmit={handleUpdateConduct} className="spd-modal-form spd-conduct-form">
                    <legend className="spd-modal-legend">Edit record</legend>
                    <div className="spd-modal-row">
                      <label>Type</label>
                      <select value={conductForm.type} onChange={(e) => setConductForm((f) => ({ ...f, type: e.target.value }))}>
                        <option value="violation">Violation</option>
                        <option value="commendation">Commendation</option>
                      </select>
                    </div>
                    {conductForm.type === 'violation' && (
                      <div className="spd-modal-row">
                        <label>Severity</label>
                        <select value={conductForm.severity} onChange={(e) => setConductForm((f) => ({ ...f, severity: e.target.value }))}>
                          <option value="Minor">Minor</option>
                          <option value="Major">Major</option>
                          <option value="Grave">Grave</option>
                        </select>
                      </div>
                    )}
                    <div className="spd-modal-row">
                      <label>Title</label>
                      <input value={conductForm.title} onChange={(e) => setConductForm((f) => ({ ...f, title: e.target.value }))} required />
                    </div>
                    <div className="spd-modal-row">
                      <label>Description</label>
                      <textarea value={conductForm.description} onChange={(e) => setConductForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                    </div>
                    <div className="spd-modal-row">
                      <label>Date</label>
                      <input type="date" value={conductForm.recorded_at} onChange={(e) => setConductForm((f) => ({ ...f, recorded_at: e.target.value }))} />
                    </div>
                    <div className="spd-modal-actions">
                      <button type="button" className="spd-modal-cancel" onClick={() => { setEditingConductId(null); setConductForm({ type: 'violation', severity: 'Minor', title: '', description: '', recorded_at: new Date().toISOString().slice(0, 10) }); }}>Cancel</button>
                      <button type="submit" className="spd-search-btn" disabled={savingConduct}>{savingConduct ? 'Saving…' : 'Save'}</button>
                    </div>
                  </form>
                )}
                {resolveDisputeEntry && (
                  <div className="spd-modal-form spd-conduct-form">
                    <legend className="spd-modal-legend">Resolve dispute</legend>
                    <p className="spd-muted">Student reason: {resolveDisputeEntry.dispute_reason}</p>
                    <form onSubmit={handleResolveDisputeSubmit}>
                      <div className="spd-modal-row">
                        <label>Outcome</label>
                        <select value={resolveDisputeStatus} onChange={(e) => setResolveDisputeStatus(e.target.value)}>
                          <option value="resolved_upheld">Upheld (record stands)</option>
                          <option value="resolved_revised">Revised (record updated)</option>
                          <option value="dismissed">Dismissed</option>
                        </select>
                      </div>
                      <div className="spd-modal-row">
                        <label>Note (optional)</label>
                        <textarea value={resolveDisputeNote} onChange={(e) => setResolveDisputeNote(e.target.value)} rows={2} placeholder="Internal note for resolution" />
                      </div>
                      <div className="spd-modal-actions">
                        <button type="button" className="spd-modal-cancel" onClick={() => setResolveDisputeEntry(null)}>Cancel</button>
                        <button type="submit" className="spd-search-btn" disabled={savingResolve}>{savingResolve ? 'Resolving…' : 'Resolve'}</button>
                      </div>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {activitySetupOpen && activityForm && (
        <div className="spd-modal-overlay" onClick={() => { setActivitySetupOpen(false); setActivityForm(null); }}>
          <div className="spd-modal spd-modal-activity-setup" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>{activityForm.id ? 'Edit activity' : 'Add activity'}</h3>
              <button type="button" className="spd-modal-close" onClick={() => { setActivitySetupOpen(false); setActivityForm(null); }} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSaveActivity} className="spd-modal-form">
              <fieldset className="spd-modal-fieldset">
                <legend>Basic</legend>
                <div className="spd-modal-row">
                  <label>Name</label>
                  <input value={activityForm.name} onChange={(e) => setActivityForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Basketball" required />
                </div>
                <div className="spd-modal-row">
                  <label>Type</label>
                  <select value={activityForm.type} onChange={(e) => setActivityForm((f) => ({ ...f, type: e.target.value }))}>
                    <option value="sport">Sport</option>
                    <option value="activity">Activity</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div className="spd-modal-row">
                  <label>Description (optional)</label>
                  <textarea value={activityForm.description} onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
                </div>
                <div className="spd-modal-row">
                  <label>Time slot (optional, for conflict check)</label>
                  <input value={activityForm.time_slot} onChange={(e) => setActivityForm((f) => ({ ...f, time_slot: e.target.value }))} placeholder="e.g. MWF 3-5PM" />
                </div>
                <label className="spd-modal-row-inline">
                  <input type="checkbox" checked={activityForm.is_active} onChange={(e) => setActivityForm((f) => ({ ...f, is_active: e.target.checked }))} />
                  Active
                </label>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Slot configuration</legend>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label>Max enrollees</label>
                    <input type="number" min="0" value={activityForm.max_enrollees} onChange={(e) => setActivityForm((f) => ({ ...f, max_enrollees: e.target.value }))} placeholder="Leave empty for unlimited" />
                  </div>
                  <div>
                    <label>Reserve / waitlist slots</label>
                    <input type="number" min="0" value={activityForm.reserve_slots} onChange={(e) => setActivityForm((f) => ({ ...f, reserve_slots: e.target.value }))} placeholder="0" />
                  </div>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Academic requirements</legend>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label>Min GPA</label>
                    <input type="number" step="0.01" min="0" max="5" value={activityForm.min_gpa} onChange={(e) => setActivityForm((f) => ({ ...f, min_gpa: e.target.value }))} placeholder="e.g. 2.5" />
                  </div>
                  <div>
                    <label>Max failed units</label>
                    <input type="number" min="0" value={activityForm.max_failed_units} onChange={(e) => setActivityForm((f) => ({ ...f, max_failed_units: e.target.value }))} placeholder="e.g. 2" />
                  </div>
                </div>
                <div className="spd-modal-row">
                  <label>Academic standing (leave empty = any)</label>
                  <div className="spd-modal-checkgroup">
                    {['Regular', 'Irregular', 'Probationary'].map((standing) => (
                      <label key={standing}>
                        <input
                          type="checkbox"
                          checked={activityForm.academic_standings.includes(standing)}
                          onChange={(e) => setActivityForm((f) => ({
                            ...f,
                            academic_standings: e.target.checked ? [...(f.academic_standings || []), standing] : (f.academic_standings || []).filter((s) => s !== standing),
                          }))}
                        />
                        {standing}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label>Year level min</label>
                    <input type="number" min="1" value={activityForm.year_level_min} onChange={(e) => setActivityForm((f) => ({ ...f, year_level_min: e.target.value }))} placeholder="e.g. 2" />
                  </div>
                  <div>
                    <label>Enrolled units min (full-time)</label>
                    <input type="number" min="0" value={activityForm.enrolled_units_min} onChange={(e) => setActivityForm((f) => ({ ...f, enrolled_units_min: e.target.value }))} placeholder="e.g. 12" />
                  </div>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Physical (sports)</legend>
                <div className="spd-modal-row">
                  <label>Min height (cm)</label>
                  <input type="number" step="0.01" min="0" value={activityForm.min_height_cm} onChange={(e) => setActivityForm((f) => ({ ...f, min_height_cm: e.target.value }))} placeholder="e.g. 173 for 5&#39;8&quot;" />
                </div>
                <div className="spd-modal-row">
                  <label>Conflicting activities (cannot be enrolled in both)</label>
                  <select
                    multiple
                    value={activityForm.conflicting_activity_ids}
                    onChange={(e) => setActivityForm((f) => ({
                      ...f,
                      conflicting_activity_ids: Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                    }))}
                    className="spd-modal-multi"
                  >
                    {activitiesForAdmin.filter((a) => a.id !== activityForm.id).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Conduct</legend>
                <label className="spd-modal-row-inline">
                  <input type="checkbox" checked={activityForm.no_major_grave} onChange={(e) => setActivityForm((f) => ({ ...f, no_major_grave: e.target.checked }))} />
                  No Major or Grave violations
                </label>
                <div className="spd-modal-row">
                  <label>Max minor violations allowed</label>
                  <input type="number" min="0" value={activityForm.max_minor_violations} onChange={(e) => setActivityForm((f) => ({ ...f, max_minor_violations: e.target.value }))} placeholder="e.g. 1" />
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Skills (e.g. programming contests)</legend>
                <p className="spd-muted">Required: student must have at least one skill matching (skill name + min proficiency).</p>
                {activityForm.required_skills.map((s, i) => (
                  <div key={i} className="spd-modal-row spd-modal-row-inline">
                    <input placeholder="Skill name" value={s.skill} onChange={(e) => setActivityForm((f) => ({ ...f, required_skills: f.required_skills.map((r, j) => j === i ? { ...r, skill: e.target.value } : r) }))} />
                    <select value={s.min_proficiency} onChange={(e) => setActivityForm((f) => ({ ...f, required_skills: f.required_skills.map((r, j) => j === i ? { ...r, min_proficiency: e.target.value } : r) }))}>
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                    <button type="button" className="spd-officer-remove" onClick={() => setActivityForm((f) => ({ ...f, required_skills: f.required_skills.filter((_, j) => j !== i) }))}>Remove</button>
                  </div>
                ))}
                <button type="button" className="spd-edit-profile-btn" onClick={() => setActivityForm((f) => ({ ...f, required_skills: [...(f.required_skills || []), { skill: '', min_proficiency: 'Intermediate' }] }))}>+ Add required skill</button>
              </fieldset>
              <div className="spd-modal-actions">
                <button type="button" className="spd-modal-cancel" onClick={() => { setActivitySetupOpen(false); setActivityForm(null); }}>Cancel</button>
                <button type="submit" className="spd-search-btn" disabled={savingActivity}>{savingActivity ? 'Saving…' : 'Save activity'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
