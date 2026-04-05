/** Canonical course codes stored in student_profiles.course */
export const COURSE_OPTIONS = [
  { value: 'BSCS', label: 'BSCS — BS Computer Science' },
  { value: 'BSIT', label: 'BSIT — BS Information Technology' },
];

export const SECTION_LETTERS = ['A', 'B', 'C', 'D', 'E'];

/** Target headcount per section (admin reference; not enforced server-side). */
export const SECTION_CAPACITY = 50;

export const DEFAULT_YEAR_LEVEL_NEW_STUDENT = '1st yr';

export const YEAR_LEVEL_OPTIONS = ['1st yr', '2nd yr', '3rd yr', '4th yr', '5th yr'];

/** 1 = first semester, 2 = second semester (BSCS CCS Courses sidebar). */
export const ACADEMIC_SEMESTER_OPTIONS = [
  { value: 1, label: '1st semester' },
  { value: 2, label: '2nd semester' },
];

export const REGULAR_IRREGULAR_OPTIONS = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Irregular', label: 'Irregular' },
];

/** Group legacy DB values with BSCS / BSIT buckets for class lists. */
export function normalizeCourseKey(course) {
  if (!course || String(course).trim() === '') return 'Unassigned';
  const s = String(course).trim();
  const u = s.toUpperCase();
  const lettersOnly = u.replace(/[^A-Z]/g, '');
  const isBscs =
    u === 'BSCS' ||
    lettersOnly === 'BSCS' ||
    lettersOnly.includes('BSCS') ||
    u.includes('COMPUTER SCIENCE') ||
    u.includes('COMP. SCIENCE');
  if (isBscs) return 'BSCS';
  if (u === 'BSIT' || (u.includes('INFORMATION') && u.includes('TECH'))) return 'BSIT';
  return s;
}

/** Single letter A–E if possible, else raw string for “Other” bucket. */
export function normalizeSectionKey(section) {
  if (!section || String(section).trim() === '') return 'Unassigned';
  const t = String(section).trim().toUpperCase();
  const letter = t.charAt(0);
  if (letter >= 'A' && letter <= 'E') return letter;
  return t;
}

/** Value for edit-profile &lt;select&gt; when course is BSCS or BSIT. */
export function mapLegacyCourseToSelect(course) {
  if (!course || String(course).trim() === '') return '';
  const s = String(course).trim();
  if (s === 'BSCS' || s === 'BSIT') return s;
  const u = s.toUpperCase();
  if (u.includes('COMPUTER SCIENCE')) return 'BSCS';
  if (u.includes('INFORMATION') && u.includes('TECH')) return 'BSIT';
  return '';
}

/** Section letter A–E from values like "A" or "Section B". */
export function mapLegacySectionToSelect(section) {
  if (!section || String(section).trim() === '') return '';
  const letter = String(section).trim().toUpperCase().charAt(0);
  return SECTION_LETTERS.includes(letter) ? letter : '';
}

/**
 * Display tag like reference "4IT-A": year digit + CS/IT + section letter from profile.
 */
export function formatClassSectionLabel(profile) {
  if (!profile?.section) return '—';
  const yl = String(profile.year_level || '').toLowerCase();
  let y = '';
  if (yl.includes('1st')) y = '1';
  else if (yl.includes('2nd')) y = '2';
  else if (yl.includes('3rd')) y = '3';
  else if (yl.includes('4th')) y = '4';
  else if (yl.includes('5th')) y = '5';
  const letter =
    mapLegacySectionToSelect(profile.section) || normalizeSectionKey(profile.section);
  if (!letter || letter === 'Unassigned' || letter.length > 1) return `Section ${profile.section}`;
  const prog = normalizeCourseKey(profile.course) === 'BSIT' ? 'IT' : 'CS';
  if (y) return `${y}${prog}-${letter}`;
  return `Section ${letter}`;
}

/** Stable roster order: name → student number → id (never random shuffle). */
export function sortStudentsStable(students) {
  return [...(students || [])].sort((a, b) => {
    const na = (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
    if (na !== 0) return na;
    const sn = String(a.student_number || '').localeCompare(String(b.student_number || ''), undefined, { numeric: true });
    if (sn !== 0) return sn;
    return (Number(a.id) || 0) - (Number(b.id) || 0);
  });
}

function ensureClassListCourseBranch(tree, courseBucket) {
  if (!tree[courseBucket]) {
    tree[courseBucket] = {};
    SECTION_LETTERS.forEach((s) => {
      tree[courseBucket][s] = [];
    });
    tree[courseBucket].Unassigned = [];
    tree[courseBucket].Other = [];
  }
}

/**
 * Bucket all students under BSCS/BSIT/Unassigned/Other × section A–E/Unassigned/Other.
 * Each bucket is sorted with {@link sortStudentsStable}.
 */
export function buildClassListTree(students) {
  const tree = {};
  ['BSCS', 'BSIT', 'Unassigned', 'Other'].forEach((c) => ensureClassListCourseBranch(tree, c));

  for (const st of students || []) {
    const p = st.student_profile || {};
    const cKey = normalizeCourseKey(p.course);
    const sKey = normalizeSectionKey(p.section);
    const courseBucket = cKey === 'Unassigned' ? 'Unassigned' : (cKey !== 'BSCS' && cKey !== 'BSIT' ? 'Other' : cKey);

    ensureClassListCourseBranch(tree, courseBucket);

    let secBucket = 'Other';
    if (SECTION_LETTERS.includes(sKey)) secBucket = sKey;
    else if (sKey === 'Unassigned') secBucket = 'Unassigned';

    if (!tree[courseBucket][secBucket]) tree[courseBucket][secBucket] = [];
    tree[courseBucket][secBucket].push(st);
  }

  for (const c of Object.keys(tree)) {
    for (const s of Object.keys(tree[c])) {
      tree[c][s] = sortStudentsStable(tree[c][s]);
    }
  }

  return tree;
}

/** Year keys for class-list folder steps (1st–4th + Irregulars). */
export const CLASS_LIST_YEAR_FOLDER_KEYS = ['1st yr', '2nd yr', '3rd yr', '4th yr', 'Irregulars'];

/** Inside Irregulars: bucket irregular students by profile year_level (1st–4th). */
export const CLASS_LIST_IRREGULAR_SUBYEAR_KEYS = ['1st yr', '2nd yr', '3rd yr', '4th yr'];

export const CLASS_LIST_YEAR_FOLDER_LABELS = {
  '1st yr': '1st Year',
  '2nd yr': '2nd Year',
  '3rd yr': '3rd Year',
  '4th yr': '4th Year',
  Irregulars: 'Irregulars',
  '5th yr': '5th Year',
  Unassigned: 'Year unassigned',
  Other: 'Other year',
};

/**
 * Map profile year_level to a class-list year folder key.
 */
export function normalizeClassListYearKey(yearLevel) {
  if (!yearLevel || String(yearLevel).trim() === '') return 'Unassigned';
  const s = String(yearLevel).trim().toLowerCase();
  if (s.includes('1st')) return '1st yr';
  if (s.includes('2nd')) return '2nd yr';
  if (s.includes('3rd')) return '3rd yr';
  if (s.includes('4th')) return '4th yr';
  if (s.includes('5th')) return '5th yr';
  return 'Other';
}

/**
 * Tree: program (BSCS | BSIT) → year → section → students (sorted).
 * Exception: under {@link CLASS_LIST_YEAR_FOLDER_KEYS} key `Irregulars`, leaves are
 * profile year buckets → students[] (no section level).
 */
export function buildClassListTreeByYear(students) {
  const tree = { BSCS: {}, BSIT: {} };
  const ensureYearSection = (c, y) => {
    if (!tree[c][y]) {
      tree[c][y] = {};
      SECTION_LETTERS.forEach((sec) => {
        tree[c][y][sec] = [];
      });
      tree[c][y].Unassigned = [];
      tree[c][y].Other = [];
    }
  };
  for (const st of students || []) {
    const p = st.student_profile || {};
    const cKey = normalizeCourseKey(p.course);
    if (cKey !== 'BSCS' && cKey !== 'BSIT') continue;
    const standing = String(p.academic_standing || '').trim().toLowerCase();
    const isIrregular = standing === 'irregular';
    if (isIrregular) {
      const subY = normalizeClassListYearKey(p.year_level);
      if (!tree[cKey].Irregulars) tree[cKey].Irregulars = {};
      if (!tree[cKey].Irregulars[subY]) tree[cKey].Irregulars[subY] = [];
      tree[cKey].Irregulars[subY].push(st);
      continue;
    }
    const yKey = normalizeClassListYearKey(p.year_level);
    const sKey = normalizeSectionKey(p.section);
    let secBucket = 'Other';
    if (SECTION_LETTERS.includes(sKey)) secBucket = sKey;
    else if (sKey === 'Unassigned') secBucket = 'Unassigned';
    ensureYearSection(cKey, yKey);
    if (!tree[cKey][yKey][secBucket]) tree[cKey][yKey][secBucket] = [];
    tree[cKey][yKey][secBucket].push(st);
  }
  for (const c of ['BSCS', 'BSIT']) {
    for (const y of Object.keys(tree[c])) {
      for (const s of Object.keys(tree[c][y])) {
        const leaf = tree[c][y][s];
        if (Array.isArray(leaf)) {
          tree[c][y][s] = sortStudentsStable(leaf);
        }
      }
    }
  }
  return tree;
}

export function countStudentsInClassListCourse(tree, course) {
  const branch = tree[course];
  if (!branch) return 0;
  let n = 0;
  for (const y of Object.keys(branch)) {
    for (const s of Object.keys(branch[y])) {
      const v = branch[y][s];
      if (Array.isArray(v)) {
        n += v.length;
      }
    }
  }
  return n;
}

export function countStudentsInClassListYear(tree, course, yearKey) {
  const yb = tree[course]?.[yearKey];
  if (!yb) return 0;
  let n = 0;
  for (const s of Object.keys(yb)) {
    const v = yb[s];
    if (Array.isArray(v)) {
      n += v.length;
    }
  }
  return n;
}

/** Count irregular students in one sub-year bucket under Irregulars. */
export function countStudentsInIrregularSubYear(tree, course, subYearKey) {
  const arr = tree[course]?.Irregulars?.[subYearKey];
  return Array.isArray(arr) ? arr.length : 0;
}
