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

export const REGULAR_IRREGULAR_OPTIONS = [
  { value: 'Regular', label: 'Regular' },
  { value: 'Irregular', label: 'Irregular' },
];

/** Group legacy DB values with BSCS / BSIT buckets for class lists. */
export function normalizeCourseKey(course) {
  if (!course || String(course).trim() === '') return 'Unassigned';
  const s = String(course).trim();
  const u = s.toUpperCase();
  if (u === 'BSCS' || u.includes('COMPUTER SCIENCE')) return 'BSCS';
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
