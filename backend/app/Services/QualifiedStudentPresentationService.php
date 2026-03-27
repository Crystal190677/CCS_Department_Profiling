<?php

namespace App\Services;

use App\Models\Activity;
use App\Models\ActivityStudentRankOverride;
use App\Models\StudentConductEntry;
use App\Models\User;

class QualifiedStudentPresentationService
{
    /** @var array<string, int> */
    private const PROF_ORDER = [
        'Beginner' => 1,
        'Intermediate' => 2,
        'Advanced' => 3,
        'Expert' => 4,
    ];

    /**
     * Attach Step 4 presentation fields for API JSON (dynamic attributes on User).
     */
    public static function appendToUser(User $user, Activity $activity, float $scoreMax, ?ActivityStudentRankOverride $rankOverride = null): void
    {
        $raw = (float) ($user->qualification_score ?? 0);
        $percent = $scoreMax > 0 ? (int) min(100, max(0, round($raw / $scoreMax * 100))) : 0;
        $stars = (int) max(0, min(5, (int) round($percent / 20)));

        $detail = [
            'score_raw' => round($raw, 2),
            'score_max' => round($scoreMax, 2),
            'score_percent' => $percent,
            'stars' => $stars,
            'matched_skills' => self::matchedSkills($user, $activity),
            'declared_interest' => self::hasInterestInActivity($user, $activity->id),
            'flags' => self::buildFlags($user),
            'rank_override' => null,
        ];

        if ($rankOverride && $rankOverride->type === ActivityStudentRankOverride::TYPE_BOOST && (int) $rankOverride->boost_points > 0) {
            $detail['rank_override'] = [
                'type' => 'boost',
                'boost_points' => (int) $rankOverride->boost_points,
                'reason' => $rankOverride->reason,
            ];
        }

        $user->setAttribute('qualification_detail', $detail);
    }

    /**
     * @return list<array{skill: string, proficiency_level: string|null, match_type: string}>
     */
    public static function matchedSkills(User $user, Activity $activity): array
    {
        $criteria = $activity->criteria ?? [];
        $out = [];
        $bySkill = [];
        foreach ($user->skillEntries ?? [] as $entry) {
            $bySkill[$entry->skill] = $entry;
        }

        foreach (['required' => 'required_skills', 'bonus' => 'bonus_skills'] as $type => $key) {
            $list = $criteria[$key] ?? [];
            if (!is_array($list)) {
                continue;
            }
            foreach ($list as $req) {
                $name = is_array($req) ? ($req['skill'] ?? $req['name'] ?? '') : (string) $req;
                $name = trim($name);
                if ($name === '') {
                    continue;
                }
                $minProf = is_array($req) ? ($req['min_proficiency'] ?? 'Beginner') : 'Beginner';
                $entry = $bySkill[$name] ?? null;
                if (!$entry || !self::proficiencyMeetsMin($entry->proficiency_level, $minProf)) {
                    continue;
                }
                $out[] = [
                    'skill' => $name,
                    'proficiency_level' => $entry->proficiency_level,
                    'match_type' => $type,
                ];
            }
        }

        return $out;
    }

    private static function proficiencyMeetsMin(?string $level, string $minProf): bool
    {
        $l = self::PROF_ORDER[$level] ?? 0;
        $m = self::PROF_ORDER[$minProf] ?? 1;

        return $l >= $m;
    }

    private static function hasInterestInActivity(User $user, int $activityId): bool
    {
        foreach ($user->interestDeclarations ?? [] as $decl) {
            if ((int) $decl->activity_id === $activityId) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return list<string>
     */
    public static function buildFlags(User $user): array
    {
        $flags = [];
        $minor = 0;
        foreach ($user->conductEntries ?? [] as $e) {
            if ($e->type === StudentConductEntry::TYPE_VIOLATION && $e->severity === StudentConductEntry::SEVERITY_MINOR) {
                $minor++;
            }
        }
        if ($minor === 1) {
            $flags[] = '1 minor violation on record';
        } elseif ($minor > 1) {
            $flags[] = "{$minor} minor violations on record";
        }

        $p = $user->studentProfile;
        if ($p) {
            if ((int) ($p->incomplete_grades ?? 0) > 0) {
                $flags[] = (int) $p->incomplete_grades.' incomplete grade(s)';
            }
            if ((int) ($p->failed_units ?? 0) > 0) {
                $flags[] = (int) $p->failed_units.' failed unit(s)';
            }
            $notes = trim((string) ($p->notes ?? ''));
            if ($notes !== '') {
                $flags[] = 'Note: '.mb_substr($notes, 0, 120).(mb_strlen($notes) > 120 ? '…' : '');
            }
        }

        return $flags;
    }
}
