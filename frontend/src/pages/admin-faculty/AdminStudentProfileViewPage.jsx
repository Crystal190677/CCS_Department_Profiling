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
  { id: 'nonacademic', label: 'Non-Academic History' },
  { id: 'violations', label: 'Violations' },
  { id: 'skills', label: 'Skills' },
  { id: 'affiliations', label: 'Affiliations' },
];

function ProfileAvatar({ name, photoUrl }) {
  const [broken, setBroken] = useState(false);
  if (photoUrl && !broken) {
    return (
      <img src={photoUrl} alt="" className="aspv-avatar-img" onError={() => setBroken(true)} />
    );
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

function DlRow({ label, children }) {
  return (
    <div className="aspv-dl-row">
      <div className="aspv-field-label">{label}</div>
      <div className="aspv-field-value">{children ?? '—'}</div>
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

  const user = useMemo(() => JSON.parse(localStorage.getItem('ccs_user') || '{}'), []);
  const isAdmin = user?.role === 'ADMIN';

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

  useEffect(() => {
    load();
  }, [load]);

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

  const openEditOnClassList = () => {
    navigate('/admin-dashboard/profiling/class-lists', {
      state: { openEditForUserId: Number(studentId) },
    });
  };

  const gpaSemesterRows = useMemo(() => {
    const raw = prof?.gpa_per_semester;
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    return [];
  }, [prof?.gpa_per_semester]);

  return (
    <div className="aspv-page">
      <div className="aspv-toolbar">
        <button type="button" className="aspv-btn aspv-btn--ghost" onClick={goBack}>
          ← Back
        </button>
        <div className="aspv-toolbar-actions">
          {isAdmin && (
            <button type="button" className="aspv-btn aspv-btn--primary" onClick={openEditOnClassList}>
              Edit
            </button>
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
            <ProfileAvatar name={data.name} photoUrl={prof?.photo_url || data.avatar_url} />
            <div className="aspv-header-text">
              <h1 className="aspv-title">{data.name}</h1>
              <p className="aspv-sub">{data.email}</p>
              <p className="aspv-sub">
                #{data.student_number || '—'}
                {data.role ? ` · ${data.role}` : ''}
                {prof?.course ? ` · ${prof.course}` : ''}
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
            {activeTab === 'personal' && (
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
            )}

            {activeTab === 'academic' && (
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
            )}

            {activeTab === 'nonacademic' && (
              <section className="aspv-section" aria-labelledby="aspv-na-heading">
                <h2 id="aspv-na-heading" className="aspv-section-title">
                  Non-Academic History
                </h2>
                {na.length === 0 ? (
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
                {cd.length === 0 ? (
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
              </section>
            )}

            {activeTab === 'affiliations' && (
              <section className="aspv-section" aria-labelledby="aspv-aff-heading">
                <h2 id="aspv-aff-heading" className="aspv-section-title">
                  Affiliations
                </h2>
                <p className="aspv-hint">Activities, declared interests, and sports / org preferences.</p>

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
              </section>
            )}
          </div>
        </>
      )}
    </div>
  );
}
