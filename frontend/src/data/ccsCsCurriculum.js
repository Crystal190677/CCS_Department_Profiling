/**
 * Official BSCS curriculum map (year–semester → course codes) and course catalog.
 * Non–BSCS students keep {@link LEGACY_DEFAULT_CCS_SIDEBAR} in the UI (officer/BSIT path).
 */

export const BSCS_CURRICULUM_BY_TERM = {
  '1-1': ['CCS101', 'CCS102', 'ETH101', 'MAT101', 'NSTP1', 'PED101', 'PSY100'],
  '1-2': ['CCS103', 'CCS104', 'CCS106', 'COM101', 'CSP101', 'GAD101', 'NSTP2', 'PED102'],
  '2-1': ['CCS107', 'CCS108', 'CSEG1', 'CSP102', 'HIS101', 'PED103', 'STS101'],
  '2-2': ['ACT101', 'CCS110', 'CSEG2', 'CSP103', 'CSP104', 'CSP105', 'HMN101', 'PED104'],
  '3-1': ['CCS109', 'CCS112', 'CCS113', 'CSEG3', 'CSP106', 'CSP107', 'ENT101'],
  '3-2': ['CSEG4', 'CSP108', 'CSP109', 'CSP110', 'CSP111', 'RIZ101', 'SOC101', 'TEC101'],
  '4-1': ['CCS105', 'CSEG5', 'CCS112', 'CSP113', 'CSP114', 'ENV101'],
  '4-2': ['CCS111', 'CSEG6', 'CSP115'],
};

/** Previous default sidebar (officers, BSIT, etc.); includes historical ITEW1 entry for detail routes. */
export const LEGACY_DEFAULT_CCS_SIDEBAR = [
  { path: '/dashboard/ccs-courses/ACT101', label: 'ACT101' },
  { path: '/dashboard/ccs-courses/CCS107', label: 'CCS107' },
  { path: '/dashboard/ccs-courses/CCS108', label: 'CCS108' },
  { path: '/dashboard/ccs-courses/CCS109', label: 'CCS109' },
  { path: '/dashboard/ccs-courses/ITEW1', label: 'ITEW1' },
  { path: '/dashboard/ccs-courses/PED103', label: 'PED103' },
  { path: '/dashboard/ccs-courses/STS101', label: 'STS101' },
];

function yearLevelToNum(yearLevel) {
  if (!yearLevel) return null;
  const s = String(yearLevel).toLowerCase();
  if (s.includes('1st') || /^1[^0-9]/.test(s)) return 1;
  if (s.includes('2nd') || /^2[^0-9]/.test(s)) return 2;
  if (s.includes('3rd') || /^3[^0-9]/.test(s)) return 3;
  if (s.includes('4th') || /^4[^0-9]/.test(s)) return 4;
  if (s.includes('5th')) return 5;
  return null;
}

function semesterToNum(academicSemester) {
  const n = parseInt(String(academicSemester), 10);
  return n === 2 ? 2 : 1;
}

/**
 * @param {string} [yearLevel] e.g. "1st yr"
 * @param {number|string} [academicSemester] 1 or 2
 * @returns {string[]} course codes for that term
 */
export function getBscsCurriculumCodesForProfile(yearLevel, academicSemester) {
  const y = yearLevelToNum(yearLevel);
  const s = semesterToNum(academicSemester);
  if (!y || y > 4) return [];
  const key = `${y}-${s}`;
  return [...(BSCS_CURRICULUM_BY_TERM[key] || [])];
}

export function getBscsCourseSidebarChildren(yearLevel, academicSemester) {
  return getBscsCurriculumCodesForProfile(yearLevel, academicSemester).map((code) => ({
    path: `/dashboard/ccs-courses/${code}`,
    label: code,
  }));
}

const prereq = { none: ['None'] };

/** Full catalog for course detail pages (BSCS + legacy codes). */
export const CCS_COURSE_CATALOG = {
  CCS101: {
    code: 'CCS101',
    title: 'Introduction to Computing',
    description:
      'Overview of computing disciplines, number systems, basic algorithms, and the role of hardware and software in modern information systems.',
    units: 3,
    prerequisites: prereq.none,
  },
  CCS102: {
    code: 'CCS102',
    title: 'Computer Programming 1',
    description:
      'Problem-solving, control structures, functions, and structured programming fundamentals using a high-level language.',
    units: 3,
    prerequisites: ['CCS101'],
  },
  ETH101: {
    code: 'ETH101',
    title: 'Ethics',
    description:
      'Moral reasoning, ethical theories, and application to professional and social contexts, including responsibilities in technology use.',
    units: 3,
    prerequisites: prereq.none,
  },
  MAT101: {
    code: 'MAT101',
    title: 'Mathematics in the Modern World',
    description:
      'Mathematical thinking, patterns, and applications relevant to science, computing, and everyday decision-making.',
    units: 3,
    prerequisites: prereq.none,
  },
  NSTP1: {
    code: 'NSTP1',
    title: 'National Service Training Program 1',
    description:
      'Civic welfare, literacy training, or military science track focused on citizenship, leadership, and community engagement.',
    units: 3,
    prerequisites: prereq.none,
  },
  PED101: {
    code: 'PED101',
    title: 'Physical Education 1',
    description:
      'Movement competencies, fitness concepts, and wellness through structured physical activities.',
    units: 2,
    prerequisites: prereq.none,
  },
  PSY100: {
    code: 'PSY100',
    title: 'Understanding the Self / General Psychology',
    description:
      'Introduction to behavior and mental processes: biological bases, development, cognition, and social behavior.',
    units: 3,
    prerequisites: prereq.none,
  },
  CCS103: {
    code: 'CCS103',
    title: 'Computer Programming 2',
    description:
      'Intermediate programming: modular design, data collections, files, and introduction to abstract data types.',
    units: 3,
    prerequisites: ['CCS102'],
  },
  CCS104: {
    code: 'CCS104',
    title: 'Discrete Structures',
    description:
      'Logic, sets, relations, functions, combinatorics, graphs, and trees with applications to computing.',
    units: 3,
    prerequisites: ['CCS102', 'MAT101'],
  },
  CCS106: {
    code: 'CCS106',
    title: 'Data Structures and Algorithms',
    description:
      'Fundamental data structures, basic algorithm strategies, and introductory complexity analysis building on introductory programming.',
    units: 3,
    prerequisites: ['CCS103'],
  },
  COM101: {
    code: 'COM101',
    title: 'Purposive Communication',
    description:
      'Writing, speaking, and presentation skills for academic and professional contexts across disciplines.',
    units: 3,
    prerequisites: prereq.none,
  },
  CSP101: {
    code: 'CSP101',
    title: 'CSP 1 — CS Professional Course',
    description:
      'Foundational professional-track topic supporting program outcomes (consult program checklist for the specific module).',
    units: 3,
    prerequisites: ['CCS103'],
  },
  GAD101: {
    code: 'GAD101',
    title: 'Gender and Society',
    description:
      'Gender constructs, equity, and social structures; analysis through historical and contemporary lenses.',
    units: 3,
    prerequisites: prereq.none,
  },
  NSTP2: {
    code: 'NSTP2',
    title: 'National Service Training Program 2',
    description:
      'Continuation of NSTP with applied community service or advanced military science components per chosen track.',
    units: 3,
    prerequisites: ['NSTP1'],
  },
  PED102: {
    code: 'PED102',
    title: 'Physical Education 2',
    description:
      'Skill-related fitness and sports participation building on PE 1 learning outcomes.',
    units: 2,
    prerequisites: ['PED101'],
  },
  CCS107: {
    code: 'CCS107',
    title: 'Object-Oriented Programming',
    description:
      'OOP principles, encapsulation, inheritance, polymorphism, and component design in a high-level language.',
    units: 3,
    prerequisites: ['CCS106'],
  },
  CCS108: {
    code: 'CCS108',
    title: 'Design and Analysis of Algorithms',
    description:
      'Advanced structures, algorithm design paradigms, complexity analysis, and classical algorithms.',
    units: 3,
    prerequisites: ['CCS107'],
  },
  CSEG1: {
    code: 'CSEG1',
    title: 'Computer Science Elective — Group 1',
    description:
      'Elective module bundle (Group 1) aligned with CS specialization pathways; exact topic per department offering.',
    units: 3,
    prerequisites: ['CCS107'],
  },
  CSP102: {
    code: 'CSP102',
    title: 'CSP 2 — CS Professional Course',
    description:
      'Second professional-track CS course supporting technical and ethical competencies (see program mapping).',
    units: 3,
    prerequisites: ['CCS108'],
  },
  HIS101: {
    code: 'HIS101',
    title: 'Readings in Philippine History',
    description:
      'Critical readings of Philippine history with emphasis on historiography and contemporary interpretation.',
    units: 3,
    prerequisites: prereq.none,
  },
  PED103: {
    code: 'PED103',
    title: 'Physical Education 3',
    description:
      'Team or individual sports and recreational activities toward lifelong physical activity.',
    units: 2,
    prerequisites: ['PED102'],
  },
  STS101: {
    code: 'STS101',
    title: 'Science, Technology and Society',
    description:
      'Impact of science and technology on society, ethics, environment, and policy debates including ICT.',
    units: 3,
    prerequisites: prereq.none,
  },
  ACT101: {
    code: 'ACT101',
    title: 'Fundamentals of Accounting',
    description:
      'Accounting cycle, financial statements, and use of accounting data in business and systems contexts.',
    units: 3,
    prerequisites: prereq.none,
  },
  CCS110: {
    code: 'CCS110',
    title: 'Information Management',
    description:
      'Conceptual, logical, and physical data modeling; SQL; integrity and security in database applications.',
    units: 3,
    prerequisites: ['CCS108'],
  },
  CSEG2: {
    code: 'CSEG2',
    title: 'Computer Science Elective — Group 2',
    description:
      'Elective module bundle (Group 2) for advanced CS topics per department roster.',
    units: 3,
    prerequisites: ['CSEG1'],
  },
  CSP103: {
    code: 'CSP103',
    title: 'CSP 3 — CS Professional Course',
    description:
      'Professional CS module toward program outcomes (application design, QA, or related theme).',
    units: 3,
    prerequisites: ['CSP102'],
  },
  CSP104: {
    code: 'CSP104',
    title: 'CSP 4 — CS Professional Course',
    description:
      'Professional CS module continuing the CSP sequence per curriculum matrix.',
    units: 3,
    prerequisites: ['CSP103'],
  },
  CSP105: {
    code: 'CSP105',
    title: 'CSP 5 — CS Professional Course',
    description:
      'Professional CS module; content mapped to year-level outcomes and capstone preparation.',
    units: 3,
    prerequisites: ['CSP104'],
  },
  HMN101: {
    code: 'HMN101',
    title: 'Art Appreciation',
    description:
      'Forms, movements, and critical appreciation of visual and performing arts across cultures.',
    units: 3,
    prerequisites: prereq.none,
  },
  PED104: {
    code: 'PED104',
    title: 'Physical Education 4',
    description:
      'Advanced recreational or dance/sports module completing PE series requirements.',
    units: 2,
    prerequisites: ['PED103'],
  },
  CCS109: {
    code: 'CCS109',
    title: 'Networks and Communications',
    description:
      'Network architectures, protocols, addressing, and fundamentals of secure data communications.',
    units: 3,
    prerequisites: ['CCS108'],
  },
  CCS112: {
    code: 'CCS112',
    title: 'CS Integration / Architecture Course',
    description:
      'Integration of prior CS coursework around systems architecture, APIs, and multi-layer application design.',
    units: 3,
    prerequisites: ['CCS110', 'CCS109'],
  },
  CCS113: {
    code: 'CCS113',
    title: 'Intelligent Systems',
    description:
      'Introduction to knowledge representation, search, reasoning, and learning fundamentals in intelligent systems.',
    units: 3,
    prerequisites: ['CCS108'],
  },
  CSEG3: {
    code: 'CSEG3',
    title: 'Computer Science Elective — Group 3',
    description:
      'Upper-level elective bundle (Group 3) for specialization tracks.',
    units: 3,
    prerequisites: ['CSEG2'],
  },
  CSP106: {
    code: 'CSP106',
    title: 'CSP 6 — CS Professional Course',
    description:
      'Professional CS module at junior level; aligns with technical elective pathways.',
    units: 3,
    prerequisites: ['CSP105'],
  },
  CSP107: {
    code: 'CSP107',
    title: 'CSP 7 — CS Professional Course',
    description:
      'Professional CS module continuing applied computing competency development.',
    units: 3,
    prerequisites: ['CSP106'],
  },
  ENT101: {
    code: 'ENT101',
    title: 'The Entrepreneurial Mind',
    description:
      'Opportunity recognition, value creation, and lean approaches relevant to technology ventures.',
    units: 3,
    prerequisites: prereq.none,
  },
  CSEG4: {
    code: 'CSEG4',
    title: 'Computer Science Elective — Group 4',
    description:
      'Elective bundle (Group 4); topics announced per term by the department.',
    units: 3,
    prerequisites: ['CSEG3'],
  },
  CSP108: {
    code: 'CSP108',
    title: 'CSP 8 — CS Professional Course',
    description:
      'Professional CS module supporting advanced programming or systems topics.',
    units: 3,
    prerequisites: ['CSP107'],
  },
  CSP109: {
    code: 'CSP109',
    title: 'CSP 9 — CS Professional Course',
    description:
      'Professional CS module; prerequisite chain follows CSP sequence.',
    units: 3,
    prerequisites: ['CSP108'],
  },
  CSP110: {
    code: 'CSP110',
    title: 'CSP 10 — CS Professional Course',
    description:
      'Professional CS module toward integrative competencies.',
    units: 3,
    prerequisites: ['CSP109'],
  },
  CSP111: {
    code: 'CSP111',
    title: 'CSP 11 — CS Professional Course',
    description:
      'Professional CS module at upper junior / senior boundary.',
    units: 3,
    prerequisites: ['CSP110'],
  },
  RIZ101: {
    code: 'RIZ101',
    title: 'Life and Works of Rizal',
    description:
      'Rizal’s biography, writings, and national context under Spanish colonial rule.',
    units: 3,
    prerequisites: prereq.none,
  },
  SOC101: {
    code: 'SOC101',
    title: 'The Contemporary World',
    description:
      'Globalization, institutions, inequality, and contemporary social issues.',
    units: 3,
    prerequisites: prereq.none,
  },
  TEC101: {
    code: 'TEC101',
    title: 'Technopreneurship',
    description:
      'Business models, MVP thinking, and innovation processes for technology-based products.',
    units: 3,
    prerequisites: ['ENT101'],
  },
  CCS105: {
    code: 'CCS105',
    title: 'CS Thesis 1 / Research Methods',
    description:
      'Research methods in computing, proposal development, and milestone work toward a capstone project.',
    units: 3,
    prerequisites: ['CCS112'],
  },
  CSEG5: {
    code: 'CSEG5',
    title: 'Computer Science Elective — Group 5',
    description:
      'Senior-level elective bundle (Group 5).',
    units: 3,
    prerequisites: ['CSEG4'],
  },
  CSP113: {
    code: 'CSP113',
    title: 'CSP 12 — CS Professional Course',
    description:
      'Professional CS module in the senior year.',
    units: 3,
    prerequisites: ['CSP111'],
  },
  CSP114: {
    code: 'CSP114',
    title: 'CSP 13 — CS Professional Course',
    description:
      'Professional CS module complementing thesis or practicum work.',
    units: 3,
    prerequisites: ['CSP113'],
  },
  ENV101: {
    code: 'ENV101',
    title: 'Environmental Science',
    description:
      'Ecosystems, human impact, sustainability, and environmental policy literacy.',
    units: 3,
    prerequisites: prereq.none,
  },
  CCS111: {
    code: 'CCS111',
    title: 'CS Thesis 2 / Capstone Implementation',
    description:
      'Implementation, evaluation, and defense of the capstone project begun in CCS105.',
    units: 3,
    prerequisites: ['CCS105'],
  },
  CSEG6: {
    code: 'CSEG6',
    title: 'Computer Science Elective — Group 6',
    description:
      'Final elective group completing specialization requirements.',
    units: 3,
    prerequisites: ['CSEG5'],
  },
  CSP115: {
    code: 'CSP115',
    title: 'CSP 14 — CS Professional Course',
    description:
      'Capstone-aligned professional course; consult department for offering title.',
    units: 3,
    prerequisites: ['CSP114'],
  },
  /** Legacy/non-matrix code kept for BSIT/officer default sidebar */
  ITEW1: {
    code: 'ITEW1',
    title: 'Web Programming',
    description:
      'Client- and server-side basics for interactive web applications (legacy reference module).',
    units: 3,
    prerequisites: ['CCS107'],
  },
};

/** @typedef {{ classNumber: string, lecture: { professor: string, schedule: string }, lab: { professor: string, schedule: string } }} CourseOfferingMeta */

/** Reference-style overrides; other codes get plausible generated metadata. */
const COURSE_OFFERING_OVERRIDES = {
  STS101: {
    classNumber: '2401',
    lecture: {
      professor: 'Mc Austine Philip M. Redondo',
      schedule: 'Saturday, 7:00 am – 9:00 am (310)',
    },
    lab: {
      professor: 'Mc Austine Philip M. Redondo',
      schedule: 'Saturday, 10:00 am – 1:00 pm (COMLAB 1)',
    },
  },
  CCS107: {
    classNumber: '3107',
    lecture: {
      professor: 'Prof. John Faculty',
      schedule: 'Monday / Wednesday, 10:00 am – 12:00 pm (CS Hall B)',
    },
    lab: {
      professor: 'Prof. John Faculty',
      schedule: 'Thursday, 1:00 pm – 4:00 pm (COMLAB 3)',
    },
  },
  CCS108: {
    classNumber: '3108',
    lecture: {
      professor: 'Prof. John Faculty',
      schedule: 'Tuesday / Friday, 8:00 am – 10:00 am (Room 204)',
    },
    lab: {
      professor: 'Prof. John Faculty',
      schedule: 'Wednesday, 1:00 pm – 4:00 pm (COMLAB 2)',
    },
  },
  PED103: {
    classNumber: '5103',
    lecture: {
      professor: 'Mr. Carlos Mendoza',
      schedule: 'Tuesday / Thursday, 6:00 am – 7:30 am (Gym 1)',
    },
    lab: {
      professor: 'Mr. Carlos Mendoza',
      schedule: 'Activity sessions as scheduled (Field / Gym)',
    },
  },
};

function hashToClassNumber(code) {
  let h = 0;
  const s = String(code);
  for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return 1000 + (h % 7999);
}

/**
 * Lecture / lab schedules and class number for the subject header (demo data).
 * @param {string} [courseCode]
 * @returns {CourseOfferingMeta}
 */
export function getCourseOfferingMeta(courseCode) {
  const key = String(courseCode || '').trim().toUpperCase();
  const over = COURSE_OFFERING_OVERRIDES[key];
  if (over) {
    return {
      classNumber: over.classNumber,
      lecture: { ...over.lecture },
      lab: { ...over.lab },
    };
  }
  const n = hashToClassNumber(key);
  return {
    classNumber: String(n),
    lecture: {
      professor: 'Prof. John Faculty',
      schedule: 'Monday / Wednesday, 8:00 am – 10:00 am (Room 201)',
    },
    lab: {
      professor: 'Prof. John Faculty',
      schedule: 'Tuesday / Thursday, 1:00 pm – 4:00 pm (COMLAB 2)',
    },
  };
}

export function getCsCourseFromCatalog(courseCode) {
  if (!courseCode) return null;
  const key = String(courseCode).trim().toUpperCase();
  return CCS_COURSE_CATALOG[key] ?? null;
}

/** @deprecated use getCsCourseFromCatalog */
export function getCcsSecondYearCourse(courseCode) {
  return getCsCourseFromCatalog(courseCode);
}
