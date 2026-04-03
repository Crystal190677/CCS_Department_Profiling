import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import './MembershipCardListPage.css';

function getAuthHeaders() {
  const token = localStorage.getItem('ccs_token');
  return { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) };
}

const SEGMENT_CONFIG = {
  '1st-year': { listTitle: '1st year', yearLevel: '1st yr' },
  '2nd-year': { listTitle: '2nd year', yearLevel: '2nd yr' },
  '3rd-year': { listTitle: '3rd year', yearLevel: '3rd yr' },
  '4th-year': { listTitle: '4th year', yearLevel: '4th yr' },
};

/** Year-level folders under All Irregulars (same slugs as regular year segments). */
const IRREGULAR_YEAR_FOLDERS = [
  { slug: '1st-year', label: '1st Year' },
  { slug: '2nd-year', label: '2nd Year' },
  { slug: '3rd-year', label: '3rd Year' },
  { slug: '4th-year', label: '4th Year' },
];

const SECTION_FOLDERS = [
  { key: 'a', letter: 'A', label: 'Section A' },
  { key: 'b', letter: 'B', label: 'Section B' },
  { key: 'c', letter: 'C', label: 'Section C' },
  { key: 'd', letter: 'D', label: 'Section D' },
  { key: 'e', letter: 'E', label: 'Section E' },
];

/** January → December for Card availed filter (values 01–12, local month names). */
const CARD_AVAILED_MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => {
  const value = String(i + 1).padStart(2, '0');
  const label = new Date(2000, i, 1).toLocaleDateString(undefined, { month: 'long' });
  return { value, label };
});

function normalizeSectionLetter(sectionKey) {
  if (!sectionKey || typeof sectionKey !== 'string') return null;
  const k = sectionKey.trim().toLowerCase();
  if (/^[a-e]$/.test(k)) return k.toUpperCase();
  const m = /^section-([a-e])$/i.exec(sectionKey.trim());
  if (m) return m[1].toUpperCase();
  return null;
}

function initialsFromName(name) {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function FolderIcon() {
  return (
    <svg className="membership-folder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      <path d="M2 10h20" />
    </svg>
  );
}

function isExactIrregularsHub(pathname) {
  const p = pathname.replace(/\/$/, '') || '/';
  return p === '/dashboard/membership-cards/irregulars';
}

function hasMembershipCardRecorded(p) {
  const t = p?.membership_card_availed_at;
  return t != null && String(t).trim() !== '';
}

function formatAvailedDate(iso) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return String(iso);
  }
}

/** Local calendar month 01–12 for filtering (any year). */
function availedCalendarMonthKey(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return String(d.getMonth() + 1).padStart(2, '0');
}

export default function MembershipCardListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { yearSegment, sectionKey } = useParams();
  const [user, setUser] = useState(null);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [membershipTab, setMembershipTab] = useState('with');
  const [membershipSearch, setMembershipSearch] = useState('');
  /** '01'–'12' calendar month of card availed date (any year), or '' for all months */
  const [membershipMonthKey, setMembershipMonthKey] = useState('');

  const irregularsHub = isExactIrregularsHub(location.pathname);
  const yearConfig = yearSegment && yearSegment !== 'irregulars' ? SEGMENT_CONFIG[yearSegment] : null;

  /** When URL is `/membership-cards/irregulars/:slug` and slug is a year segment (not section letter). */
  const irregularYearSlug = yearSegment === 'irregulars' && sectionKey ? sectionKey : null;
  const irregularYearConfig =
    irregularYearSlug && SEGMENT_CONFIG[irregularYearSlug] ? SEGMENT_CONFIG[irregularYearSlug] : null;

  const sectionLetter =
    yearSegment && yearSegment !== 'irregulars' && sectionKey ? normalizeSectionLetter(sectionKey) : null;

  const viewMode = useMemo(() => {
    if (irregularsHub) return 'irregulars-hub';
    if (yearSegment === 'irregulars') {
      if (sectionKey && irregularYearConfig) return 'irregulars-year-list';
      if (sectionKey) return 'invalid';
      return 'invalid';
    }
    if (!yearConfig) return 'invalid';
    if (sectionKey) {
      return sectionLetter ? 'section-list' : 'invalid';
    }
    return 'year-hub';
  }, [
    irregularsHub,
    yearSegment,
    sectionKey,
    yearConfig,
    sectionLetter,
    irregularYearConfig,
  ]);

  useEffect(() => {
    if (viewMode === 'section-list' || viewMode === 'irregulars-year-list') {
      setMembershipTab('with');
      setMembershipSearch('');
      setMembershipMonthKey('');
    }
  }, [viewMode, yearSegment, sectionKey]);

  const { withCardStudents, withoutCardStudents } = useMemo(() => {
    const w = [];
    const wo = [];
    for (const s of students) {
      const p = s.student_profile || {};
      if (hasMembershipCardRecorded(p)) w.push(s);
      else wo.push(s);
    }
    return { withCardStudents: w, withoutCardStudents: wo };
  }, [students]);

  const displayedStudents = useMemo(() => {
    const base = membershipTab === 'with' ? withCardStudents : withoutCardStudents;
    const q = membershipSearch.trim().toLowerCase();
    let list = base;
    if (q) {
      list = list.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const num = String(s.student_number || '').toLowerCase();
        return name.includes(q) || num.includes(q);
      });
    }
    if (membershipTab === 'with' && membershipMonthKey) {
      list = list.filter(
        (s) => availedCalendarMonthKey(s.student_profile?.membership_card_availed_at) === membershipMonthKey,
      );
    }
    if (membershipTab === 'with') {
      return [...list].sort((a, b) => {
        const ta = new Date(a.student_profile?.membership_card_availed_at || 0).getTime();
        const tb = new Date(b.student_profile?.membership_card_availed_at || 0).getTime();
        return tb - ta;
      });
    }
    return [...list].sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [
    membershipTab,
    membershipSearch,
    membershipMonthKey,
    withCardStudents,
    withoutCardStudents,
  ]);

  const load = useCallback(async () => {
    setError('');
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (viewMode === 'irregulars-year-list' && irregularYearConfig) {
        q.set('irregulars_only', '1');
        q.set('year_level', irregularYearConfig.yearLevel);
      } else if (viewMode === 'section-list' && yearConfig && sectionLetter) {
        q.set('year_level', yearConfig.yearLevel);
        q.set('section', sectionLetter);
      } else {
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/students/list-for-officers?${q}`, { headers: getAuthHeaders() });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'Could not load list');
        setStudents([]);
        return;
      }
      setStudents(Array.isArray(data.data) ? data.data : []);
    } catch {
      setError('Unable to load membership list.');
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [viewMode, yearConfig, sectionLetter, irregularYearConfig]);

  useEffect(() => {
    const token = localStorage.getItem('ccs_token');
    const userData = localStorage.getItem('ccs_user');
    if (!token || !userData) {
      navigate('/login');
      return;
    }
    const u = JSON.parse(userData);
    if (u.role !== 'OFFICER') {
      navigate('/dashboard');
      return;
    }
    setUser(u);
  }, [navigate]);

  useEffect(() => {
    if (!user || user.role !== 'OFFICER') return;
    if (viewMode === 'year-hub' || viewMode === 'irregulars-hub') {
      setStudents([]);
      setError('');
      setLoading(false);
      return;
    }
    if (viewMode === 'invalid') {
      setStudents([]);
      setError('');
      setLoading(false);
      return;
    }
    load();
  }, [user, viewMode, load]);

  const hubSubtitle = yearConfig ? `${yearConfig.listTitle} — select a section folder` : '';
  const sectionSubtitle =
    yearConfig && sectionLetter
      ? `Section ${sectionLetter} · ${yearConfig.listTitle} students`
      : '';
  const irregularYearSubtitle =
    irregularYearConfig != null
      ? `Irregular students · ${irregularYearConfig.listTitle}`
      : '';

  if (!user || user.role !== 'OFFICER') return null;

  if (viewMode === 'invalid') {
    return (
      <div className="membership-cards-page">
        <p className="membership-cards-invalid">This membership view is not available.</p>
      </div>
    );
  }

  if (viewMode === 'irregulars-hub') {
    return (
      <div className="membership-cards-page">
        <header className="ccs-gradient-hero ccs-gradient-hero--compact membership-cards-hero">
          <div className="ccs-gradient-hero-pattern" aria-hidden />
          <div className="ccs-gradient-hero-inner">
            <h1 className="ccs-gradient-hero-title">Membership cards</h1>
            <p className="ccs-gradient-hero-subtitle">All irregulars — select a year level</p>
          </div>
        </header>

        <nav className="membership-section-folders" aria-label="Irregular students by year">
          {IRREGULAR_YEAR_FOLDERS.map((f) => (
            <button
              key={f.slug}
              type="button"
              className="membership-section-folder"
              onClick={() => navigate(`/dashboard/membership-cards/irregulars/${f.slug}`)}
            >
              <span className="membership-section-folder-icon-wrap">
                <FolderIcon />
              </span>
              <span className="membership-section-folder-label">{f.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  if (viewMode === 'year-hub') {
    return (
      <div className="membership-cards-page">
        <header className="ccs-gradient-hero ccs-gradient-hero--compact membership-cards-hero">
          <div className="ccs-gradient-hero-pattern" aria-hidden />
          <div className="ccs-gradient-hero-inner">
            <h1 className="ccs-gradient-hero-title">Membership cards</h1>
            <p className="ccs-gradient-hero-subtitle">{hubSubtitle}</p>
          </div>
        </header>

        <nav className="membership-section-folders" aria-label="Sections">
          {SECTION_FOLDERS.map((f) => (
            <button
              key={f.key}
              type="button"
              className="membership-section-folder"
              onClick={() => navigate(`/dashboard/membership-cards/${yearSegment}/${f.key}`)}
            >
              <span className="membership-section-folder-icon-wrap">
                <FolderIcon />
              </span>
              <span className="membership-section-folder-label">{f.label}</span>
            </button>
          ))}
        </nav>
      </div>
    );
  }

  const pageSubtitle =
    viewMode === 'irregulars-year-list' ? irregularYearSubtitle : sectionSubtitle;

  return (
    <div className="membership-cards-page">
      <header className="ccs-gradient-hero ccs-gradient-hero--compact membership-cards-hero">
        <div className="ccs-gradient-hero-pattern" aria-hidden />
        <div className="ccs-gradient-hero-inner membership-cards-hero-row">
          <div>
            <h1 className="ccs-gradient-hero-title">Membership cards</h1>
            <p className="ccs-gradient-hero-subtitle">{pageSubtitle}</p>
          </div>
          {viewMode === 'section-list' && yearSegment && (
            <button type="button" className="membership-back-btn" onClick={() => navigate(`/dashboard/membership-cards/${yearSegment}`)}>
              ← Sections
            </button>
          )}
          {viewMode === 'irregulars-year-list' && (
            <button type="button" className="membership-back-btn" onClick={() => navigate('/dashboard/membership-cards/irregulars')}>
              ← Year levels
            </button>
          )}
        </div>
      </header>

      {error && (
        <div className="membership-cards-error" role="alert">
          {error}
        </div>
      )}

      {loading ? (
        <p className="membership-cards-loading">Loading roster…</p>
      ) : students.length === 0 ? (
        <p className="membership-cards-empty">No students found for this category.</p>
      ) : (
        <>
          <div className="membership-toolbar">
            <div className="membership-tabs" role="tablist" aria-label="Membership card status">
              <button
                type="button"
                role="tab"
                aria-selected={membershipTab === 'with'}
                className={`membership-tab ${membershipTab === 'with' ? 'membership-tab--active' : ''}`}
                onClick={() => setMembershipTab('with')}
              >
                With membership card
                <span className="membership-tab-count">{withCardStudents.length}</span>
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={membershipTab === 'without'}
                className={`membership-tab ${membershipTab === 'without' ? 'membership-tab--active' : ''}`}
                onClick={() => setMembershipTab('without')}
              >
                Without membership card
                <span className="membership-tab-count">{withoutCardStudents.length}</span>
              </button>
            </div>
            <div className="membership-toolbar-controls">
              <label className="membership-search-label">
                <span className="membership-visually-hidden">Search students by name or number</span>
                <input
                  type="search"
                  className="membership-search-input"
                  placeholder="Search by name or student no.…"
                  value={membershipSearch}
                  onChange={(e) => setMembershipSearch(e.target.value)}
                  autoComplete="off"
                />
              </label>
              {membershipTab === 'with' && (
                <label className="membership-filter-label">
                  <span className="membership-filter-label-text">Card availed</span>
                  <select
                    className="membership-filter-select"
                    value={membershipMonthKey}
                    onChange={(e) => setMembershipMonthKey(e.target.value)}
                  >
                    <option value="">All months</option>
                    {CARD_AVAILED_MONTH_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>

          {displayedStudents.length === 0 ? (
            <p className="membership-cards-empty">
              {membershipSearch.trim()
                ? 'No students match your search in this tab.'
                : membershipTab === 'with' && membershipMonthKey
                  ? 'No students availed their card in this month.'
                  : membershipTab === 'with'
                    ? 'No students with a recorded membership card in this list.'
                    : 'No students without a membership card record in this list.'}
            </p>
          ) : (
            <ul className="membership-cards-grid">
              {displayedStudents.map((s) => {
                const p = s.student_profile || {};
                const photo = p.photo_url?.trim();
                const availed = p.membership_card_availed_at;
                return (
                  <li key={s.id} className="membership-card">
                    <div className="membership-card-photo-wrap">
                      {photo ? (
                        <img src={photo} alt="" className="membership-card-photo" loading="lazy" />
                      ) : (
                        <span className="membership-card-photo-fallback" aria-hidden>
                          {initialsFromName(s.name)}
                        </span>
                      )}
                    </div>
                    <div className="membership-card-body">
                      <h2 className="membership-card-name">{s.name}</h2>
                      <p className="membership-card-meta">
                        <span className="membership-card-label">Student no.</span> {s.student_number || '—'}
                      </p>
                      {membershipTab === 'with' && availed && (
                        <p className="membership-card-meta membership-card-availed">
                          <span className="membership-card-label">Card availed</span> {formatAvailedDate(availed)}
                        </p>
                      )}
                      <p className="membership-card-meta">
                        <span className="membership-card-label">Program</span> {p.course || '—'}
                      </p>
                      <p className="membership-card-meta">
                        <span className="membership-card-label">Year</span> {p.year_level || '—'}
                      </p>
                      <p className="membership-card-meta">
                        <span className="membership-card-label">Section</span> {p.section || '—'}
                      </p>
                      <p className="membership-card-meta membership-card-standing">
                        <span className="membership-card-label">Standing</span> {p.academic_standing || '—'}
                      </p>
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
}
