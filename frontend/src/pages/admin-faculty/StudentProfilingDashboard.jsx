import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import ConfirmModal from '../../components/ConfirmModal';
import {
  COURSE_OPTIONS,
  SECTION_LETTERS,
  SECTION_CAPACITY,
  YEAR_LEVEL_OPTIONS,
  ACADEMIC_SEMESTER_OPTIONS,
  mapLegacyCourseToSelect,
  mapLegacySectionToSelect,
  formatClassSectionLabel,
  buildClassListTreeByYear,
  CLASS_LIST_YEAR_FOLDER_KEYS,
  CLASS_LIST_YEAR_FOLDER_LABELS,
  CLASS_LIST_IRREGULAR_SUBYEAR_KEYS,
  countStudentsInClassListCourse,
  countStudentsInClassListYear,
  countStudentsInIrregularSubYear,
} from '../../constants/academicPlacement';
import { TALENT_DIRECTORY_CATEGORIES, getActivityTalentCategory } from '../../constants/talentDirectoryCategories';
import './StudentProfilingDashboard.css';

function ClassListFolderIcon({ className }) {
  return (
    <svg
      className={className}
      viewBox="0 0 64 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M6 14h20l6 8h26a4 4 0 0 1 4 4v20a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4V18a4 4 0 0 1 4-4z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path d="M6 22h52" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

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

/** True if the student/officer has completed first-time password setup (password_set_at from API). */
function isPortalAccountActivated(student) {
  return student?.password_set_at != null && student.password_set_at !== '';
}

function QualifiedStudentAvatar({ name, photoUrl }) {
  const [broken, setBroken] = useState(false);
  if (photoUrl && !broken) {
    return <img src={photoUrl} alt="" className="spd-q-photo-img" onError={() => setBroken(true)} />;
  }
  return <div className="spd-q-photo-fallback" aria-hidden>{initialsFromName(name)}</div>;
}

function rosterFilledCount(activity) {
  if (!activity) return 0;
  const c = activity.enrollment_counts || {};
  if (c.roster != null) return Number(c.roster);
  return (Number(c.active) || 0) + (Number(c.pending_confirmation) || 0) + (Number(c.confirmed) || 0);
}

function enrollmentStatusForActivity(student, activityId) {
  return student.enrollments?.find((x) => Number(x.activity_id) === Number(activityId))?.status ?? null;
}

function enrollmentButtonLabel(student, activityId, activityName) {
  const st = enrollmentStatusForActivity(student, activityId);
  if (!st) return `Enroll in ${activityName || 'activity'}`;
  if (st === 'waitlist') return 'On waitlist';
  if (st === 'pending_confirmation') return 'Awaiting student confirmation';
  return '✓ Enrolled';
}

function qualificationSummaryBullets(student) {
  const q = student.qualification_detail;
  if (!q || typeof q !== 'object') {
    const p = student.student_profile;
    const bits = [];
    if (p?.current_gpa != null) bits.push(`GPA ${Number(p.current_gpa).toFixed(2)}`);
    return bits.length ? bits : ['Meets current qualification filters (see profile for full record).'];
  }
  const parts = [];
  if (q.score_percent != null) parts.push(`Qualification score ${q.score_percent}% (${q.stars ?? 0}/5 stars)`);
  if (q.declared_interest) parts.push('Declared interest in this activity');
  const ms = q.matched_skills;
  if (Array.isArray(ms) && ms.length) {
    parts.push(`Matched skills: ${ms.map((m) => m.skill).slice(0, 6).join(', ')}${ms.length > 6 ? '…' : ''}`);
  }
  const flags = q.flags;
  if (Array.isArray(flags) && flags.length) parts.push(`Flags: ${flags.slice(0, 2).join('; ')}`);
  return parts.length ? parts : ['Ranked on the qualified list.'];
}

function slotSummaryForModal(activity) {
  if (!activity) return '';
  const max = activity.max_enrollees;
  const roster = rosterFilledCount(activity);
  const wait = activity.enrollment_counts?.waitlist ?? 0;
  if (max == null) return `Roster: ${roster} (no capacity cap). Waitlist: ${wait}.`;
  const open = Math.max(0, max - roster);
  return `Roster: ${roster} of ${max} filled (${open} open). Waitlist: ${wait}.`;
}

function browseSkillTagClass(skillName, filterRaw) {
  const q = String(filterRaw || '').trim().toLowerCase();
  const base = 'spd-talent-skill-tag';
  if (!q) return base;
  return String(skillName || '').toLowerCase().includes(q) ? `${base} spd-talent-skill-tag--match` : base;
}

function enrollmentTagClass(activityName, filterRaw) {
  const q = String(filterRaw || '').trim().toLowerCase();
  const base = 'spd-talent-enroll-tag';
  if (!q) return base;
  return String(activityName || '').toLowerCase().includes(q) ? `${base} spd-talent-enroll-tag--match` : base;
}

const BROWSE_ENROLLMENT_STATUSES = ['active', 'pending_confirmation', 'confirmed', 'waitlist'];

function enrollmentStatusSuffix(status) {
  if (status === 'waitlist') return ' · waitlist';
  if (status === 'pending_confirmation') return ' · pending';
  return '';
}

/** Activity enrollments to show in Talent Directory skills column (with activity name loaded). */
function browseEnrollmentDisplayEntries(student) {
  const list = student.enrollments || [];
  return list
    .filter((e) => e.activity?.name && BROWSE_ENROLLMENT_STATUSES.includes(e.status))
    .map((e) => ({
      key: `enr-${e.id}`,
      name: e.activity.name,
      status: e.status,
    }));
}

const ATHLETIC_RECOMMENDATION_POOL = ['Basketball', 'Volleyball', 'Badminton', 'Table Tennis', 'Track and Field'];

const TALENT_INTEREST_RE = /\b(dance|cheer|cheerdance|singing|music|theater|theatre|drama|performance|pageant|model|runway|talent|arts|cultural|drill|choir)\b/i;
const SPORTSFEST_RE = /\b(mr\.?\s*and\s*ms|ms\.?\s*sportsfest|sportsfest|pageant|binibining|ginoong)\b/i;
const ATHLETIC_SPORT_INTEREST_RE =
  /\b(basket|volley|badminton|tennis|track|field|football|soccer|swim|run|athletic|sport|sprint|relay)\b/i;

function tpNorm(s) {
  return String(s || '')
    .toLowerCase()
    .trim();
}

function tpIsAcademicProfile(p) {
  const gpa = p?.current_gpa != null ? Number(p.current_gpa) : null;
  return gpa != null && !Number.isNaN(gpa) && gpa >= 3.5;
}

function tpSportsInterestsAthletic(p) {
  const sports = Array.isArray(p?.sports_interests) ? p.sports_interests : [];
  return sports.some((x) => {
    const n = tpNorm(x);
    if (!n) return false;
    if (/\b(cheer|cheerdance|pageant)\b/i.test(n)) return false;
    return ATHLETIC_SPORT_INTEREST_RE.test(n);
  });
}

function tpIsAthletic(student, p) {
  if (tpSportsInterestsAthletic(p)) return true;
  const skills = student.skill_entries || [];
  for (const sk of skills) {
    const raw = sk.skill || '';
    if (/cheerdance|\bcheer\b/i.test(raw) && !ATHLETIC_SPORT_INTEREST_RE.test(raw)) continue;
    if (ATHLETIC_RECOMMENDATION_POOL.some((act) => tpNorm(raw).includes(tpNorm(act)))) return true;
    if (/\b(basketball|volleyball|badminton|table tennis|track and field|track|field sport|sprinter|relay)\b/i.test(raw)) return true;
  }
  for (const e of student.enrollments || []) {
    const name = e.activity?.name || '';
    if (/cheerdance/i.test(name)) continue;
    if (e.activity?.type === 'sport') return true;
  }
  return false;
}

function tpIsTalented(student, p) {
  const ai = Array.isArray(p?.activity_interests) ? p.activity_interests : [];
  if (ai.some((x) => TALENT_INTEREST_RE.test(String(x)))) return true;
  for (const sk of student.skill_entries || []) {
    if (TALENT_INTEREST_RE.test(sk.skill || '')) return true;
  }
  const decl = student.interest_declarations || student.interestDeclarations || [];
  for (const d of decl) {
    const n = d.activity?.name || '';
    if (/cheerdance|mr\.?\s*and\s*ms|sportsfest/i.test(n)) return true;
  }
  for (const e of student.enrollments || []) {
    const n = e.activity?.name || '';
    if (/cheerdance|mr\.?\s*and\s*ms|sportsfest/i.test(n)) return true;
  }
  return false;
}

function tpRecommendAcademic(student) {
  const course = tpNorm(student.student_profile?.course);
  if (/\b(bscs|bsit|ict|computer|it|programming|software)\b/.test(course)) return 'Programming';
  return Number(student.id) % 2 === 0 ? 'Programming' : 'Mobile Competition';
}

function tpRecommendAthletic(student, p) {
  const hay = [
    ...(p?.sports_interests || []).map(tpNorm),
    ...(student.skill_entries || []).map((s) => tpNorm(s.skill)),
    ...(student.enrollments || []).map((e) => tpNorm(e.activity?.name)),
  ].join(' ');
  for (const act of ATHLETIC_RECOMMENDATION_POOL) {
    const a = tpNorm(act);
    if (hay.includes(a) || hay.replace(/\s+/g, '').includes(a.replace(/\s+/g, ''))) return act;
  }
  if (/basketball/i.test(hay)) return 'Basketball';
  if (/volley/i.test(hay)) return 'Volleyball';
  if (/badminton/i.test(hay)) return 'Badminton';
  if (/table\s*tennis|ping\s*pong/i.test(hay)) return 'Table Tennis';
  if (/track|field|sprint|relay|running/i.test(hay)) return 'Track and Field';
  return ATHLETIC_RECOMMENDATION_POOL[0];
}

function tpRecommendTalented(student, p) {
  const blob = [
    ...(p?.activity_interests || []).join(' '),
    ...(student.skill_entries || []).map((s) => s.skill).join(' '),
    ...((student.interest_declarations || student.interestDeclarations || []).map((d) => d.activity?.name || '')),
  ].join(' ');
  if (SPORTSFEST_RE.test(blob)) return 'Mr. and Ms. Sportsfest';
  return 'Cheerdance';
}

function tpPrimaryCategory(academic, athletic, talented) {
  if (academic) return 'academic';
  if (athletic) return 'athletic';
  if (talented) return 'talented';
  return null;
}

function tpRecommendationForPrimary(primary, student, p) {
  if (primary === 'academic') return tpRecommendAcademic(student);
  if (primary === 'athletic') return tpRecommendAthletic(student, p);
  if (primary === 'talented') return tpRecommendTalented(student, p);
  return '';
}

/** @returns {{ student: object, primary: string, academic: boolean, athletic: boolean, talented: boolean, recommendedActivity: string } | null} */
function buildTopPerformerEntry(student) {
  const p = student.student_profile || {};
  const academic = tpIsAcademicProfile(p);
  const athletic = tpIsAthletic(student, p);
  const talented = tpIsTalented(student, p);
  if (!academic && !athletic && !talented) return null;
  const primary = tpPrimaryCategory(academic, athletic, talented);
  const recommendedActivity = tpRecommendationForPrimary(primary, student, p);
  return { student, primary, academic, athletic, talented, recommendedActivity };
}

function activityCriteriaSummary(activity) {
  const c = activity?.criteria || {};
  const parts = [];
  if (c.min_gpa != null && c.min_gpa !== '') parts.push(`GPA≥${c.min_gpa}`);
  if (c.max_failed_units != null && c.max_failed_units !== '') parts.push(`failed≤${c.max_failed_units}`);
  if (Array.isArray(c.academic_standings) && c.academic_standings.length) parts.push(c.academic_standings.join('/'));
  if (c.year_level_min != null && c.year_level_min !== '') parts.push(`Yr≥${c.year_level_min}`);
  if (c.enrolled_units_min != null && c.enrolled_units_min !== '') parts.push(`units≥${c.enrolled_units_min}`);
  if (c.min_height_cm != null && c.min_height_cm !== '') parts.push(`H≥${c.min_height_cm}cm`);
  if (c.require_preferred_position) parts.push('position req.');
  if (Array.isArray(c.required_skills) && c.required_skills.length) parts.push(`${c.required_skills.length} skill(s)`);
  if (Array.isArray(c.bonus_skills) && c.bonus_skills.length) parts.push(`+${c.bonus_skills.length} bonus`);
  if (c.no_major_grave) parts.push('no Maj/Grave');
  if (c.allow_probationary_and_hold) parts.push('Prob/on-hold OK');
  if (c.max_minor_violations != null && c.max_minor_violations !== '') parts.push(`minor≤${c.max_minor_violations}`);
  if (Array.isArray(c.conflicting_activity_ids) && c.conflicting_activity_ids.length) parts.push(`${c.conflicting_activity_ids.length} conflict(s)`);
  if (activity?.time_slot && !c.skip_schedule_conflict) parts.push('schedule check');
  if (parts.length === 0) return '—';
  return parts.join(' · ');
}

export default function StudentProfilingDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState([]);
  const [search, setSearch] = useState('');
  const [activityFilter, setActivityFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(null);
  const [enrollConfirm, setEnrollConfirm] = useState(null);
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
  const [listSection, setListSection] = useState('');
  const [listYear, setListYear] = useState('');
  const [listSkill, setListSkill] = useState('');
  const [listInterestOnly, setListInterestOnly] = useState(false);
  const [listSort, setListSort] = useState('score');
  const [listSortDir, setListSortDir] = useState('desc');
  const [fullProfile, setFullProfile] = useState(null);
  const [compareIds, setCompareIds] = useState([]);
  const [compareModalOpen, setCompareModalOpen] = useState(false);
  const [overrideModal, setOverrideModal] = useState(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideBoostPoints, setOverrideBoostPoints] = useState(150);
  const [savingOverride, setSavingOverride] = useState(false);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditRows, setAuditRows] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);
  const [browseSkill, setBrowseSkill] = useState('');
  const [browseCourse, setBrowseCourse] = useState('');
  /** Admin: filter roster by portal activation (password_set_at). */
  const [adminAccountStatusFilter, setAdminAccountStatusFilter] = useState('all');
  const profilingMainView = useMemo(
    () => (location.pathname.includes('/class-lists') ? 'class_lists' : 'browse'),
    [location.pathname],
  );
  const isTalentDirectory = useMemo(
    () => profilingMainView === 'browse' && location.pathname.includes('talent-directory'),
    [profilingMainView, location.pathname],
  );
  const [classListCourse, setClassListCourse] = useState(null);
  const [classListYear, setClassListYear] = useState(null);
  const [classListSection, setClassListSection] = useState(null);
  const [classListIrregularSubYear, setClassListIrregularSubYear] = useState(null);
  const [classListFolderLevel, setClassListFolderLevel] = useState('program');
  const [classListRoster, setClassListRoster] = useState([]);
  const [classListLoading, setClassListLoading] = useState(false);
  const [classListRefreshKey, setClassListRefreshKey] = useState(0);
  const [classListSearchInput, setClassListSearchInput] = useState('');
  const [classListSearchQuery, setClassListSearchQuery] = useState('');
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [deleteStudentId, setDeleteStudentId] = useState(null);
  const [deletingStudent, setDeletingStudent] = useState(false);
  const [studentDeleteSuccessToast, setStudentDeleteSuccessToast] = useState(false);
  const [activitiesForAdmin, setActivitiesForAdmin] = useState([]);
  const [activitySetupOpen, setActivitySetupOpen] = useState(false);
  const [activityForm, setActivityForm] = useState(null);
  const [savingActivity, setSavingActivity] = useState(false);
  const [confirmDeleteActivityId, setConfirmDeleteActivityId] = useState(null);
  const [deletingActivity, setDeletingActivity] = useState(false);
  const [assignActivityStudent, setAssignActivityStudent] = useState(null);
  const [assignActivityId, setAssignActivityId] = useState('');
  const [talentDirectoryView, setTalentDirectoryView] = useState('all_students');
  /** When set, user is picking an activity inside this Talent Directory category (null = browse everyone). */
  const [talentCategoryId, setTalentCategoryId] = useState(null);
  const [topPerformerCategory, setTopPerformerCategory] = useState('all');
  const [performersRoster, setPerformersRoster] = useState([]);
  const [performersLoading, setPerformersLoading] = useState(false);
  const browseFilterBootRef = useRef(true);
  const processedOpenEditForClassListRef = useRef(null);
  const user = JSON.parse(localStorage.getItem('ccs_user') || '{}');

  const activeActivities = useMemo(
    () =>
      [...activities]
        .filter((a) => a.is_active !== false)
        .sort((a, b) => String(a.name).localeCompare(String(b.name), undefined, { sensitivity: 'base' })),
    [activities],
  );

  const activitiesInTalentCategory = useMemo(() => {
    if (!talentCategoryId) return [];
    return activeActivities.filter((a) => getActivityTalentCategory(a) === talentCategoryId);
  }, [activeActivities, talentCategoryId]);

  const talentCategoryMeta = useMemo(
    () => (talentCategoryId ? TALENT_DIRECTORY_CATEGORIES.find((c) => c.id === talentCategoryId) ?? null : null),
    [talentCategoryId],
  );

  const isTalentCategoryPillActive = useCallback(
    (catId) => {
      if (!activityFilter) return talentCategoryId === catId;
      const sel = activeActivities.find((x) => String(x.id) === String(activityFilter));
      return Boolean(sel && getActivityTalentCategory(sel) === catId);
    },
    [activityFilter, activeActivities, talentCategoryId],
  );

  const typeLabels = { past_activity: 'Past activity', award: 'Award', leadership: 'Leadership' };

  const fetchStudents = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('include_officers', '1');
    if (user.role === 'ADMIN' && adminAccountStatusFilter !== 'all') {
      params.set('account_status', adminAccountStatusFilter);
    }
    if (search) params.set('search', search);
    if (activityFilter) {
      params.set('qualify_for', activityFilter);
      if (listSection.trim()) params.set('profile_section', listSection.trim());
      if (listYear.trim()) params.set('profile_year_level', listYear.trim());
      if (listSkill.trim()) params.set('skill', listSkill.trim());
      if (listInterestOnly) params.set('interest_only', '1');
      params.set('sort', listSort);
      params.set('sort_dir', listSortDir);
    } else {
      if (browseSkill.trim()) params.set('skill', browseSkill.trim());
      if (browseCourse.trim()) params.set('course', browseCourse.trim());
    }
    const res = await fetch(`/api/students?${params}`, { headers: getAuthHeaders() });
    const data = await res.json();
    if (data.success) {
      setStudents(data.data.data || []);
      setClassListRefreshKey((k) => k + 1);
    } else setError(data.message || 'Failed to load students');
  }, [
    user.role,
    adminAccountStatusFilter,
    search,
    activityFilter,
    listSection,
    listYear,
    listSkill,
    listInterestOnly,
    listSort,
    listSortDir,
    browseSkill,
    browseCourse,
  ]);

  const resetQualifiedListFilters = useCallback(() => {
    setListSection('');
    setListYear('');
    setListSkill('');
    setListInterestOnly(false);
    setListSort('score');
    setListSortDir('desc');
  }, []);

  const goBrowseEveryoneTalent = useCallback(() => {
    flushSync(() => {
      setTalentCategoryId(null);
      setActivityFilter('');
      resetQualifiedListFilters();
    });
    fetchStudents();
  }, [fetchStudents, resetQualifiedListFilters]);

  const pickTalentCategory = useCallback(
    (catId) => {
      flushSync(() => {
        setTalentCategoryId(catId);
        setActivityFilter('');
        resetQualifiedListFilters();
      });
      fetchStudents();
    },
    [fetchStudents, resetQualifiedListFilters],
  );

  const pickTalentActivity = useCallback(
    (id) => {
      flushSync(() => {
        setActivityFilter(String(id));
        resetQualifiedListFilters();
      });
      fetchStudents();
    },
    [fetchStudents, resetQualifiedListFilters],
  );

  useEffect(() => {
    if (!activityFilter || activeActivities.length === 0) return;
    const a = activeActivities.find((x) => String(x.id) === String(activityFilter));
    if (a) setTalentCategoryId(getActivityTalentCategory(a));
  }, [activityFilter, activeActivities]);

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

  const patchStudentRole = async (studentId, role) => {
    setRoleUpdatingId(studentId);
    setError('');
    try {
      const res = await fetch(`/api/students/${studentId}/role`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (data.success) {
        fetchStudents();
        fetchStudentsForOfficers();
        setClassListRefreshKey((k) => k + 1);
      } else setError(data.message || 'Could not update role');
    } catch {
      setError('Request failed');
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!deleteStudentId) return;
    setDeletingStudent(true);
    setError('');
    try {
      const res = await fetch(`/api/students/${deleteStudentId}`, { method: 'DELETE', headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setDeleteStudentId(null);
        fetchStudents();
        fetchStudentsForOfficers();
        setClassListRefreshKey((k) => k + 1);
        setStudentDeleteSuccessToast(true);
      } else setError(data.message || 'Delete failed');
    } catch {
      setError('Request failed');
    } finally {
      setDeletingStudent(false);
    }
  };

  useEffect(() => {
    if (!studentDeleteSuccessToast) return undefined;
    const t = setTimeout(() => setStudentDeleteSuccessToast(false), 3200);
    return () => clearTimeout(t);
  }, [studentDeleteSuccessToast]);

  useEffect(() => {
    if (deleteStudentId == null) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape' && !deletingStudent) setDeleteStudentId(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [deleteStudentId, deletingStudent]);

  useEffect(() => {
    if (officerActivityId) fetchOfficerPositions();
    else setOfficerPositions([]);
  }, [officerActivityId, fetchOfficerPositions]);

  useEffect(() => {
    if (user?.role === 'ADMIN') fetchStudentsForOfficers();
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
    setCompareIds([]);
  }, [activityFilter]);

  useEffect(() => {
    if (!activityFilter) return;
    fetchStudents();
  }, [
    activityFilter,
    listSection,
    listYear,
    listSkill,
    listInterestOnly,
    listSort,
    listSortDir,
    adminAccountStatusFilter,
    fetchStudents,
  ]);

  useEffect(() => {
    if (activityFilter) {
      browseFilterBootRef.current = true;
      return;
    }
    if (browseFilterBootRef.current) {
      browseFilterBootRef.current = false;
      return;
    }
    const t = setTimeout(() => fetchStudents(), 320);
    return () => clearTimeout(t);
  }, [browseSkill, browseCourse, adminAccountStatusFilter, activityFilter, fetchStudents]);

  const openFullProfile = async (student) => {
    setFullProfile({ student, payload: null, loading: true });
    setError('');
    try {
      const res = await fetch(`/api/students/${student.id}/full-profile`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setFullProfile({ student, payload: data.data, loading: false });
      else {
        setError(data.message || 'Failed to load profile');
        setFullProfile(null);
      }
    } catch {
      setError('Failed to load profile');
      setFullProfile(null);
    }
  };

  const fetchClassListRoster = useCallback(async () => {
    setClassListLoading(true);
    try {
      const params = new URLSearchParams();
      if (user.role === 'ADMIN' && adminAccountStatusFilter !== 'all') {
        params.set('account_status', adminAccountStatusFilter);
      }

      const res = await fetch(`/api/students/class-list?${params}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        setClassListRoster(data.data);
      } else {
        setClassListRoster([]);
      }
    } catch {
      setClassListRoster([]);
    } finally {
      setClassListLoading(false);
    }
  }, [user.role, adminAccountStatusFilter]);

  useEffect(() => {
    if (profilingMainView !== 'class_lists') return;
    fetchClassListRoster();
  }, [profilingMainView, classListRefreshKey, fetchClassListRoster]);

  useEffect(() => {
    if (profilingMainView !== 'class_lists') return;
    setClassListFolderLevel('program');
    setClassListCourse(null);
    setClassListYear(null);
    setClassListSection(null);
    setClassListIrregularSubYear(null);
  }, [profilingMainView]);

  const classListYearTree = useMemo(() => buildClassListTreeByYear(classListRoster), [classListRoster]);

  useEffect(() => {
    setClassListSearchInput('');
    setClassListSearchQuery('');
  }, [classListCourse, classListYear, classListSection, classListIrregularSubYear, classListFolderLevel]);

  const fetchRankAudit = async () => {
    if (!activityFilter) return;
    setAuditLoading(true);
    try {
      const res = await fetch(`/api/activities/${activityFilter}/rank-overrides`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (data.success) setAuditRows(data.data || []);
      else setAuditRows([]);
    } catch {
      setAuditRows([]);
    } finally {
      setAuditLoading(false);
    }
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  };

  const submitRankOverride = async (e) => {
    e.preventDefault();
    if (!overrideModal || !activityFilter) return;
    setSavingOverride(true);
    setError('');
    try {
      const body = {
        user_id: overrideModal.student.id,
        type: overrideModal.mode,
        reason: overrideReason.trim() || null,
      };
      if (overrideModal.mode === 'boost') {
        body.boost_points = Math.min(500, Math.max(1, parseInt(String(overrideBoostPoints), 10) || 150));
      }
      const res = await fetch(`/api/activities/${activityFilter}/rank-overrides`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        setOverrideModal(null);
        setOverrideReason('');
        setOverrideBoostPoints(150);
        fetchStudents();
      } else setError(data.message || 'Failed to save override');
    } catch {
      setError('Request failed');
    } finally {
      setSavingOverride(false);
    }
  };

  const clearRankOverride = async (userId) => {
    if (!activityFilter || !userId) return;
    try {
      const res = await fetch(`/api/activities/${activityFilter}/rank-overrides/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (data.success) fetchStudents();
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const role = user?.role;
    if (!token || role !== 'ADMIN') {
      navigate('/login');
      return;
    }
    Promise.all([fetchStudents(), fetchActivities()]).finally(() => setLoading(false));
    if (role === 'ADMIN') {
      fetchPendingEntries();
      fetchActivitiesForAdmin();
    }
  }, [navigate, user?.role, fetchStudents, fetchActivities, fetchPendingEntries, fetchActivitiesForAdmin]);

  const topPerformerEntries = useMemo(
    () => performersRoster.map((s) => buildTopPerformerEntry(s)).filter(Boolean),
    [performersRoster],
  );

  const filteredTopPerformerEntries = useMemo(() => {
    if (topPerformerCategory === 'all') return topPerformerEntries;
    return topPerformerEntries.filter((e) => e[topPerformerCategory]);
  }, [topPerformerEntries, topPerformerCategory]);

  useEffect(() => {
    if (!isTalentDirectory || talentDirectoryView !== 'top_performers') return undefined;
    let cancelled = false;
    setPerformersLoading(true);
    const params = new URLSearchParams();
    params.set('include_officers', '1');
    params.set('per_page', '500');
    if (user.role === 'ADMIN' && adminAccountStatusFilter !== 'all') {
      params.set('account_status', adminAccountStatusFilter);
    }
    (async () => {
      try {
        const res = await fetch(`/api/students?${params}`, { headers: getAuthHeaders() });
        const data = await res.json();
        if (!cancelled && data.success) setPerformersRoster(data.data?.data || []);
        else if (!cancelled) setPerformersRoster([]);
      } catch {
        if (!cancelled) setPerformersRoster([]);
      } finally {
        if (!cancelled) setPerformersLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isTalentDirectory, talentDirectoryView, user.role, adminAccountStatusFilter]);

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
    setActivityForm(
      activity
        ? {
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
            required_skills: Array.isArray(c.required_skills)
              ? c.required_skills.map((s) =>
                  typeof s === 'string'
                    ? { skill: s, min_proficiency: 'Intermediate' }
                    : { skill: s.skill || s.name || '', min_proficiency: s.min_proficiency || 'Intermediate' },
                )
              : [],
            conflicting_activity_ids: Array.isArray(c.conflicting_activity_ids) ? c.conflicting_activity_ids : [],
            exclude_major_grave: !((c.no_major_grave === false) || !!c.permit_major_grave_violations),
            allow_probationary_and_hold: !!c.allow_probationary_and_hold,
            max_minor_violations: c.max_minor_violations ?? '',
            require_preferred_position: !!c.require_preferred_position,
            allowed_positions_text: Array.isArray(c.allowed_positions) ? c.allowed_positions.join(', ') : '',
            skip_schedule_conflict: !!c.skip_schedule_conflict,
            bonus_skills: Array.isArray(c.bonus_skills)
              ? c.bonus_skills.map((s) =>
                  typeof s === 'string'
                    ? { skill: s, min_proficiency: 'Intermediate' }
                    : { skill: s.skill || s.name || '', min_proficiency: s.min_proficiency || 'Intermediate' },
                )
              : [],
          }
        : {
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
            exclude_major_grave: true,
            allow_probationary_and_hold: false,
            max_minor_violations: '',
            require_preferred_position: false,
            allowed_positions_text: '',
            skip_schedule_conflict: false,
          },
    );
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
        ...(activityForm.required_skills?.length > 0 && {
          required_skills: activityForm.required_skills
            .filter((s) => s.skill?.trim())
            .map((s) => ({ skill: s.skill.trim(), min_proficiency: s.min_proficiency || 'Intermediate' })),
        }),
        ...(activityForm.conflicting_activity_ids?.length > 0 && { conflicting_activity_ids: activityForm.conflicting_activity_ids }),
        ...(activityForm.exclude_major_grave && { no_major_grave: true }),
        ...(!activityForm.exclude_major_grave && { permit_major_grave_violations: true }),
        ...(activityForm.allow_probationary_and_hold && { allow_probationary_and_hold: true }),
        ...(activityForm.max_minor_violations !== '' && { max_minor_violations: parseInt(activityForm.max_minor_violations, 10) }),
        ...(activityForm.require_preferred_position && { require_preferred_position: true }),
        ...(activityForm.require_preferred_position &&
          activityForm.allowed_positions_text?.trim() && {
            allowed_positions: activityForm.allowed_positions_text.split(',').map((s) => s.trim()).filter(Boolean),
          }),
        ...(activityForm.skip_schedule_conflict && { skip_schedule_conflict: true }),
        ...(activityForm.bonus_skills?.length > 0 && {
          bonus_skills: activityForm.bonus_skills
            .filter((s) => s.skill?.trim())
            .map((s) => ({ skill: s.skill.trim(), min_proficiency: s.min_proficiency || 'Intermediate' })),
        }),
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
    } catch {
      setError('Request failed');
    } finally {
      setSavingActivity(false);
    }
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
    } catch {
      setError('Request failed');
    } finally {
      setDeletingActivity(false);
    }
  };

  const openAssignActivityModal = (student) => {
    setError('');
    setAssignActivityStudent(student);
    const pool = activities.filter((a) => a.is_active !== false);
    const pick = pool.find((a) => !isEnrolled(student, a.id));
    setAssignActivityId(String(pick?.id ?? pool[0]?.id ?? ''));
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

  const openEnrollConfirm = (student, activity) => {
    if (!activity) return;
    setError('');
    setEnrollConfirm({ student, activity });
  };

  const executeEnroll = async () => {
    if (!enrollConfirm) return;
    const { student, activity } = enrollConfirm;
    setEnrolling(student.id);
    try {
      const res = await fetch('/api/students/enroll', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ student_id: student.id, activity_id: activity.id }),
      });
      const data = await res.json();
      if (data.success) {
        setEnrollConfirm(null);
        fetchStudents();
        fetchActivities();
        if (user?.role === 'ADMIN') fetchActivitiesForAdmin();
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
    student.enrollments?.some((e) => Number(e.activity_id) === Number(activityId));

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

  const openEditProfile = useCallback((student) => {
    const p = student.student_profile || {};
    setEditProfileStudent(student);
    setProfileForm({
      photo_url: p.photo_url ?? '',
      height_cm: p.height_cm ?? '',
      weight_kg: p.weight_kg ?? '',
      course: mapLegacyCourseToSelect(p.course) || '',
      year_level: p.year_level ?? '',
      academic_semester: p.academic_semester != null ? Number(p.academic_semester) : 1,
      current_gpa: p.current_gpa ?? '',
      academic_standing: p.academic_standing ?? '',
      section: mapLegacySectionToSelect(p.section) || '',
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
  }, []);

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
        course: profileForm.course || null,
        year_level: profileForm.year_level || null,
        academic_semester:
          profileForm.academic_semester === '' || profileForm.academic_semester == null
            ? null
            : parseInt(String(profileForm.academic_semester), 10),
        current_gpa: profileForm.current_gpa !== '' ? parseFloat(profileForm.current_gpa) : null,
        academic_standing: profileForm.academic_standing || null,
        section: profileForm.section || null,
        failed_units: profileForm.failed_units !== '' ? parseInt(profileForm.failed_units, 10) : null,
        incomplete_grades: profileForm.incomplete_grades !== '' ? parseInt(profileForm.incomplete_grades, 10) : null,
        enrolled_units: profileForm.enrolled_units !== '' ? parseInt(profileForm.enrolled_units, 10) : null,
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
        setClassListRefreshKey((k) => k + 1);
      } else {
        setError(data.message || 'Failed to save profile');
      }
    } catch (err) {
      setError('Request failed');
    } finally {
      setSavingProfile(false);
    }
  };

  useEffect(() => {
    const uid = location.state?.openEditForUserId;
    if (uid == null) {
      processedOpenEditForClassListRef.current = null;
      return;
    }
    if (profilingMainView !== 'class_lists') return;

    const key = String(uid);
    if (processedOpenEditForClassListRef.current === key) return;

    const fromRoster = classListRoster.find((s) => Number(s.id) === Number(uid));
    if (fromRoster) {
      processedOpenEditForClassListRef.current = key;
      openEditProfile(fromRoster);
      navigate(location.pathname, { replace: true, state: {} });
      return;
    }

    if (classListLoading) return;

    let cancelled = false;
    processedOpenEditForClassListRef.current = key;
    (async () => {
      try {
        const res = await fetch(`/api/students/${uid}/full-profile`, { headers: getAuthHeaders() });
        const json = await res.json();
        if (cancelled) return;
        if (!json.success) {
          processedOpenEditForClassListRef.current = null;
          return;
        }
        const d = json.data;
        openEditProfile({
          id: d.id,
          name: d.name,
          email: d.email,
          student_number: d.student_number,
          student_profile: d.student_profile,
        });
        navigate(location.pathname, { replace: true, state: {} });
      } catch {
        processedOpenEditForClassListRef.current = null;
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    location.state,
    profilingMainView,
    classListRoster,
    classListLoading,
    openEditProfile,
    navigate,
    location.pathname,
  ]);

  if (!user?.role) return null;

  return (
    <div className={`student-profiling-dashboard${isTalentDirectory ? ' student-profiling-dashboard--talent' : ''}`}>
      {profilingMainView !== 'class_lists' && (
        <header className="ccs-gradient-hero ccs-gradient-hero--compact spd-page-hero">
          <div className="ccs-gradient-hero-pattern" aria-hidden />
          <div className="ccs-gradient-hero-inner">
            <h1 className="ccs-gradient-hero-title">
              {location.pathname.includes('talent-directory') ? 'Talent Directory' : 'Student Profiling Dashboard'}
            </h1>
            {location.pathname.includes('talent-directory') && (
              <p className="ccs-gradient-hero-subtitle spd-talent-hero-sub">
                Start with a category (quizzes, sports, performances, tech), pick the exact activity, then review ranked students—or browse everyone below.
              </p>
            )}
          </div>
        </header>
      )}

      {error && (
        <div className="spd-error" role="alert">
          {error}
        </div>
      )}

      {profilingMainView === 'browse' && (
      <>
      <div className="spd-talent-main-tabs" role="tablist" aria-label="Talent directory views">
        <button
          type="button"
          role="tab"
          aria-selected={talentDirectoryView === 'all_students'}
          className={talentDirectoryView === 'all_students' ? 'spd-talent-main-tab spd-talent-main-tab--active' : 'spd-talent-main-tab'}
          onClick={() => setTalentDirectoryView('all_students')}
        >
          All Students
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={talentDirectoryView === 'top_performers'}
          className={talentDirectoryView === 'top_performers' ? 'spd-talent-main-tab spd-talent-main-tab--active' : 'spd-talent-main-tab'}
          onClick={() => setTalentDirectoryView('top_performers')}
        >
          Top Performers
        </button>
      </div>

      {talentDirectoryView === 'top_performers' && (
        <div className="spd-tp-wrap">
          <p className="spd-tp-intro spd-muted">
            Students are highlighted from profile data: high GPA (3.5+), sports skills or athletic activity enrollments, or performance and arts signals.
            Strength shown is the primary match (Academic first, then Athletic, then Talented).
          </p>
          <div className="spd-tp-filters" role="group" aria-label="Filter by category">
            {[
              { id: 'all', label: 'All' },
              { id: 'academic', label: 'Academic' },
              { id: 'athletic', label: 'Athletic' },
              { id: 'talented', label: 'Talented' },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                className={topPerformerCategory === f.id ? 'spd-tp-filter-chip spd-tp-filter-chip--active' : 'spd-tp-filter-chip'}
                onClick={() => setTopPerformerCategory(f.id)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {performersLoading ? (
            <div className="spd-loading">Loading top performers…</div>
          ) : filteredTopPerformerEntries.length === 0 ? (
            <p className="spd-tp-empty">No students match this category with the current rules.</p>
          ) : (
            <ul className="spd-tp-grid">
              {filteredTopPerformerEntries.map((entry) => {
                const { student, primary, recommendedActivity } = entry;
                const p = student.student_profile || {};
                const strengthLabel = primary === 'academic' ? 'Academic' : primary === 'athletic' ? 'Athletic' : 'Talented';
                return (
                  <li key={student.id} className="spd-tp-card">
                    <div className="spd-tp-card-top">
                      <QualifiedStudentAvatar name={student.name} photoUrl={p.photo_url} />
                      <div className="spd-tp-card-text">
                        <h3 className="spd-tp-card-name">{student.name}</h3>
                        <p className="spd-tp-card-meta">
                          {[p.course || '—', p.year_level || '—'].join(' · ')}
                        </p>
                      </div>
                    </div>
                    <div className="spd-tp-badges">
                      <span className={`spd-tp-strength spd-tp-strength--${primary}`}>{strengthLabel}</span>
                      <span className="spd-tp-rec">Recommended: {recommendedActivity}</span>
                    </div>
                    <button
                      type="button"
                      className="spd-tp-view-profile"
                      onClick={() => navigate(`/admin-dashboard/profiling/student/${student.id}`)}
                    >
                      View Profile
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {talentDirectoryView === 'all_students' && (
      <>
      <div className="spd-talent-shell">
        <p className="spd-talent-flow-intro">
          <strong>Step 1 — What are you looking for?</strong> Choose a category, then tap the specific quiz, sport, or event.
          {activityFilter ? ' You are viewing the ranked list for one activity.' : ' Or browse everyone without picking an activity.'}
        </p>
        <div className="spd-talent-cat-row" role="group" aria-label="Browse or choose activity category">
          <button
            type="button"
            className={`spd-talent-cat-pill ${!activityFilter && talentCategoryId == null ? 'spd-talent-cat-pill--active' : ''}`}
            onClick={goBrowseEveryoneTalent}
          >
            Browse everyone
          </button>
          {TALENT_DIRECTORY_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`spd-talent-cat-pill ${isTalentCategoryPillActive(cat.id) ? 'spd-talent-cat-pill--active' : ''}`}
              onClick={() => pickTalentCategory(cat.id)}
              title={cat.hint}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {talentCategoryId && !activityFilter && (
          <div className="spd-talent-step2">
            <div className="spd-talent-step2-head">
              <p className="spd-talent-step2-title">
                <strong>Step 2 — Pick an activity</strong>
                {talentCategoryMeta ? (
                  <span className="spd-talent-step2-sub">{talentCategoryMeta.hint}</span>
                ) : null}
              </p>
              <button type="button" className="spd-talent-step2-back" onClick={goBrowseEveryoneTalent}>
                Start over
              </button>
            </div>
            {activitiesInTalentCategory.length === 0 ? (
              <p className="spd-talent-step2-empty">
                No activities in this category yet. Admins can add spelling bees, sports, clubs, and more under <em>Manage activities</em> below—use
                names like “Quiz”, “Spelling Bee”, or pick type <strong>Sport</strong> for tryouts.
              </p>
            ) : (
              <>
                <div className="spd-talent-act-chips" role="listbox" aria-label="Activities in this category">
                  {activitiesInTalentCategory.map((a) => (
                    <button key={a.id} type="button" className="spd-talent-act-chip" onClick={() => pickTalentActivity(a.id)}>
                      {a.name}
                    </button>
                  ))}
                </div>
                <label className="spd-talent-select-fallback-label" htmlFor="spd-activity-filter-fallback">
                  Or choose from the list
                </label>
                <select
                  id="spd-activity-filter-fallback"
                  value=""
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v) pickTalentActivity(v);
                  }}
                  className="spd-talent-select spd-talent-select--full"
                >
                  <option value="">Select activity…</option>
                  {activitiesInTalentCategory.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </>
            )}
          </div>
        )}

        {activityFilter && (
          <div className="spd-talent-active-activity">
            <span className="spd-talent-active-label">Showing ranked list for</span>
            <strong className="spd-talent-active-name">
              {activeActivities.find((x) => String(x.id) === String(activityFilter))?.name || 'this activity'}
            </strong>
            <button
              type="button"
              className="spd-talent-change-activity"
              onClick={() => {
                flushSync(() => {
                  setActivityFilter('');
                  resetQualifiedListFilters();
                });
                fetchStudents();
              }}
            >
              Pick a different activity
            </button>
          </div>
        )}

        <div className="spd-talent-row spd-talent-row--primary">
          <div className="spd-talent-search">
            <svg className="spd-talent-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, student number, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
              className="spd-talent-search-input"
              aria-label="Search students"
            />
          </div>
          <button type="button" className="spd-talent-search-submit" onClick={fetchStudents}>
            Search
          </button>
          {compareIds.length >= 2 && (
            <button type="button" className="spd-search-btn" onClick={() => setCompareModalOpen(true)}>
              Compare ({compareIds.length})
            </button>
          )}
        </div>
        {user.role === 'ADMIN' && (
          <div className="spd-admin-account-filter" role="group" aria-label="Portal account activation">
            <span className="spd-admin-account-filter-label">Portal accounts</span>
            <button
              type="button"
              className={`spd-admin-account-filter-btn${adminAccountStatusFilter === 'all' ? ' is-active' : ''}`}
              onClick={() => setAdminAccountStatusFilter('all')}
            >
              All
            </button>
            <button
              type="button"
              className={`spd-admin-account-filter-btn${adminAccountStatusFilter === 'active' ? ' is-active' : ''}`}
              onClick={() => setAdminAccountStatusFilter('active')}
            >
              Activated
            </button>
            <button
              type="button"
              className={`spd-admin-account-filter-btn${adminAccountStatusFilter === 'inactive' ? ' is-active' : ''}`}
              onClick={() => setAdminAccountStatusFilter('inactive')}
            >
              Not activated
            </button>
          </div>
        )}
        {!activityFilter && talentCategoryId == null && (
          <details className="spd-talent-more-filters">
            <summary className="spd-talent-more-filters-summary">Refine the card list (skill, course)</summary>
            <div className="spd-talent-row spd-talent-row--filters">
              <div className="spd-talent-filter-field">
                <label htmlFor="spd-browse-skill">Skill or talent</label>
                <input
                  id="spd-browse-skill"
                  type="text"
                  placeholder="e.g. Programming, Python, Dance…"
                  value={browseSkill}
                  onChange={(e) => setBrowseSkill(e.target.value)}
                  aria-label="Filter by skill or talent"
                  className="spd-talent-filter-input"
                />
              </div>
              <div className="spd-talent-filter-field spd-talent-filter-field--narrow">
                <label htmlFor="spd-browse-course">Course</label>
                <input
                  id="spd-browse-course"
                  type="text"
                  placeholder="BSCS, BSIT…"
                  value={browseCourse}
                  onChange={(e) => setBrowseCourse(e.target.value)}
                  aria-label="Filter by course"
                  className="spd-talent-filter-input"
                />
              </div>
              <div className="spd-talent-quick">
                <span className="spd-talent-quick-label">Quick tags</span>
                <button type="button" className="spd-talent-chip" onClick={() => setBrowseSkill('Programming')}>
                  Programming
                </button>
                <button type="button" className="spd-talent-chip" onClick={() => setBrowseSkill('Basketball')}>
                  Basketball
                </button>
                <button type="button" className="spd-talent-chip" onClick={() => setBrowseSkill('Dance')}>
                  Dance
                </button>
                <button
                  type="button"
                  className="spd-talent-chip spd-talent-chip--ghost"
                  onClick={() => {
                    setBrowseSkill('');
                    setBrowseCourse('');
                  }}
                >
                  Clear
                </button>
              </div>
            </div>
          </details>
        )}
      </div>

      {isTalentDirectory && !activityFilter && user?.role === 'ADMIN' && (
        <>
          <details className="spd-talent-activity-manage">
            <summary className="spd-talent-activity-manage-summary">Manage activities &amp; events (admin)</summary>
            <p className="spd-officer-desc spd-talent-activity-manage-desc">
              Add quiz bees, sports, clubs, and events. They appear in Assign to activity and on each student&apos;s profile under Affiliations.
            </p>
            <div className="spd-activity-setup-toolbar">
              <button type="button" className="spd-talent-search-submit" onClick={() => openActivitySetup()}>
                Add activity
              </button>
            </div>
            <div className="spd-table-wrap">
              <table className="spd-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Type</th>
                    <th>Slots</th>
                    <th>Roster / Waitlist</th>
                    <th>Criteria summary</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activitiesForAdmin.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="spd-empty">
                        No activities. Add one to get started.
                      </td>
                    </tr>
                  ) : (
                    activitiesForAdmin.map((a) => (
                      <tr key={a.id}>
                        <td>
                          <strong>{a.name}</strong>
                          {!a.is_active && <span className="spd-muted"> (inactive)</span>}
                        </td>
                        <td>{a.type}</td>
                        <td>
                          {a.max_enrollees != null ? `${a.max_enrollees} max` : '—'}
                          {a.reserve_slots > 0 ? `, ${a.reserve_slots} waitlist` : ''}
                        </td>
                        <td>
                          {(a.enrollment_counts?.roster ?? a.enrollment_counts?.active ?? 0)} /{' '}
                          {(a.enrollment_counts?.waitlist ?? 0)}
                        </td>
                        <td className="spd-criteria-summary spd-criteria-summary-wrap">{activityCriteriaSummary(a)}</td>
                        <td>
                          <button type="button" className="spd-edit-profile-btn" onClick={() => openActivitySetup(a)}>
                            Edit
                          </button>
                          <button type="button" className="spd-officer-remove" onClick={() => handleDeleteActivity(a.id)}>
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </details>
          <ConfirmModal
            open={!!confirmDeleteActivityId}
            title="Delete activity"
            message="Delete this activity? All enrollments for it will be removed. This cannot be undone."
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="danger"
            loading={deletingActivity}
            onConfirm={handleConfirmDeleteActivity}
            onCancel={() => !deletingActivity && setConfirmDeleteActivityId(null)}
          />
        </>
      )}

      {activityFilter && (
        <div className="spd-phase4-toolbar">
          <input
            type="text"
            className="spd-phase4-input"
            placeholder="Section"
            value={listSection}
            onChange={(e) => setListSection(e.target.value)}
            aria-label="Filter by section"
          />
          <input
            type="text"
            className="spd-phase4-input"
            placeholder="Year level"
            value={listYear}
            onChange={(e) => setListYear(e.target.value)}
            aria-label="Filter by year level"
          />
          <input
            type="text"
            className="spd-phase4-input spd-phase4-skill"
            placeholder="Skill contains…"
            value={listSkill}
            onChange={(e) => setListSkill(e.target.value)}
            aria-label="Filter by skill name"
          />
          <label className="spd-phase4-check">
            <input type="checkbox" checked={listInterestOnly} onChange={(e) => setListInterestOnly(e.target.checked)} />
            Interest only
          </label>
          <select className="spd-filter-select spd-phase4-sort" value={listSort} onChange={(e) => setListSort(e.target.value)} aria-label="Sort by">
            <option value="score">Sort: Qualification score</option>
            <option value="gpa">Sort: GPA</option>
            <option value="name">Sort: Name</option>
          </select>
          <select className="spd-filter-select spd-phase4-sort" value={listSortDir} onChange={(e) => setListSortDir(e.target.value)} aria-label="Sort direction">
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
          {compareIds.length >= 2 && (
            <button type="button" className="spd-search-btn" onClick={() => setCompareModalOpen(true)}>
              Compare ({compareIds.length})
            </button>
          )}
          {user.role === 'ADMIN' && (
            <button
              type="button"
              className="spd-edit-profile-btn"
              onClick={() => {
                setAuditModalOpen(true);
                fetchRankAudit();
              }}
            >
              Rank override log
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="spd-loading">Loading students...</div>
      ) : activityFilter ? (
        <div className="spd-qualified-wrap">
          <h2 className="spd-qualified-title">Qualified student list</h2>
          <p className="spd-qualified-desc">
            Ranked candidates for <strong>{activities.find((a) => String(a.id) === String(activityFilter))?.name || 'this activity'}</strong>.
            Scores use GPA, skills, declared interest, participation history, commendations, and sport fit (when applicable).
          </p>
          {students.length === 0 ? (
            <div className="spd-qualified-empty">No qualified students match your search. Adjust filters or criteria.</div>
          ) : (
            <ul className="spd-qualified-cards">
              {students.map((student) => {
                const q = student.qualification_detail || {};
                const p = student.student_profile;
                const fid = Number(activityFilter);
                const enrolledHere = isEnrolled(student, fid);
                const stars = typeof q.stars === 'number' ? q.stars : 0;
                const pct = q.score_percent != null ? Number(q.score_percent) : null;
                return (
                  <li key={student.id} className="spd-qualified-card">
                    <div className="spd-q-card-toolbar">
                      <label className="spd-q-compare-label">
                        <input
                          type="checkbox"
                          checked={compareIds.includes(student.id)}
                          onChange={() => toggleCompare(student.id)}
                        />
                        Compare
                      </label>
                      <button type="button" className="spd-edit-profile-btn" onClick={() => openFullProfile(student)}>
                        View full profile
                      </button>
                    </div>
                    <div className="spd-qualified-card-top">
                      <div className="spd-q-avatar-wrap">
                        <QualifiedStudentAvatar name={student.name} photoUrl={p?.photo_url} />
                      </div>
                      <div className="spd-q-main">
                        <div className="spd-q-name-row">
                          <h3 className="spd-q-name">{student.name}</h3>
                          {user.role === 'ADMIN' && (
                            <span
                              className={`spd-account-status-pill${isPortalAccountActivated(student) ? ' spd-account-status-pill--active' : ' spd-account-status-pill--inactive'}`}
                            >
                              {isPortalAccountActivated(student) ? 'Activated' : 'Not activated'}
                            </span>
                          )}
                          <span className={`spd-q-interest ${q.declared_interest ? 'yes' : 'no'}`}>
                            {q.declared_interest ? 'Expressed interest' : 'No interest declared'}
                          </span>
                        </div>
                        <p className="spd-q-meta">
                          {student.student_number && <span className="spd-q-meta-item">#{student.student_number}</span>}
                          {p?.year_level && <span className="spd-q-meta-item">Year {p.year_level}</span>}
                          {p?.section && <span className="spd-q-meta-item">Sec. {p.section}</span>}
                          {p?.course && <span className="spd-q-meta-item">{p.course}</span>}
                        </p>
                        <div className="spd-q-academic">
                          {p?.current_gpa != null && (
                            <span className="spd-q-gpa">GPA {Number(p.current_gpa).toFixed(2)}</span>
                          )}
                          {p?.academic_standing && (
                            <span className="spd-q-standing">{p.academic_standing}</span>
                          )}
                        </div>
                      </div>
                      <div className="spd-q-score-block" title={`Raw score ${q.score_raw ?? '—'} / max ${q.score_max ?? '—'}`}>
                        <div className="spd-q-pct">{pct != null ? `${pct}%` : '—'}</div>
                        <div className="spd-q-stars" aria-label={`${stars} of 5 stars`}>
                          {[1, 2, 3, 4, 5].map((i) => (
                            <span key={i} className={i <= stars ? 'spd-star spd-star-on' : 'spd-star'}>{i <= stars ? '★' : '☆'}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    {Array.isArray(q.matched_skills) && q.matched_skills.length > 0 && (
                      <div className="spd-q-skills">
                        <span className="spd-q-label">Matched skills</span>
                        <div className="spd-q-skill-tags">
                          {q.matched_skills.map((m, i) => (
                            <span key={i} className={`spd-q-skill-tag ${m.match_type === 'bonus' ? 'bonus' : 'req'}`}>
                              {m.skill}
                              {m.proficiency_level ? ` · ${m.proficiency_level}` : ''}
                              <em className="spd-q-skill-tier">{m.match_type === 'bonus' ? 'bonus' : 'required'}</em>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {Array.isArray(q.flags) && q.flags.length > 0 && (
                      <ul className="spd-q-flags">
                        {q.flags.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                    {q.rank_override?.type === 'boost' && (
                      <div className="spd-q-admin-boost">
                        <strong>Admin rank boost</strong>
                        {' '}
                        (+{q.rank_override.boost_points} pts)
                        {q.rank_override.reason && (
                          <span className="spd-muted spd-q-boost-reason"> — {q.rank_override.reason}</span>
                        )}
                        {user.role === 'ADMIN' && (
                          <button type="button" className="spd-officer-remove spd-q-clear-boost" onClick={() => clearRankOverride(student.id)}>
                            Remove boost
                          </button>
                        )}
                      </div>
                    )}
                    <div className="spd-q-actions">
                      {user.role === 'ADMIN' && (
                        <>
                          <button type="button" className="spd-edit-profile-btn" onClick={() => openEntriesModal(student)}>Entries</button>
                          <button type="button" className="spd-edit-profile-btn" onClick={() => openSkillsModal(student)}>Skills</button>
                          <button type="button" className="spd-edit-profile-btn" onClick={() => openConductModal(student)}>Conduct</button>
                        </>
                      )}
                      {user.role === 'ADMIN' && (
                        <>
                          <button type="button" className="spd-edit-profile-btn" onClick={() => openEditProfile(student)}>Edit profile</button>
                          <button
                            type="button"
                            className="spd-officer-remove"
                            onClick={() => { setOverrideModal({ student, mode: 'exclude' }); setOverrideReason(''); }}
                          >
                            Exclude from list
                          </button>
                          <button
                            type="button"
                            className="spd-edit-profile-btn"
                            onClick={() => { setOverrideModal({ student, mode: 'boost' }); setOverrideReason(''); setOverrideBoostPoints(150); }}
                          >
                            Boost rank
                          </button>
                        </>
                      )}
                      <button
                        type="button"
                        className={`spd-enroll-btn spd-q-enroll ${enrolledHere ? 'enrolled' : ''} ${enrollmentStatusForActivity(student, fid) === 'pending_confirmation' ? 'spd-enroll-pending' : ''}`}
                        disabled={enrolledHere || enrolling === student.id}
                        onClick={() => openEnrollConfirm(student, activities.find((a) => a.id === fid))}
                      >
                        {enrolledHere
                          ? enrollmentButtonLabel(student, fid, activities.find((a) => a.id === fid)?.name || 'activity')
                          : `Enroll in ${activities.find((a) => a.id === fid)?.name || 'activity'}`}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="spd-talent-cards-wrap">
          {students.length === 0 ? (
            <p className="spd-talent-empty">No students match your search or filters.</p>
          ) : (
            <ul className="spd-talent-cards">
              {students.map((student) => {
                const p = student.student_profile || {};
                const skills = student.skill_entries || [];
                const enrollTags = browseEnrollmentDisplayEntries(student);
                const hasTalentCol = skills.length > 0 || enrollTags.length > 0;
                const sectionDisp = (() => {
                  const f = formatClassSectionLabel(p);
                  if (f && f !== '—') return f;
                  return p.section || '—';
                })();
                return (
                  <li key={student.id} className="spd-talent-card">
                    <div className="spd-talent-card-top">
                      <QualifiedStudentAvatar name={student.name} photoUrl={p.photo_url} />
                      <div className="spd-talent-card-text">
                        <div className="spd-talent-card-name-row">
                          <h3 className="spd-talent-card-name">{student.name}</h3>
                          {user.role === 'ADMIN' && (
                            <span
                              className={`spd-account-status-pill${isPortalAccountActivated(student) ? ' spd-account-status-pill--active' : ' spd-account-status-pill--inactive'}`}
                            >
                              {isPortalAccountActivated(student) ? 'Activated' : 'Not activated'}
                            </span>
                          )}
                        </div>
                        <p className="spd-talent-card-line">
                          {[
                            student.student_number ? `#${student.student_number}` : '—',
                            p.course || '—',
                            p.year_level || '—',
                            sectionDisp,
                          ].join(' · ')}
                        </p>
                      </div>
                      <div className="spd-talent-card-actions">
                        <label className="spd-q-compare-label">
                          <input
                            type="checkbox"
                            checked={compareIds.includes(student.id)}
                            onChange={() => toggleCompare(student.id)}
                          />
                          Compare
                        </label>
                        {user.role === 'ADMIN' && isTalentDirectory && !activityFilter && (
                          <button
                            type="button"
                            className="spd-talent-assign-btn"
                            onClick={() => openAssignActivityModal(student)}
                          >
                            Assign to activity
                          </button>
                        )}
                        <button
                          type="button"
                          className="spd-talent-view-profile"
                          onClick={() => navigate(`/admin-dashboard/profiling/student/${student.id}`)}
                        >
                          View Profile
                        </button>
                      </div>
                    </div>
                    <div className="spd-talent-card-skills">
                      {!hasTalentCol ? (
                        <span className="spd-talent-no-skills">No skills or activity enrollments on file</span>
                      ) : (
                        <>
                          {enrollTags.map((en) => (
                            <span
                              key={en.key}
                              className={enrollmentTagClass(en.name, browseSkill)}
                              title={en.status}
                            >
                              {en.name}
                              {enrollmentStatusSuffix(en.status)}
                            </span>
                          ))}
                          {skills.map((s) => (
                            <span key={s.id} className={browseSkillTagClass(s.skill, browseSkill)}>
                              {s.skill}
                              {s.proficiency_level ? ` · ${s.proficiency_level}` : ''}
                            </span>
                          ))}
                        </>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      </>
      )}

      </>
      )}

      {profilingMainView === 'class_lists' && (() => {
        const sectionKeys = [...SECTION_LETTERS, 'Unassigned', 'Other'];
        const sectionLabel = (s) => (s === 'Unassigned' ? 'No section' : s === 'Other' ? 'Other' : `Section ${s}`);
        const listForRoster =
          classListCourse && classListYear === 'Irregulars' && classListIrregularSubYear != null
            ? classListYearTree[classListCourse]?.Irregulars?.[classListIrregularSubYear] || []
            : classListCourse && classListYear && classListYear !== 'Irregulars' && classListSection != null
              ? classListYearTree[classListCourse]?.[classListYear]?.[classListSection] || []
              : [];
        const classListSearchNeedle = classListSearchQuery.trim().toLowerCase();
        const filteredListForRoster = classListSearchNeedle
          ? listForRoster.filter((student) => {
              const name = String(student.name || '').toLowerCase();
              const sn = String(student.student_number || '').toLowerCase();
              return name.includes(classListSearchNeedle) || sn.includes(classListSearchNeedle);
            })
          : listForRoster;
        const classListSearchActive = classListSearchNeedle.length > 0;
        const overCap = listForRoster.length > SECTION_CAPACITY;
        const extraYearKeys =
          classListCourse != null
            ? ['Unassigned', '5th yr', 'Other'].filter(
                (yk) => countStudentsInClassListYear(classListYearTree, classListCourse, yk) > 0,
              )
            : [];
        const yearKeysToShow = [...CLASS_LIST_YEAR_FOLDER_KEYS, ...extraYearKeys];
        const extraIrregularSubYearKeys =
          classListCourse != null
            ? ['Unassigned', '5th yr', 'Other'].filter(
                (sk) => countStudentsInIrregularSubYear(classListYearTree, classListCourse, sk) > 0,
              )
            : [];
        const irregularSubYearKeysToShow = [...CLASS_LIST_IRREGULAR_SUBYEAR_KEYS, ...extraIrregularSubYearKeys];

        const handleClassListBack = () => {
          if (classListFolderLevel === 'roster') {
            if (classListYear === 'Irregulars') {
              setClassListIrregularSubYear(null);
              setClassListFolderLevel('irregular_year');
            } else {
              setClassListFolderLevel('section');
              setClassListSection(null);
            }
          } else if (classListFolderLevel === 'irregular_year') {
            setClassListFolderLevel('year');
            setClassListYear(null);
          } else if (classListFolderLevel === 'section') {
            setClassListFolderLevel('year');
            setClassListYear(null);
          } else if (classListFolderLevel === 'year') {
            setClassListFolderLevel('program');
            setClassListCourse(null);
          }
        };

        return (
          <div className="spd-class-lists-view spd-class-lists-view--folders">
            {user.role === 'ADMIN' && classListFolderLevel === 'program' && (
              <div className="spd-admin-account-filter spd-admin-account-filter--class-list" role="group" aria-label="Portal account activation">
                <span className="spd-admin-account-filter-label">Portal accounts</span>
                <button
                  type="button"
                  className={`spd-admin-account-filter-btn${adminAccountStatusFilter === 'all' ? ' is-active' : ''}`}
                  onClick={() => setAdminAccountStatusFilter('all')}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`spd-admin-account-filter-btn${adminAccountStatusFilter === 'active' ? ' is-active' : ''}`}
                  onClick={() => setAdminAccountStatusFilter('active')}
                >
                  Activated
                </button>
                <button
                  type="button"
                  className={`spd-admin-account-filter-btn${adminAccountStatusFilter === 'inactive' ? ' is-active' : ''}`}
                  onClick={() => setAdminAccountStatusFilter('inactive')}
                >
                  Not activated
                </button>
              </div>
            )}
            {classListFolderLevel !== 'program' && (
              <div className="spd-folder-back-row">
                <button type="button" className="spd-folder-back" onClick={handleClassListBack}>
                  ← Back
                </button>
              </div>
            )}

            {classListLoading && classListFolderLevel === 'program' ? (
              <div className="spd-loading">Loading class lists…</div>
            ) : null}

            {classListFolderLevel === 'program' && !classListLoading && (
              <div className="spd-folder-grid" role="navigation" aria-label="Programs">
                {['BSCS', 'BSIT'].map((c) => {
                  const total = countStudentsInClassListCourse(classListYearTree, c);
                  return (
                    <button
                      key={c}
                      type="button"
                      className="spd-folder-card"
                      onClick={() => {
                        setClassListCourse(c);
                        setClassListFolderLevel('year');
                      }}
                    >
                      <ClassListFolderIcon className="spd-folder-icon" />
                      <span className="spd-folder-card-title">{c}</span>
                      <span className="spd-folder-card-count">
                        {total} student{total === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {classListFolderLevel === 'year' && classListCourse && (
              <div className="spd-folder-grid" role="navigation" aria-label="Year levels">
                {yearKeysToShow.map((yk) => {
                  const n = countStudentsInClassListYear(classListYearTree, classListCourse, yk);
                  return (
                    <button
                      key={yk}
                      type="button"
                      className="spd-folder-card"
                      onClick={() => {
                        setClassListYear(yk);
                        setClassListSection(null);
                        setClassListIrregularSubYear(null);
                        setClassListFolderLevel(yk === 'Irregulars' ? 'irregular_year' : 'section');
                      }}
                    >
                      <ClassListFolderIcon className="spd-folder-icon" />
                      <span className="spd-folder-card-title">{CLASS_LIST_YEAR_FOLDER_LABELS[yk] || yk}</span>
                      <span className="spd-folder-card-count">
                        {n} student{n === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {classListFolderLevel === 'irregular_year' && classListCourse && classListYear === 'Irregulars' && (
              <div className="spd-folder-grid" role="navigation" aria-label="Irregular students by year level">
                {irregularSubYearKeysToShow.map((sk) => {
                  const n = countStudentsInIrregularSubYear(classListYearTree, classListCourse, sk);
                  return (
                    <button
                      key={sk}
                      type="button"
                      className="spd-folder-card"
                      onClick={() => {
                        setClassListIrregularSubYear(sk);
                        setClassListFolderLevel('roster');
                      }}
                    >
                      <ClassListFolderIcon className="spd-folder-icon" />
                      <span className="spd-folder-card-title">{CLASS_LIST_YEAR_FOLDER_LABELS[sk] || sk}</span>
                      <span className="spd-folder-card-count">
                        {n} student{n === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {classListFolderLevel === 'section' && classListCourse && classListYear && classListYear !== 'Irregulars' && (
              <div className="spd-folder-grid" role="navigation" aria-label="Sections">
                {sectionKeys.map((s) => {
                  const n = (classListYearTree[classListCourse]?.[classListYear]?.[s] || []).length;
                  if ((s === 'Unassigned' || s === 'Other') && n === 0) return null;
                  return (
                    <button
                      key={s}
                      type="button"
                      className="spd-folder-card"
                      onClick={() => {
                        setClassListSection(s);
                        setClassListFolderLevel('roster');
                      }}
                    >
                      <ClassListFolderIcon className="spd-folder-icon" />
                      <span className="spd-folder-card-title">{sectionLabel(s)}</span>
                      <span className="spd-folder-card-count">
                        {n} student{n === 1 ? '' : 's'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}

            {classListFolderLevel === 'roster' &&
              classListCourse &&
              classListYear &&
              ((classListYear === 'Irregulars' && classListIrregularSubYear != null) ||
                (classListYear !== 'Irregulars' && classListSection != null)) && (
              <>
                <div className="spd-class-lists-searchbar">
                  <div className="spd-talent-search">
                    <svg className="spd-talent-search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="11" cy="11" r="7" />
                      <path d="m20 20-3.5-3.5" />
                    </svg>
                    <input
                      type="search"
                      placeholder="Search by name or student number..."
                      value={classListSearchInput}
                      onChange={(e) => setClassListSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') setClassListSearchQuery(classListSearchInput.trim());
                      }}
                      className="spd-talent-search-input"
                      aria-label="Search class list students"
                    />
                  </div>
                  <button type="button" className="spd-talent-search-submit" onClick={() => setClassListSearchQuery(classListSearchInput.trim())}>
                    Search
                  </button>
                  {classListSearchActive && (
                    <button
                      type="button"
                      className="spd-admin-account-filter-btn"
                      onClick={() => {
                        setClassListSearchInput('');
                        setClassListSearchQuery('');
                      }}
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="spd-class-lists-meta">
                  {classListLoading ? (
                    <span className="spd-muted">Loading roster…</span>
                  ) : (
                    <>
                      <strong>{filteredListForRoster.length}</strong>
                      {classListSearchActive && (
                        <span className="spd-muted"> of {listForRoster.length}</span>
                      )}
                      {classListYear === 'Irregulars' && classListIrregularSubYear != null ? (
                        <>
                          {' '}
                          irregular in {CLASS_LIST_YEAR_FOLDER_LABELS[classListIrregularSubYear] || classListIrregularSubYear}{' '}
                          · {classListCourse} · Irregulars
                        </>
                      ) : (
                        <>
                          {' '}
                          in {sectionLabel(classListSection)} · {classListCourse} ·{' '}
                          {CLASS_LIST_YEAR_FOLDER_LABELS[classListYear] || classListYear}
                        </>
                      )}
                      <span className={overCap ? 'spd-class-lists-cap spd-class-lists-cap--over' : 'spd-class-lists-cap'}>
                        {' '}
                        · {SECTION_CAPACITY} typical max
                        {overCap ? ' (over typical capacity)' : ''}
                      </span>
                    </>
                  )}
                </div>
                {classListLoading ? (
                  <div className="spd-loading">Loading class list…</div>
                ) : filteredListForRoster.length === 0 ? (
                  <p className="spd-qualified-empty">
                    {classListSearchActive ? (
                      <>No students matched your search in this class list.</>
                    ) : classListYear === 'Irregulars' && classListIrregularSubYear != null ? (
                      <>
                        No irregular students in {CLASS_LIST_YEAR_FOLDER_LABELS[classListIrregularSubYear] || classListIrregularSubYear}{' '}
                        for {classListCourse}.
                      </>
                    ) : (
                      <>
                        No students in {sectionLabel(classListSection)} for{' '}
                        {CLASS_LIST_YEAR_FOLDER_LABELS[classListYear] || classListYear}, {classListCourse}.
                      </>
                    )}
                  </p>
                ) : (
                  <ul className="spd-class-lists-cards">
                    {filteredListForRoster.map((student) => {
                      const p = student.student_profile || {};
                      const skills = student.skill_entries || [];
                      return (
                        <li key={student.id} className="spd-class-lists-card">
                          <div className="spd-class-lists-card-head">
                            <QualifiedStudentAvatar name={student.name} photoUrl={p.photo_url} />
                            <div className="spd-class-lists-card-info">
                              <div className="spd-class-lists-card-name-row">
                                <h3 className="spd-class-lists-card-name">{student.name}</h3>
                                {user.role === 'ADMIN' && (
                                  <span
                                    className={`spd-account-status-pill${isPortalAccountActivated(student) ? ' spd-account-status-pill--active' : ' spd-account-status-pill--inactive'}`}
                                  >
                                    {isPortalAccountActivated(student) ? 'Activated' : 'Not activated'}
                                  </span>
                                )}
                              </div>
                              <p className="spd-class-lists-card-meta">{student.email}</p>
                              <p className="spd-class-lists-card-meta">
                                #{student.student_number || '—'}
                                {p.year_level ? ` · ${p.year_level}` : ''}
                                {p.course ? ` · ${p.course}` : ''}
                              </p>
                              {p.academic_standing && (
                                <span
                                  className={`spd-class-lists-standing spd-class-lists-standing--${String(p.academic_standing).toLowerCase()}`}
                                >
                                  {p.academic_standing}
                                </span>
                              )}
                            </div>
                          </div>
                          {skills.length > 0 ? (
                            <div className="spd-class-lists-card-skills">
                              {skills.slice(0, 6).map((sk) => (
                                <span key={sk.id} className="spd-tag">
                                  {sk.skill}
                                  {sk.proficiency_level ? ` · ${sk.proficiency_level}` : ''}
                                </span>
                              ))}
                              {skills.length > 6 ? <span className="spd-muted">+{skills.length - 6} more</span> : null}
                            </div>
                          ) : null}
                          <div className="spd-class-lists-card-actions">
                            <button
                              type="button"
                              className="spd-edit-profile-btn"
                              onClick={() => navigate(`/admin-dashboard/profiling/student/${student.id}`)}
                            >
                              View Profile
                            </button>
                            {user.role === 'ADMIN' && (
                              <button type="button" className="spd-officer-remove" onClick={() => setDeleteStudentId(student.id)}>
                                Delete
                              </button>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </>
            )}
          </div>
        );
      })()}

      {deleteStudentId != null && (
        <div
          className="spd-student-delete-overlay"
          role="presentation"
          onClick={() => !deletingStudent && setDeleteStudentId(null)}
        >
          <div
            className="spd-student-delete-dialog"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="spd-student-delete-title"
            aria-describedby="spd-student-delete-desc"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="spd-student-delete-title" className="spd-student-delete-title">
              Reminder
            </h3>
            <p id="spd-student-delete-desc" className="spd-student-delete-message">
              Are you sure you want to delete this student? This action cannot be undone.
            </p>
            <div className="spd-student-delete-actions">
              <button
                type="button"
                className="spd-student-delete-btn spd-student-delete-btn--secondary"
                onClick={() => !deletingStudent && setDeleteStudentId(null)}
                disabled={deletingStudent}
              >
                Cancel
              </button>
              <button
                type="button"
                className="spd-student-delete-btn spd-student-delete-btn--delete"
                onClick={() => confirmDeleteStudent()}
                disabled={deletingStudent}
              >
                {deletingStudent ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {studentDeleteSuccessToast && (
        <div className="spd-student-delete-toast" role="status" aria-live="polite">
          <span className="spd-student-delete-toast-text">Student deleted successfully!</span>
        </div>
      )}

      {profilingMainView === 'browse' && (
      <>
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
      </>
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
                        {user.role === 'ADMIN' && (
                          <>
                            <button type="button" className="spd-enroll-btn" onClick={() => handleEndorseSkill(entry.id)}>Endorse</button>
                            <button type="button" className="spd-officer-remove" onClick={() => handleDisputeSkill(entry.id)}>Dispute</button>
                            <button type="button" className="spd-officer-remove" onClick={async () => {
                              try {
                                const res = await fetch(`/api/skill-entries/${entry.id}`, { method: 'DELETE', headers: getAuthHeaders() });
                                if (res.ok && skillsModalStudent) fetchStudentSkills(skillsModalStudent.id);
                              } catch (err) {}
                            }}>Delete</button>
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
                        {user.role === 'ADMIN' && (
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
              <p className="spd-muted spd-modal-admin-hint">
                Personal details (photo, physical data, interests, notes) are maintained by the student. You can update academic and placement fields below.
              </p>
              <fieldset className="spd-modal-fieldset">
                <legend>Academic data</legend>
                <div className="spd-modal-row">
                  <label>Course / Program</label>
                  {editProfileStudent.student_profile?.course &&
                  !['BSCS', 'BSIT'].includes(String(editProfileStudent.student_profile.course)) &&
                  !mapLegacyCourseToSelect(editProfileStudent.student_profile.course) ? (
                    <p className="spd-muted spd-modal-legacy-hint">
                      Stored program: <strong>{editProfileStudent.student_profile.course}</strong>. Choose BSCS or BSIT below to align with class lists.
                    </p>
                  ) : null}
                  <select value={profileForm.course} onChange={(e) => handleProfileFormChange('course', e.target.value)}>
                    <option value="">— Select —</option>
                    {COURSE_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="spd-modal-row">
                  <label>Year level</label>
                  <select value={profileForm.year_level} onChange={(e) => handleProfileFormChange('year_level', e.target.value)}>
                    <option value="">—</option>
                    {YEAR_LEVEL_OPTIONS.map((y) => (
                      <option key={y} value={y}>
                        {y}
                      </option>
                    ))}
                    {profileForm.year_level && !YEAR_LEVEL_OPTIONS.includes(profileForm.year_level) ? (
                      <option value={profileForm.year_level}>{profileForm.year_level} (current)</option>
                    ) : null}
                  </select>
                </div>
                <div className="spd-modal-row">
                  <label>Academic semester (BSCS CCS Courses)</label>
                  <select
                    value={profileForm.academic_semester}
                    onChange={(e) => handleProfileFormChange('academic_semester', parseInt(e.target.value, 10))}
                  >
                    {ACADEMIC_SEMESTER_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="spd-modal-row">
                  <label>Section (A–E)</label>
                  <select value={profileForm.section} onChange={(e) => handleProfileFormChange('section', e.target.value)}>
                    <option value="">—</option>
                    {SECTION_LETTERS.map((s) => (
                      <option key={s} value={s}>
                        Section {s}
                      </option>
                    ))}
                  </select>
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
                    <option value="On hold">On hold</option>
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

      {fullProfile && (
        <div className="spd-modal-overlay" onClick={() => setFullProfile(null)}>
          <div className="spd-modal spd-modal-full-profile" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Full profile — {fullProfile.student?.name}</h3>
              <button type="button" className="spd-modal-close" onClick={() => setFullProfile(null)} aria-label="Close">×</button>
            </div>
            {fullProfile.loading ? (
              <p className="spd-muted spd-fp-loading">Loading…</p>
            ) : (
              <div className="spd-full-profile-body">
                {(() => {
                  const d = fullProfile.payload;
                  const prof = d?.student_profile;
                  const na = d?.non_academic_entries || [];
                  const sk = d?.skill_entries || [];
                  const cd = d?.conduct_entries || [];
                  const enr = d?.enrollments || [];
                  const intr = d?.interest_declarations || [];
                  return (
                    <>
                      <section className="spd-fp-section">
                        <h4>Academic & identity</h4>
                        <ul className="spd-fp-dl">
                          <li><span>Email</span>{d?.email}</li>
                          <li><span>Student #</span>{d?.student_number || '—'}</li>
                          <li><span>Course</span>{prof?.course || '—'}</li>
                          <li><span>Year / Section</span>{[prof?.year_level, prof?.section].filter(Boolean).join(' · ') || '—'}</li>
                          <li><span>GPA</span>{prof?.current_gpa != null ? Number(prof.current_gpa).toFixed(2) : '—'}</li>
                          <li><span>Standing</span>{prof?.academic_standing || '—'}</li>
                        </ul>
                      </section>
                      <section className="spd-fp-section">
                        <h4>Skill portfolio</h4>
                        {sk.length === 0 ? <p className="spd-muted">None.</p> : (
                          <ul className="spd-fp-list">
                            {sk.map((s) => (
                              <li key={s.id}><strong>{s.skill}</strong>{s.proficiency_level ? ` — ${s.proficiency_level}` : ''}</li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section className="spd-fp-section">
                        <h4>Conduct history</h4>
                        {cd.length === 0 ? <p className="spd-muted">None.</p> : (
                          <ul className="spd-fp-list">
                            {cd.map((c) => (
                              <li key={c.id}>
                                <span className="spd-fp-badge">{c.type}{c.severity ? ` · ${c.severity}` : ''}</span>
                                {' '}{c.title} <span className="spd-muted">({c.recorded_at})</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section className="spd-fp-section">
                        <h4>Achievements & non-academic</h4>
                        {na.length === 0 ? <p className="spd-muted">None.</p> : (
                          <ul className="spd-fp-list">
                            {na.map((e) => (
                              <li key={e.id}>
                                <span className="spd-fp-badge">{typeLabels[e.type] || e.type} · {e.status}</span>
                                {' '}{e.title}
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section className="spd-fp-section">
                        <h4>Activity enrollments</h4>
                        {enr.length === 0 ? <p className="spd-muted">None.</p> : (
                          <ul className="spd-fp-list">
                            {enr.map((e) => (
                              <li key={e.id}>{e.activity?.name || `Activity #${e.activity_id}`} — <em>{e.status}</em></li>
                            ))}
                          </ul>
                        )}
                      </section>
                      <section className="spd-fp-section">
                        <h4>Declared interests</h4>
                        {intr.length === 0 ? <p className="spd-muted">None.</p> : (
                          <ul className="spd-fp-list">
                            {intr.map((i) => (
                              <li key={i.id}>{i.activity?.name || `Activity #${i.activity_id}`}</li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        </div>
      )}

      {assignActivityStudent && (
        <div
          className="spd-modal-overlay"
          onClick={() => setAssignActivityStudent(null)}
          role="presentation"
        >
          <div className="spd-modal spd-modal-assign-activity" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="spd-assign-activity-title">
            <div className="spd-modal-header">
              <h3 id="spd-assign-activity-title">Assign to activity</h3>
              <button
                type="button"
                className="spd-modal-close"
                onClick={() => setAssignActivityStudent(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="spd-modal-form">
              <p className="spd-muted" style={{ margin: '0 0 1rem' }}>
                Select an activity or sport for <strong>{assignActivityStudent.name}</strong>. You will confirm roster slots on the next step.
              </p>
              <div className="spd-modal-row">
                <label htmlFor="spd-assign-activity-select">Activity</label>
                <select
                  id="spd-assign-activity-select"
                  value={assignActivityId}
                  onChange={(e) => setAssignActivityId(e.target.value)}
                  className="spd-filter-select"
                  style={{ width: '100%', maxWidth: '100%' }}
                >
                  {activities
                    .filter((a) => a.is_active !== false)
                    .map((a) => {
                      const enrolled = isEnrolled(assignActivityStudent, a.id);
                      return (
                        <option key={a.id} value={a.id} disabled={enrolled}>
                          {a.name}
                          {enrolled ? ' (already enrolled)' : ''}
                        </option>
                      );
                    })}
                </select>
              </div>
              <div className="spd-modal-actions">
                <button type="button" className="spd-modal-cancel" onClick={() => setAssignActivityStudent(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="spd-search-btn"
                  disabled={
                    !assignActivityId || isEnrolled(assignActivityStudent, Number(assignActivityId))
                  }
                  onClick={() => {
                    const act = activities.find((a) => String(a.id) === String(assignActivityId));
                    if (!act || isEnrolled(assignActivityStudent, act.id)) return;
                    const stu = assignActivityStudent;
                    setAssignActivityStudent(null);
                    openEnrollConfirm(stu, act);
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activitySetupOpen && activityForm && (
        <div
          className="spd-modal-overlay"
          onClick={() => {
            setActivitySetupOpen(false);
            setActivityForm(null);
          }}
          role="presentation"
        >
          <div className="spd-modal spd-modal-activity-setup" onClick={(e) => e.stopPropagation()} role="dialog" aria-labelledby="spd-activity-setup-title">
            <div className="spd-modal-header">
              <h3 id="spd-activity-setup-title">{activityForm.id ? 'Edit activity' : 'Add activity'}</h3>
              <button
                type="button"
                className="spd-modal-close"
                onClick={() => {
                  setActivitySetupOpen(false);
                  setActivityForm(null);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleSaveActivity} className="spd-modal-form">
              <fieldset className="spd-modal-fieldset">
                <legend>Basic</legend>
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-name">Name</label>
                  <input
                    id="spd-act-name"
                    value={activityForm.name}
                    onChange={(e) => setActivityForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="e.g. Basketball"
                    required
                  />
                </div>
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-type">Type</label>
                  <select
                    id="spd-act-type"
                    value={activityForm.type}
                    onChange={(e) => setActivityForm((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="sport">Sport</option>
                    <option value="activity">Activity</option>
                    <option value="event">Event</option>
                  </select>
                </div>
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-desc">Description (optional)</label>
                  <textarea
                    id="spd-act-desc"
                    value={activityForm.description}
                    onChange={(e) => setActivityForm((f) => ({ ...f, description: e.target.value }))}
                    rows={2}
                  />
                </div>
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-slot">Time slot (optional)</label>
                  <input
                    id="spd-act-slot"
                    value={activityForm.time_slot}
                    onChange={(e) => setActivityForm((f) => ({ ...f, time_slot: e.target.value }))}
                    placeholder="e.g. MWF 3–5PM — same text on two activities = schedule conflict"
                  />
                </div>
                <p className="spd-muted spd-activity-hint">
                  If set, students already enrolled in another activity with the same time slot (exact match, case-insensitive) are excluded unless you disable the check below.
                </p>
                <label className="spd-modal-row-inline">
                  <input
                    type="checkbox"
                    checked={activityForm.skip_schedule_conflict}
                    onChange={(e) => setActivityForm((f) => ({ ...f, skip_schedule_conflict: e.target.checked }))}
                  />
                  Skip schedule conflict check (ignore time slot overlap rule)
                </label>
                <label className="spd-modal-row-inline">
                  <input
                    type="checkbox"
                    checked={activityForm.is_active}
                    onChange={(e) => setActivityForm((f) => ({ ...f, is_active: e.target.checked }))}
                  />
                  Active
                </label>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Slot configuration</legend>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label htmlFor="spd-act-max">Max enrollees</label>
                    <input
                      id="spd-act-max"
                      type="number"
                      min="0"
                      value={activityForm.max_enrollees}
                      onChange={(e) => setActivityForm((f) => ({ ...f, max_enrollees: e.target.value }))}
                      placeholder="Unlimited"
                    />
                  </div>
                  <div>
                    <label htmlFor="spd-act-reserve">Reserve / waitlist slots</label>
                    <input
                      id="spd-act-reserve"
                      type="number"
                      min="0"
                      value={activityForm.reserve_slots}
                      onChange={(e) => setActivityForm((f) => ({ ...f, reserve_slots: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Academic requirements</legend>
                <p className="spd-muted spd-activity-hint">
                  By default, students with <strong>Probationary</strong> or <strong>On hold</strong> standing are excluded. Check below to allow them.
                </p>
                <label className="spd-modal-row-inline">
                  <input
                    type="checkbox"
                    checked={activityForm.allow_probationary_and_hold}
                    onChange={(e) => setActivityForm((f) => ({ ...f, allow_probationary_and_hold: e.target.checked }))}
                  />
                  Allow Probationary / On-hold students
                </label>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label htmlFor="spd-act-mingpa">Min GPA</label>
                    <input
                      id="spd-act-mingpa"
                      type="number"
                      step="0.01"
                      min="0"
                      max="5"
                      value={activityForm.min_gpa}
                      onChange={(e) => setActivityForm((f) => ({ ...f, min_gpa: e.target.value }))}
                      placeholder="e.g. 2.5"
                    />
                  </div>
                  <div>
                    <label htmlFor="spd-act-fail">Max failed units</label>
                    <input
                      id="spd-act-fail"
                      type="number"
                      min="0"
                      value={activityForm.max_failed_units}
                      onChange={(e) => setActivityForm((f) => ({ ...f, max_failed_units: e.target.value }))}
                      placeholder="e.g. 2"
                    />
                  </div>
                </div>
                <div className="spd-modal-row">
                  <span className="spd-modal-legend">Academic standing (leave empty = any)</span>
                  <div className="spd-modal-checkgroup">
                    {['Regular', 'Irregular', 'Probationary', 'On hold'].map((standing) => (
                      <label key={standing}>
                        <input
                          type="checkbox"
                          checked={activityForm.academic_standings.includes(standing)}
                          onChange={(e) =>
                            setActivityForm((f) => ({
                              ...f,
                              academic_standings: e.target.checked
                                ? [...(f.academic_standings || []), standing]
                                : (f.academic_standings || []).filter((s) => s !== standing),
                            }))
                          }
                        />
                        {standing}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="spd-modal-row spd-modal-row-inline">
                  <div>
                    <label htmlFor="spd-act-yrmin">Year level min</label>
                    <input
                      id="spd-act-yrmin"
                      type="number"
                      min="1"
                      value={activityForm.year_level_min}
                      onChange={(e) => setActivityForm((f) => ({ ...f, year_level_min: e.target.value }))}
                      placeholder="e.g. 2"
                    />
                  </div>
                  <div>
                    <label htmlFor="spd-act-units">Enrolled units min (full-time)</label>
                    <input
                      id="spd-act-units"
                      type="number"
                      min="0"
                      value={activityForm.enrolled_units_min}
                      onChange={(e) => setActivityForm((f) => ({ ...f, enrolled_units_min: e.target.value }))}
                      placeholder="e.g. 12"
                    />
                  </div>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Physical (sports)</legend>
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-height">Min height (cm)</label>
                  <input
                    id="spd-act-height"
                    type="number"
                    step="0.01"
                    min="0"
                    value={activityForm.min_height_cm}
                    onChange={(e) => setActivityForm((f) => ({ ...f, min_height_cm: e.target.value }))}
                    placeholder="e.g. 173"
                  />
                </div>
                <label className="spd-modal-row-inline">
                  <input
                    type="checkbox"
                    checked={activityForm.require_preferred_position}
                    onChange={(e) => setActivityForm((f) => ({ ...f, require_preferred_position: e.target.checked }))}
                  />
                  Require preferred position on profile
                </label>
                {activityForm.require_preferred_position && (
                  <div className="spd-modal-row">
                    <label htmlFor="spd-act-pos">Allowed positions (optional — comma-separated; leave empty for any)</label>
                    <input
                      id="spd-act-pos"
                      value={activityForm.allowed_positions_text}
                      onChange={(e) => setActivityForm((f) => ({ ...f, allowed_positions_text: e.target.value }))}
                      placeholder="e.g. Point Guard, Center"
                    />
                  </div>
                )}
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-conflict">Conflicting activities (cannot be enrolled in both)</label>
                  <select
                    id="spd-act-conflict"
                    multiple
                    value={activityForm.conflicting_activity_ids.map(String)}
                    onChange={(e) =>
                      setActivityForm((f) => ({
                        ...f,
                        conflicting_activity_ids: Array.from(e.target.selectedOptions, (o) => Number(o.value)),
                      }))
                    }
                    className="spd-modal-multi"
                  >
                    {activitiesForAdmin
                      .filter((a) => a.id !== activityForm.id)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name}
                        </option>
                      ))}
                  </select>
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Conduct</legend>
                <label className="spd-modal-row-inline">
                  <input
                    type="checkbox"
                    checked={activityForm.exclude_major_grave}
                    onChange={(e) => setActivityForm((f) => ({ ...f, exclude_major_grave: e.target.checked }))}
                  />
                  Exclude students with Major or Grave violations
                </label>
                <p className="spd-muted spd-activity-hint">Uncheck only if this activity may enroll students with active Major/Grave conduct records.</p>
                <div className="spd-modal-row">
                  <label htmlFor="spd-act-minor">Max minor violations allowed</label>
                  <input
                    id="spd-act-minor"
                    type="number"
                    min="0"
                    value={activityForm.max_minor_violations}
                    onChange={(e) => setActivityForm((f) => ({ ...f, max_minor_violations: e.target.value }))}
                    placeholder="e.g. 1"
                  />
                </div>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Skills (e.g. programming contests)</legend>
                <p className="spd-muted">Required: student must have at least one skill matching (skill name + min proficiency).</p>
                {activityForm.required_skills.map((s, i) => (
                  <div key={i} className="spd-modal-row spd-modal-row-inline">
                    <input
                      placeholder="Skill name"
                      value={s.skill}
                      onChange={(e) =>
                        setActivityForm((f) => ({
                          ...f,
                          required_skills: f.required_skills.map((r, j) => (j === i ? { ...r, skill: e.target.value } : r)),
                        }))
                      }
                    />
                    <select
                      value={s.min_proficiency}
                      onChange={(e) =>
                        setActivityForm((f) => ({
                          ...f,
                          required_skills: f.required_skills.map((r, j) =>
                            j === i ? { ...r, min_proficiency: e.target.value } : r,
                          ),
                        }))
                      }
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                    <button
                      type="button"
                      className="spd-officer-remove"
                      onClick={() =>
                        setActivityForm((f) => ({ ...f, required_skills: f.required_skills.filter((_, j) => j !== i) }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="spd-edit-profile-btn"
                  onClick={() =>
                    setActivityForm((f) => ({
                      ...f,
                      required_skills: [...(f.required_skills || []), { skill: '', min_proficiency: 'Intermediate' }],
                    }))
                  }
                >
                  + Add required skill
                </button>
              </fieldset>
              <fieldset className="spd-modal-fieldset">
                <legend>Bonus skills (ranking)</legend>
                <p className="spd-muted">
                  Not required to qualify. Rank score also uses GPA, declared interest, past activities, awards, commendations, and (for sports) height/position fit.
                </p>
                {activityForm.bonus_skills.map((s, i) => (
                  <div key={i} className="spd-modal-row spd-modal-row-inline">
                    <input
                      placeholder="Skill name"
                      value={s.skill}
                      onChange={(e) =>
                        setActivityForm((f) => ({
                          ...f,
                          bonus_skills: f.bonus_skills.map((r, j) => (j === i ? { ...r, skill: e.target.value } : r)),
                        }))
                      }
                    />
                    <select
                      value={s.min_proficiency}
                      onChange={(e) =>
                        setActivityForm((f) => ({
                          ...f,
                          bonus_skills: f.bonus_skills.map((r, j) =>
                            j === i ? { ...r, min_proficiency: e.target.value } : r,
                          ),
                        }))
                      }
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                      <option value="Expert">Expert</option>
                    </select>
                    <button
                      type="button"
                      className="spd-officer-remove"
                      onClick={() =>
                        setActivityForm((f) => ({ ...f, bonus_skills: f.bonus_skills.filter((_, j) => j !== i) }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  className="spd-edit-profile-btn"
                  onClick={() =>
                    setActivityForm((f) => ({
                      ...f,
                      bonus_skills: [...(f.bonus_skills || []), { skill: '', min_proficiency: 'Intermediate' }],
                    }))
                  }
                >
                  + Add bonus skill
                </button>
              </fieldset>
              <div className="spd-modal-actions">
                <button
                  type="button"
                  className="spd-modal-cancel"
                  onClick={() => {
                    setActivitySetupOpen(false);
                    setActivityForm(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="spd-search-btn" disabled={savingActivity}>
                  {savingActivity ? 'Saving…' : 'Save activity'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={!!enrollConfirm}
        title="Confirm enrollment"
        wide
        message={null}
        confirmLabel="Confirm enrollment"
        cancelLabel="Cancel"
        loading={enrolling !== null}
        onConfirm={executeEnroll}
        onCancel={() => !enrolling && setEnrollConfirm(null)}
      >
        {enrollConfirm && (
          <>
            <p className="spd-muted" style={{ margin: '0 0 0.5rem' }}>
              Enroll <strong>{enrollConfirm.student.name}</strong> into{' '}
              <strong>{enrollConfirm.activity.name}</strong>?
            </p>
            <p style={{ margin: '0 0 0.35rem', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--ccs-text-muted)' }}>Why they qualified</p>
            <ul>
              {qualificationSummaryBullets(enrollConfirm.student).map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            <div className="confirm-modal-slot">
              <strong>Slots (before this action)</strong>
              <br />
              {slotSummaryForModal(enrollConfirm.activity)}
              <br />
              <span style={{ fontSize: '0.8125rem' }}>The system will re-check availability when you confirm to avoid double enrollment.</span>
            </div>
          </>
        )}
      </ConfirmModal>

      {compareModalOpen && (
        <div className="spd-modal-overlay" onClick={() => setCompareModalOpen(false)}>
          <div className="spd-modal spd-modal-compare" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Compare students</h3>
              <button type="button" className="spd-modal-close" onClick={() => setCompareModalOpen(false)} aria-label="Close">×</button>
            </div>
            <div className="spd-compare-scroll">
              <table className="spd-compare-table">
                <thead>
                  <tr>
                    <th />
                    {compareIds.map((id) => {
                      const s = students.find((x) => x.id === id);
                      return <th key={id}>{s?.name || `#${id}`}</th>;
                    })}
                  </tr>
                </thead>
                <tbody>
                  {['GPA', 'Standing', 'Year', 'Section', 'Score %', 'Interest', 'Course'].map((label) => (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {compareIds.map((id) => {
                        const s = students.find((x) => x.id === id);
                        const qd = s?.qualification_detail || {};
                        const pr = s?.student_profile;
                        let val = '—';
                        if (label === 'GPA') val = pr?.current_gpa != null ? Number(pr.current_gpa).toFixed(2) : '—';
                        else if (label === 'Standing') val = pr?.academic_standing || '—';
                        else if (label === 'Year') val = pr?.year_level || '—';
                        else if (label === 'Section') val = pr?.section || '—';
                        else if (label === 'Score %') val = qd.score_percent != null ? `${qd.score_percent}%` : '—';
                        else if (label === 'Interest') val = qd.declared_interest ? 'Yes' : 'No';
                        else if (label === 'Course') val = pr?.course || '—';
                        return <td key={id}>{val}</td>;
                      })}
                    </tr>
                  ))}
                  <tr>
                    <th scope="row">Matched skills</th>
                    {compareIds.map((id) => {
                      const s = students.find((x) => x.id === id);
                      const ms = s?.qualification_detail?.matched_skills || [];
                      return (
                        <td key={id}>
                          {ms.length === 0 ? '—' : ms.map((m) => m.skill).join(', ')}
                        </td>
                      );
                    })}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {overrideModal && (
        <div className="spd-modal-overlay" onClick={() => !savingOverride && setOverrideModal(null)}>
          <div className="spd-modal" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>{overrideModal.mode === 'exclude' ? 'Exclude from qualified list' : 'Boost rank'}</h3>
              <button type="button" className="spd-modal-close" onClick={() => !savingOverride && setOverrideModal(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={submitRankOverride} className="spd-modal-form">
              <p className="spd-muted"><strong>{overrideModal.student.name}</strong></p>
              {overrideModal.mode === 'boost' && (
                <div className="spd-modal-row">
                  <label>Boost points (1–500)</label>
                  <input
                    type="number"
                    min={1}
                    max={500}
                    value={overrideBoostPoints}
                    onChange={(e) => setOverrideBoostPoints(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="spd-modal-row">
                <label>Reason (audit trail)</label>
                <textarea
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  rows={3}
                  placeholder="Explain this manual decision…"
                  required
                />
              </div>
              <div className="spd-modal-actions">
                <button type="button" className="spd-modal-cancel" onClick={() => setOverrideModal(null)} disabled={savingOverride}>Cancel</button>
                <button type="submit" className="spd-search-btn" disabled={savingOverride}>{savingOverride ? 'Saving…' : 'Apply'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {auditModalOpen && (
        <div className="spd-modal-overlay" onClick={() => setAuditModalOpen(false)}>
          <div className="spd-modal spd-modal-audit" onClick={(e) => e.stopPropagation()}>
            <div className="spd-modal-header">
              <h3>Rank override log</h3>
              <button type="button" className="spd-modal-close" onClick={() => setAuditModalOpen(false)} aria-label="Close">×</button>
            </div>
            {auditLoading ? (
              <p className="spd-muted">Loading…</p>
            ) : auditRows.length === 0 ? (
              <p className="spd-muted">No overrides recorded for this activity.</p>
            ) : (
              <div className="spd-audit-table-wrap">
                <table className="spd-table">
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Type</th>
                      <th>Boost</th>
                      <th>Reason</th>
                      <th>By</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {auditRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.user?.name} {row.user?.student_number && `(${row.user.student_number})`}</td>
                        <td>{row.type}</td>
                        <td>{row.type === 'boost' ? row.boost_points : '—'}</td>
                        <td className="spd-audit-reason">{row.reason || '—'}</td>
                        <td>{row.created_by_user?.name || '—'}</td>
                        <td>{row.updated_at?.slice?.(0, 19)?.replace('T', ' ') || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
