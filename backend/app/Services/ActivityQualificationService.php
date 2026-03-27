<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\ActivityStudentRankOverride;
use App\Models\Enrollment;
use App\Models\StudentConductEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ActivityQualificationService
{
    /**
     * Apply Phase 3 hard filters (disqualifiers). Failing any configured rule excludes the student.
     * Caller should also exclude students already enrolled in the target activity (see StudentsController).
     *
     * Requires a student_profiles row: whereHas('studentProfile') always runs, so users without
     * any profile are excluded from smart-filter results (even if no GPA/height rules are set).
     *
     * Hard filters:
     * - Academic standing Probationary or "On hold" excluded unless criteria.allow_probationary_and_hold
     * - Activity criteria: min GPA, max failed units, allowed academic standings, min year level, min enrolled units
     * - Physical: min height (cm), required preferred position (+ optional allowed position list)
     * - Enrollment conflicts: active enrollment in any configured conflicting activity
     * - Schedule: active enrollment in another activity with the same time_slot (unless skip_schedule_conflict)
     * - Conduct: Major/Grave excluded unless criteria.no_major_grave === false or permit_major_grave_violations; minor count cap
     * - Skills: each required skill at or above min proficiency
     *
     * @param  Builder<User>  $query
     */
    public static function applyToUserQuery(Builder $query, Activity $activity): void
    {
        $criteria = $activity->criteria ?? [];

        $query->whereHas('studentProfile', function (Builder $sub) use ($criteria) {
            if (empty($criteria['allow_probationary_and_hold'])) {
                $sub->where(function (Builder $q) {
                    $q->whereNull('academic_standing')
                        ->orWhereNotIn('academic_standing', ['Probationary', 'On hold']);
                });
            }
            if (isset($criteria['min_gpa']) && $criteria['min_gpa'] !== '' && $criteria['min_gpa'] !== null) {
                $sub->where('current_gpa', '>=', (float) $criteria['min_gpa']);
            }
            if (isset($criteria['max_failed_units']) && $criteria['max_failed_units'] !== '' && $criteria['max_failed_units'] !== null) {
                $sub->where(function (Builder $q) use ($criteria) {
                    $q->whereNull('failed_units')->orWhere('failed_units', '<=', (int) $criteria['max_failed_units']);
                });
            }
            if (!empty($criteria['academic_standings']) && is_array($criteria['academic_standings'])) {
                $sub->whereIn('academic_standing', $criteria['academic_standings']);
            }
            if (isset($criteria['year_level_min']) && $criteria['year_level_min'] !== '' && $criteria['year_level_min'] !== null) {
                $sub->where('year_level', '>=', (int) $criteria['year_level_min']);
            }
            if (isset($criteria['enrolled_units_min']) && $criteria['enrolled_units_min'] !== '' && $criteria['enrolled_units_min'] !== null) {
                $sub->where('enrolled_units', '>=', (int) $criteria['enrolled_units_min']);
            }
            $minH = $criteria['min_height_cm'] ?? $criteria['min_height'] ?? null;
            if ($minH !== null && $minH !== '') {
                $sub->where('height_cm', '>=', (float) $minH);
            }
            if (!empty($criteria['require_preferred_position'])) {
                $sub->whereNotNull('preferred_position')->where('preferred_position', '!=', '');
                $allowed = $criteria['allowed_positions'] ?? [];
                if (is_array($allowed)) {
                    $allowed = array_values(array_filter(array_map('trim', $allowed)));
                    if ($allowed !== []) {
                        $sub->whereIn('preferred_position', $allowed);
                    }
                }
            }
        });

        $conflictingIds = $criteria['conflicting_activity_ids'] ?? [];
        if (!empty($conflictingIds) && is_array($conflictingIds)) {
            $query->whereDoesntHave('enrollments', function (Builder $q) use ($conflictingIds) {
                $q->whereIn('activity_id', $conflictingIds)->whereIn('status', Enrollment::rosterSeatStatuses());
            });
        }

        $slot = trim((string) ($activity->time_slot ?? ''));
        $skipSchedule = !empty($criteria['skip_schedule_conflict']);
        if ($slot !== '' && !$skipSchedule) {
            $sameSlotIds = Activity::query()
                ->where('id', '!=', $activity->id)
                ->whereNotNull('time_slot')
                ->whereRaw('LOWER(TRIM(time_slot)) = ?', [mb_strtolower($slot)])
                ->pluck('id');
            if ($sameSlotIds->isNotEmpty()) {
                $query->whereDoesntHave('enrollments', function (Builder $q) use ($sameSlotIds) {
                    $q->whereIn('status', Enrollment::rosterSeatStatuses())->whereIn('activity_id', $sameSlotIds);
                });
            }
        }

        $permitMajorGrave = !empty($criteria['permit_major_grave_violations'])
            || (array_key_exists('no_major_grave', $criteria) && $criteria['no_major_grave'] === false);
        if (!$permitMajorGrave) {
            $query->whereDoesntHave('conductEntries', function (Builder $q) {
                $q->where('type', StudentConductEntry::TYPE_VIOLATION)
                    ->whereIn('severity', [StudentConductEntry::SEVERITY_MAJOR, StudentConductEntry::SEVERITY_GRAVE]);
            });
        }
        if (isset($criteria['max_minor_violations']) && $criteria['max_minor_violations'] !== '' && $criteria['max_minor_violations'] !== null) {
            $maxMinor = (int) $criteria['max_minor_violations'];
            $query->whereRaw(
                '(SELECT COUNT(*) FROM student_conduct_entries sce WHERE sce.user_id = users.id AND sce.type = ? AND sce.severity = ?) <= ?',
                [StudentConductEntry::TYPE_VIOLATION, StudentConductEntry::SEVERITY_MINOR, $maxMinor]
            );
        }

        $requiredSkills = $criteria['required_skills'] ?? [];
        if (!empty($requiredSkills) && is_array($requiredSkills)) {
            foreach ($requiredSkills as $req) {
                $skillName = is_array($req) ? ($req['skill'] ?? $req['name'] ?? '') : (string) $req;
                $minProf = is_array($req) ? ($req['min_proficiency'] ?? 'Beginner') : 'Beginner';
                if ($skillName === '') {
                    continue;
                }
                $query->whereHas('skillEntries', function (Builder $q) use ($skillName, $minProf) {
                    $q->where('skill', $skillName);
                    $order = ['Beginner' => 1, 'Intermediate' => 2, 'Advanced' => 3, 'Expert' => 4];
                    $minLevel = $order[$minProf] ?? 1;
                    $allowed = array_filter(array_keys($order), fn ($p) => ($order[$p] ?? 0) >= $minLevel);
                    if (!empty($allowed)) {
                        $q->whereIn('proficiency_level', $allowed);
                    }
                });
            }
        }
    }

    public static function userQualifies(User $user, Activity $activity): bool
    {
        if (ActivityStudentRankOverride::query()
            ->where('activity_id', $activity->id)
            ->where('user_id', $user->id)
            ->where('type', ActivityStudentRankOverride::TYPE_EXCLUDE)
            ->exists()) {
            return false;
        }

        return User::query()
            ->whereKey($user->getKey())
            ->where(function (Builder $q) use ($activity) {
                self::applyToUserQuery($q, $activity);
            })
            ->exists();
    }

    /**
     * Raw SQL fragment for counting how many bonus skill requirements a user satisfies (for ordering).
     *
     * @param  list<array{skill: string, min_proficiency?: string}|string>  $bonusSkills
     */
    public static function bonusSkillMatchCountSql(array $bonusSkills): ?string
    {
        if ($bonusSkills === []) {
            return null;
        }
        $parts = [];
        foreach ($bonusSkills as $req) {
            $skillName = is_array($req) ? ($req['skill'] ?? $req['name'] ?? '') : (string) $req;
            $minProf = is_array($req) ? ($req['min_proficiency'] ?? 'Beginner') : 'Beginner';
            if ($skillName === '') {
                continue;
            }
            $order = ['Beginner' => 1, 'Intermediate' => 2, 'Advanced' => 3, 'Expert' => 4];
            $minLevel = $order[$minProf] ?? 1;
            $allowed = array_filter(array_keys($order), fn ($p) => ($order[$p] ?? 0) >= $minLevel);
            if ($allowed === []) {
                continue;
            }
            $levels = array_map(fn ($p) => DB::getPdo()->quote($p), $allowed);
            $skillQuoted = DB::getPdo()->quote($skillName);
            $parts[] = '(SELECT CASE WHEN EXISTS (SELECT 1 FROM student_skill_entries sse WHERE sse.user_id = users.id AND sse.skill = '.$skillQuoted.' AND sse.proficiency_level IN ('.implode(',', $levels).')) THEN 1 ELSE 0 END)';
        }
        if ($parts === []) {
            return null;
        }

        return '('.implode(' + ', $parts).')';
    }
}
