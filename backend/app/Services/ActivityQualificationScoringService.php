<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\ActivityStudentRankOverride;
use App\Models\Enrollment;
use App\Models\StudentConductEntry;
use App\Models\StudentNonAcademicEntry;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\DB;

class ActivityQualificationScoringService
{
    /** Step 3 — soft ranking weights (higher = more influence). */
    private const W_GPA = 100.0;

    private const W_BONUS_SKILL = 28.0;

    private const W_INTEREST = 85.0;

    private const W_PAST_ACTIVITY = 32.0;

    private const W_AWARD = 42.0;

    private const W_COMMENDATION = 14.0;

    private const W_SAME_TYPE_ENROLLMENT = 38.0;

    private const W_HEIGHT_MARGIN = 2.5;

    private const CAP_HEIGHT_BONUS = 40.0;

    private const W_POSITION_MATCH = 22.0;

    private const CAP_PAST_ACTIVITY = 4;

    private const CAP_AWARD = 5;

    private const CAP_COMMENDATION = 8;

    private const CAP_SAME_TYPE_ENROLLMENT = 4;

    /**
     * Upper bound for the same scoring formula (used to show qualification score as a percentage).
     */
    public static function theoreticalMaxScore(Activity $activity): float
    {
        $criteria = $activity->criteria ?? [];
        $max = 5.0 * self::W_GPA;

        $bonusSkills = is_array($criteria['bonus_skills'] ?? null) ? $criteria['bonus_skills'] : [];
        $bonusCount = 0;
        foreach ($bonusSkills as $req) {
            $name = is_array($req) ? ($req['skill'] ?? $req['name'] ?? '') : (string) $req;
            if (trim($name) !== '') {
                $bonusCount++;
            }
        }
        $max += $bonusCount * self::W_BONUS_SKILL;

        $max += self::W_INTEREST;
        $max += self::CAP_PAST_ACTIVITY * self::W_PAST_ACTIVITY;
        $max += self::CAP_AWARD * self::W_AWARD;
        $max += self::CAP_COMMENDATION * self::W_COMMENDATION;
        $max += self::CAP_SAME_TYPE_ENROLLMENT * self::W_SAME_TYPE_ENROLLMENT;

        if ($activity->type === 'sport') {
            $minH = $criteria['min_height_cm'] ?? $criteria['min_height'] ?? null;
            if ($minH !== null && $minH !== '' && (float) $minH > 0) {
                $max += self::CAP_HEIGHT_BONUS;
            }
            $allowed = $criteria['allowed_positions'] ?? [];
            if (is_array($allowed) && array_filter(array_map('trim', $allowed)) !== []) {
                $max += self::W_POSITION_MATCH;
            }
        }

        return $max;
    }

    /**
     * Add qualification_score column and order by it (then name). Caller must scope $query to qualified users first.
     *
     * @param  Builder<User>  $query
     */
    public static function applyRankingSelectAndOrder(Builder $query, Activity $activity, string $sort = 'score', string $sortDir = 'desc'): void
    {
        $activityId = (int) $activity->id;
        $typeQuoted = DB::getPdo()->quote($activity->type);
        $criteria = $activity->criteria ?? [];

        $parts = [];
        $parts[] = '(COALESCE((SELECT sp.current_gpa FROM student_profiles sp WHERE sp.user_id = users.id LIMIT 1), 0) * '.self::W_GPA.')';

        $bonusSql = ActivityQualificationService::bonusSkillMatchCountSql(
            is_array($criteria['bonus_skills'] ?? null) ? $criteria['bonus_skills'] : []
        );
        if ($bonusSql !== null) {
            $parts[] = '('.$bonusSql.' * '.self::W_BONUS_SKILL.')';
        }

        $parts[] = '(CASE WHEN EXISTS (SELECT 1 FROM student_interest_declarations sid WHERE sid.user_id = users.id AND sid.activity_id = '.$activityId.') THEN '.self::W_INTEREST.' ELSE 0 END)';

        $pastT = DB::getPdo()->quote(StudentNonAcademicEntry::TYPE_PAST_ACTIVITY);
        $awardT = DB::getPdo()->quote(StudentNonAcademicEntry::TYPE_AWARD);
        $approved = DB::getPdo()->quote(StudentNonAcademicEntry::STATUS_APPROVED);

        $parts[] = '(LEAST('.self::CAP_PAST_ACTIVITY.', COALESCE((SELECT COUNT(*) FROM student_non_academic_entries sna WHERE sna.user_id = users.id AND sna.type = '.$pastT.' AND sna.status = '.$approved.'), 0)) * '.self::W_PAST_ACTIVITY.')';

        $parts[] = '(LEAST('.self::CAP_AWARD.', COALESCE((SELECT COUNT(*) FROM student_non_academic_entries sna2 WHERE sna2.user_id = users.id AND sna2.type = '.$awardT.' AND sna2.status = '.$approved.'), 0)) * '.self::W_AWARD.')';

        $commT = DB::getPdo()->quote(StudentConductEntry::TYPE_COMMENDATION);
        $parts[] = '(LEAST('.self::CAP_COMMENDATION.', COALESCE((SELECT COUNT(*) FROM student_conduct_entries sce_c WHERE sce_c.user_id = users.id AND sce_c.type = '.$commT.'), 0)) * '.self::W_COMMENDATION.')';

        $rosterStatusesIn = implode(',', array_map(fn ($s) => DB::getPdo()->quote($s), Enrollment::rosterSeatStatuses()));
        $parts[] = '(LEAST('.self::CAP_SAME_TYPE_ENROLLMENT.', COALESCE((SELECT COUNT(*) FROM enrollments enr INNER JOIN activities act ON act.id = enr.activity_id WHERE enr.user_id = users.id AND enr.status IN ('.$rosterStatusesIn.') AND act.type = '.$typeQuoted.' AND act.id <> '.$activityId.'), 0)) * '.self::W_SAME_TYPE_ENROLLMENT.')';

        if ($activity->type === 'sport') {
            $minH = $criteria['min_height_cm'] ?? $criteria['min_height'] ?? null;
            if ($minH !== null && $minH !== '' && (float) $minH > 0) {
                $minHNum = (float) $minH;
                $parts[] = '(COALESCE((SELECT GREATEST(0, LEAST('.self::CAP_HEIGHT_BONUS.', (COALESCE(sph.height_cm, 0) - '.$minHNum.') * '.self::W_HEIGHT_MARGIN.')) FROM student_profiles sph WHERE sph.user_id = users.id LIMIT 1), 0))';
            }
            $allowed = $criteria['allowed_positions'] ?? [];
            if (is_array($allowed)) {
                $allowed = array_values(array_filter(array_map('trim', $allowed)));
                if ($allowed !== []) {
                    $inList = implode(',', array_map(fn ($p) => DB::getPdo()->quote($p), $allowed));
                    $parts[] = '(CASE WHEN EXISTS (SELECT 1 FROM student_profiles spp WHERE spp.user_id = users.id AND spp.preferred_position IN ('.$inList.')) THEN '.self::W_POSITION_MATCH.' ELSE 0 END)';
                }
            }
        }

        $boostQuoted = DB::getPdo()->quote(ActivityStudentRankOverride::TYPE_BOOST);
        $boostSub = '(COALESCE((SELECT o.boost_points FROM activity_student_rank_overrides o WHERE o.activity_id = '.$activityId.' AND o.user_id = users.id AND o.type = '.$boostQuoted.'), 0))';
        $expr = '('.implode(' + ', $parts).') + '.$boostSub;
        $query->addSelect(DB::raw('('.$expr.') as qualification_score'));

        $dir = strtolower($sortDir) === 'asc' ? 'asc' : 'desc';
        $sort = strtolower($sort);
        if ($sort === 'name') {
            $query->orderBy('users.name', $dir);
            $query->orderByDesc('qualification_score');
        } elseif ($sort === 'gpa') {
            $query->orderByRaw('(SELECT sp_ord.current_gpa FROM student_profiles sp_ord WHERE sp_ord.user_id = users.id LIMIT 1) '.$dir);
            $query->orderByDesc('qualification_score');
            $query->orderBy('users.name');
        } else {
            $query->orderBy('qualification_score', $dir === 'asc' ? 'asc' : 'desc');
            $query->orderBy('users.name');
        }
    }
}
