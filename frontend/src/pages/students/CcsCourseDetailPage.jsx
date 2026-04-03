import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { formatClassSectionLabel } from '../../constants/academicPlacement';
import { getCourseOfferingMeta, getCsCourseFromCatalog } from '../../data/ccsCsCurriculum';
import './CcsCourseDetailPage.css';

const PROFILE_FETCH_ROLES = new Set(['STUDENT', 'OFFICER']);

const TABS = [
  { id: 'classPost', label: 'Class Post' },
  { id: 'assignment', label: 'Assignment' },
  { id: 'quizzesActivities', label: 'Quizzes & Activities' },
  { id: 'todos', label: 'To-Do List' },
  { id: 'onlineClasses', label: 'Online Classes' },
  { id: 'postGrades', label: 'Post Grades' },
];

const EMPTY_WORKSPACE = {
  classPosts: [],
  assignments: [],
  quizzesActivities: [],
  todos: [],
  onlineClasses: [],
  postGrades: [],
};

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

function formatPostType(type) {
  if (!type) return '';
  const t = String(type).toLowerCase();
  if (t === 'announcement') return 'Announcement';
  if (t === 'module') return 'Module';
  if (t === 'activity') return 'Activity';
  return type;
}

function formatKind(kind) {
  if (!kind) return '';
  const k = String(kind).toLowerCase();
  if (k === 'quiz') return 'Quiz';
  if (k === 'activity') return 'Activity';
  if (k === 'assignment') return 'Assignment';
  return kind;
}

function formatDue(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function CcsCourseDetailPage() {
  const { courseCode } = useParams();
  const navigate = useNavigate();
  const course = useMemo(() => getCsCourseFromCatalog(courseCode), [courseCode]);

  const [activeTab, setActiveTab] = useState('classPost');
  const [workspace, setWorkspace] = useState(EMPTY_WORKSPACE);
  const [workspaceLoading, setWorkspaceLoading] = useState(true);
  const [workspaceError, setWorkspaceError] = useState('');
  const [studentProfile, setStudentProfile] = useState(null);

  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('ccs_user') || '{}');
    } catch {
      return {};
    }
  }, []);

  const normalizedCode = useMemo(() => (courseCode ? String(courseCode).toUpperCase() : ''), [courseCode]);
  const offering = useMemo(() => (course ? getCourseOfferingMeta(course.code) : null), [course]);
  const sectionLabel = useMemo(() => formatClassSectionLabel(studentProfile), [studentProfile]);

  const upcomingTodos = useMemo(() => {
    const list = (workspace.todos || []).filter((t) => !t.is_completed);
    list.sort((a, b) => {
      if (!a.due_at && !b.due_at) return 0;
      if (!a.due_at) return 1;
      if (!b.due_at) return -1;
      return new Date(a.due_at) - new Date(b.due_at);
    });
    return list;
  }, [workspace.todos]);

  const fetchWorkspace = useCallback(async () => {
    if (!normalizedCode) return;
    setWorkspaceLoading(true);
    setWorkspaceError('');
    try {
      const res = await fetch(`/api/ccs-courses/${encodeURIComponent(normalizedCode)}/workspace`, {
        headers: getAuthHeaders(),
      });
      const data = await res.json();
      if (!data.success) {
        setWorkspaceError(data.message || 'Could not load course workspace.');
        setWorkspace(EMPTY_WORKSPACE);
        return;
      }
      const d = data.data || {};
      setWorkspace({
        classPosts: Array.isArray(d.classPosts) ? d.classPosts : [],
        assignments: Array.isArray(d.assignments) ? d.assignments : [],
        quizzesActivities: Array.isArray(d.quizzesActivities) ? d.quizzesActivities : [],
        todos: Array.isArray(d.todos) ? d.todos : [],
        onlineClasses: Array.isArray(d.onlineClasses) ? d.onlineClasses : [],
        postGrades: Array.isArray(d.postGrades) ? d.postGrades : [],
      });
    } catch {
      setWorkspaceError('Unable to load workspace. Check your connection.');
      setWorkspace(EMPTY_WORKSPACE);
    } finally {
      setWorkspaceLoading(false);
    }
  }, [normalizedCode]);

  useEffect(() => {
    if (course) fetchWorkspace();
  }, [course, fetchWorkspace]);

  useEffect(() => {
    if (!PROFILE_FETCH_ROLES.has(user?.role)) {
      setStudentProfile(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const token = localStorage.getItem('ccs_token');
        const res = await fetch('/api/student-profile', {
          headers: { Accept: 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
        });
        const data = await res.json();
        if (!cancelled && data.success) setStudentProfile(data.data ?? null);
      } catch {
        if (!cancelled) setStudentProfile(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.role, user?.id]);

  if (!course) {
    return (
      <div className="ccs-course-page">
        <p className="ccs-course-not-found">No course found for &quot;{courseCode || ''}&quot;.</p>
        <button type="button" className="ccs-course-back-link-btn" onClick={() => navigate('/dashboard')}>
          Back to Dashboard
        </button>
      </div>
    );
  }

  const prereqText =
    course.prerequisites && course.prerequisites.length > 0 ? course.prerequisites.join('; ') : 'None';

  return (
    <div className="ccs-course-page ccs-course-page--workspace">
      <header className="ccs-course-hero" aria-labelledby="ccs-course-hero-title">
        <div className="ccs-course-hero-bg" aria-hidden />
        <div className="ccs-course-hero-grid" aria-hidden />
        <div className="ccs-course-hero-noise" aria-hidden />
        <div className="ccs-course-hero-dots" aria-hidden />
        <div className="ccs-course-hero-inner">
          {offering?.classNumber && (
            <span className="ccs-course-hero-classno">Class #{offering.classNumber}</span>
          )}
          <div className="ccs-course-hero-center">
            <h1 id="ccs-course-hero-title" className="ccs-course-hero-title-block">
              <span className="ccs-course-hero-code">{course.code}</span>
              <span className="ccs-course-hero-title-text">{course.title}</span>
            </h1>
            <p className="ccs-course-hero-section">{sectionLabel}</p>
          </div>
          {offering && (
            <div className="ccs-course-hero-columns">
              <div className="ccs-course-hero-col">
                <div className="ccs-course-hero-col-label">Lecture</div>
                <div className="ccs-course-hero-col-name">{offering.lecture.professor}</div>
                <div className="ccs-course-hero-col-time">{offering.lecture.schedule}</div>
              </div>
              <div className="ccs-course-hero-col">
                <div className="ccs-course-hero-col-label">Laboratory</div>
                <div className="ccs-course-hero-col-name">{offering.lab.professor}</div>
                <div className="ccs-course-hero-col-time">{offering.lab.schedule}</div>
              </div>
            </div>
          )}
          <p className="ccs-course-hero-footer-meta">
            <span>{course.units} units</span>
            <span className="ccs-course-hero-footer-dot" aria-hidden>
              ·
            </span>
            <span>Prerequisites: {prereqText}</span>
          </p>
        </div>
      </header>

      <div className="ccs-course-tabs" role="tablist" aria-label="Course sections">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`panel-${tab.id}`}
            className={`ccs-course-tab ${activeTab === tab.id ? 'ccs-course-tab--active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {workspaceError && <p className="ccs-course-workspace-error">{workspaceError}</p>}

      <section
        className="ccs-course-tab-panel ccs-surface-gradient"
        role="tabpanel"
        id="panel-classPost"
        aria-labelledby="tab-classPost"
        hidden={activeTab !== 'classPost'}
      >
        {workspaceLoading ? (
          <p className="ccs-course-panel-muted">Loading…</p>
        ) : workspace.classPosts.length === 0 ? (
          <p className="ccs-course-panel-muted">No class posts yet for this course.</p>
        ) : (
          <ul className="ccs-course-post-list">
            {workspace.classPosts.map((p) => (
              <li key={p.id} className="ccs-course-post-card">
                <div className="ccs-course-post-top">
                  <span className={`ccs-course-pill ccs-course-pill--${String(p.post_type || '').toLowerCase()}`}>
                    {formatPostType(p.post_type)}
                  </span>
                  {p.professor_name && <span className="ccs-course-post-by">{p.professor_name}</span>}
                  {p.created_at && (
                    <time className="ccs-course-post-date" dateTime={p.created_at}>
                      {formatDue(p.created_at)}
                    </time>
                  )}
                </div>
                <h2 className="ccs-course-post-title">{p.title}</h2>
                {p.body && <p className="ccs-course-post-body">{p.body}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="ccs-course-tab-panel ccs-surface-gradient"
        role="tabpanel"
        id="panel-assignment"
        aria-labelledby="tab-assignment"
        hidden={activeTab !== 'assignment'}
      >
        {workspaceLoading ? (
          <p className="ccs-course-panel-muted">Loading…</p>
        ) : workspace.assignments.length === 0 ? (
          <p className="ccs-course-panel-muted">No assignments listed.</p>
        ) : (
          <ul className="ccs-course-assign-list">
            {workspace.assignments.map((a) => (
              <li key={a.id} className="ccs-course-assign-card">
                <div className="ccs-course-assign-head">
                  <span className={`ccs-course-pill ccs-course-pill--${String(a.kind || '').toLowerCase()}`}>
                    {formatKind(a.kind)}
                  </span>
                  {a.due_at && (
                    <span className="ccs-course-assign-due">Due {formatDue(a.due_at)}</span>
                  )}
                </div>
                <h2 className="ccs-course-assign-title">{a.title}</h2>
                {a.description && <p className="ccs-course-assign-desc">{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="ccs-course-tab-panel ccs-surface-gradient"
        role="tabpanel"
        id="panel-quizzesActivities"
        aria-labelledby="tab-quizzesActivities"
        hidden={activeTab !== 'quizzesActivities'}
      >
        {workspaceLoading ? (
          <p className="ccs-course-panel-muted">Loading…</p>
        ) : workspace.quizzesActivities.length === 0 ? (
          <p className="ccs-course-panel-muted">No quizzes or activities listed.</p>
        ) : (
          <ul className="ccs-course-assign-list">
            {workspace.quizzesActivities.map((a) => (
              <li key={a.id} className="ccs-course-assign-card">
                <div className="ccs-course-assign-head">
                  <span className={`ccs-course-pill ccs-course-pill--${String(a.kind || '').toLowerCase()}`}>
                    {formatKind(a.kind)}
                  </span>
                  {a.due_at && (
                    <span className="ccs-course-assign-due">Due {formatDue(a.due_at)}</span>
                  )}
                </div>
                <h2 className="ccs-course-assign-title">{a.title}</h2>
                {a.description && <p className="ccs-course-assign-desc">{a.description}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="ccs-course-tab-panel ccs-surface-gradient"
        role="tabpanel"
        id="panel-todos"
        aria-labelledby="tab-todos"
        hidden={activeTab !== 'todos'}
      >
        {workspaceLoading ? (
          <p className="ccs-course-panel-muted">Loading…</p>
        ) : upcomingTodos.length === 0 ? (
          <p className="ccs-course-panel-muted">No upcoming tasks for this course.</p>
        ) : (
          <ul className="ccs-course-todo-list">
            {upcomingTodos.map((t) => (
              <li key={t.id} className="ccs-course-todo-row">
                <span className="ccs-course-todo-check" aria-hidden>
                  ☐
                </span>
                <div className="ccs-course-todo-main">
                  <span className="ccs-course-todo-title">{t.title}</span>
                  <span className="ccs-course-todo-due">{t.due_at ? `Due ${formatDue(t.due_at)}` : 'No due date'}</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="ccs-course-tab-panel ccs-surface-gradient"
        role="tabpanel"
        id="panel-onlineClasses"
        aria-labelledby="tab-onlineClasses"
        hidden={activeTab !== 'onlineClasses'}
      >
        {workspaceLoading ? (
          <p className="ccs-course-panel-muted">Loading…</p>
        ) : workspace.onlineClasses.length === 0 ? (
          <p className="ccs-course-panel-muted">No online class sessions scheduled.</p>
        ) : (
          <ul className="ccs-course-online-list">
            {workspace.onlineClasses.map((s) => (
              <li key={s.id} className="ccs-course-online-card">
                <div className="ccs-course-online-head">
                  <h2 className="ccs-course-online-title">{s.title}</h2>
                  {s.platform && <span className="ccs-course-online-platform">{s.platform}</span>}
                </div>
                <p className="ccs-course-online-schedule">
                  {s.starts_at && s.ends_at
                    ? `${formatDue(s.starts_at)} – ${formatDue(s.ends_at)}`
                    : s.starts_at
                      ? formatDue(s.starts_at)
                      : '—'}
                </p>
                {s.meeting_url && (
                  <a
                    className="ccs-course-online-link"
                    href={s.meeting_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join session
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        className="ccs-course-tab-panel ccs-surface-gradient"
        role="tabpanel"
        id="panel-postGrades"
        aria-labelledby="tab-postGrades"
        hidden={activeTab !== 'postGrades'}
      >
        {workspaceLoading ? (
          <p className="ccs-course-panel-muted">Loading…</p>
        ) : workspace.postGrades.length === 0 ? (
          <p className="ccs-course-panel-muted">No grades posted yet.</p>
        ) : (
          <div className="ccs-course-scores-wrap">
            <table className="ccs-course-scores-table">
              <thead>
                <tr>
                  <th scope="col">Assessment</th>
                  <th scope="col">Score</th>
                  <th scope="col">Max</th>
                  <th scope="col">Percentage</th>
                  <th scope="col">Graded</th>
                </tr>
              </thead>
              <tbody>
                {workspace.postGrades.map((s) => (
                  <tr key={s.id}>
                    <td>{s.assessment_title}</td>
                    <td>{Number(s.points_earned).toFixed(s.points_earned % 1 ? 2 : 0)}</td>
                    <td>{Number(s.points_max).toFixed(s.points_max % 1 ? 2 : 0)}</td>
                    <td>
                      <strong>{Number(s.percentage).toFixed(1)}%</strong>
                    </td>
                    <td>{s.graded_at || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
