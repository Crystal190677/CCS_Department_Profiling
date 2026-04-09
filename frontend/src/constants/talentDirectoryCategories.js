/**
 * Talent Directory — group activities into a small set of friendly categories.
 * New activities created by admins are classified from name, description, and type.
 */

export const TALENT_DIRECTORY_CATEGORIES = [
  {
    id: 'quiz',
    label: 'Quiz & contests',
    hint: 'Spelling bees, quiz bowls, trivia, debates…',
  },
  {
    id: 'sports',
    label: 'Sports',
    hint: 'Basketball, volleyball, track, intramurals…',
  },
  {
    id: 'talents',
    label: 'Talents & performances',
    hint: 'Dance, chess, pageants, music, esports…',
  },
  {
    id: 'tech',
    label: 'Tech & coding',
    hint: 'Programming, mobile apps, hackathons…',
  },
  {
    id: 'other',
    label: 'More activities',
    hint: 'Everything else (clubs, service, misc.)',
  },
];

/**
 * @param {{ name?: string, description?: string | null, type?: string } | null | undefined} activity
 * @returns {'quiz'|'sports'|'talents'|'tech'|'other'}
 */
export function getActivityTalentCategory(activity) {
  if (!activity) return 'other';
  const name = String(activity.name || '');
  const desc = String(activity.description || '');
  const hay = `${name} ${desc}`.toLowerCase();
  const type = activity.type;

  if (
    /\b(quiz|spelling\s*bee|quiz\s*bee|trivia|math\s*bowl|science\s*bowl|brain\s*teaser|academic\s*competition|general\s*knowledge|\bgk\b|debate|oratorical|speech\s*contest)\b/i.test(
      hay,
    )
  ) {
    return 'quiz';
  }
  if (
    /\b(programming|hackathon|coding|software|developer|\bict\b|web\s*dev|robotics|algorithm|mobile\s*competition|app\s*development|computer\s*science|\bcs\b\s*fair)\b/i.test(
      hay,
    )
  ) {
    return 'tech';
  }
  // Performance / arts / games-of-skill — before raw "sport" type so Cheerdance stays with talents.
  if (
    /\b(cheer|cheerdance|\bdance\b|chess|music|theater|theatre|drama|pageant|sportsfest|talent\s*show|cultural|esports|e-?sports|online\s*game|gaming|singing|choir|drill|\bband\b)\b/i.test(
      hay,
    )
  ) {
    return 'talents';
  }
  if (type === 'sport') return 'sports';
  if (type === 'event') return 'talents';
  if (type === 'activity') return 'other';
  return 'other';
}
