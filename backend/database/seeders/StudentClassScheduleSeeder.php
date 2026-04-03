<?php

namespace Database\Seeders;

use App\Models\StudentClassSchedule;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Weekly class grid (Mon–Sat) for BSCS students/officers, matched to curriculum term.
 * Uses 3-hour blocks with ~2h gaps when two classes share a day; Tuesday kept free in templates.
 */
class StudentClassScheduleSeeder extends Seeder
{
    /** Mirrors frontend BSCS_CURRICULUM_BY_TERM */
    private const BSCS_BY_TERM = [
        '1-1' => ['CCS101', 'CCS102', 'ETH101', 'MAT101', 'NSTP1', 'PED101', 'PSY100'],
        '1-2' => ['CCS103', 'CCS104', 'CCS106', 'COM101', 'CSP101', 'GAD101', 'NSTP2', 'PED102'],
        '2-1' => ['CCS107', 'CCS108', 'CSEG1', 'CSP102', 'HIS101', 'PED103', 'STS101'],
        '2-2' => ['ACT101', 'CCS110', 'CSEG2', 'CSP103', 'CSP104', 'CSP105', 'HMN101', 'PED104'],
        '3-1' => ['CCS109', 'CCS112', 'CCS113', 'CSEG3', 'CSP106', 'CSP107', 'ENT101'],
        '3-2' => ['CSEG4', 'CSP108', 'CSP109', 'CSP110', 'CSP111', 'RIZ101', 'SOC101', 'TEC101'],
        '4-1' => ['CCS105', 'CSEG5', 'CCS112', 'CSP113', 'CSP114', 'ENV101'],
        '4-2' => ['CCS111', 'CSEG6', 'CSP115'],
    ];

    /**
     * [day 1–6 Mon–Sat, start H:i, end H:i]. Tuesday unused until overflow past 12 courses — curriculum max fits.
     */
    private const SLOT_TEMPLATES = [
        [1, '07:30', '10:30'],
        [1, '13:00', '16:00'],
        [3, '08:00', '11:00'],
        [4, '09:00', '12:00'],
        [5, '08:00', '11:00'],
        [5, '14:00', '17:00'],
        [6, '09:00', '12:00'],
        [3, '14:00', '17:00'],
        [4, '13:00', '16:00'],
        [6, '14:00', '17:00'],
        [4, '07:30', '10:30'],
        [3, '07:30', '10:30'],
    ];

    public function run(): void
    {
        DB::transaction(function (): void {
            $baseQuery = User::query()
                ->whereIn('role', ['STUDENT', 'OFFICER'])
                ->where('email', 'not like', '%@demo.ccs.local');

            $targetIds = (clone $baseQuery)->pluck('id');
            StudentClassSchedule::query()->whereIn('user_id', $targetIds)->delete();

            $baseQuery->with('studentProfile')->chunkById(100, function ($users): void {
                foreach ($users as $user) {
                    /** @var StudentProfile|null $p */
                    $p = $user->studentProfile;
                    if (!$p || !$this->isBscs($p->course)) {
                        continue;
                    }
                    $key = $this->termKey($p);
                    if (!$key || !isset(self::BSCS_BY_TERM[$key])) {
                        continue;
                    }
                    $codes = self::BSCS_BY_TERM[$key];
                    foreach ($codes as $i => $code) {
                        if (!isset(self::SLOT_TEMPLATES[$i])) {
                            break;
                        }
                        [$dow, $start, $end] = self::SLOT_TEMPLATES[$i];
                        StudentClassSchedule::query()->create([
                            'user_id' => $user->id,
                            'course_code' => $code,
                            'day_of_week' => $dow,
                            'start_time' => $start,
                            'end_time' => $end,
                        ]);
                    }
                }
            });
        });
    }

    private function isBscs(?string $course): bool
    {
        if (!$course || trim($course) === '') {
            return false;
        }
        $u = strtoupper(trim($course));

        return $u === 'BSCS'
            || str_contains($u, 'COMPUTER SCIENCE')
            || str_replace([' ', '.', '-', '_'], '', $u) === 'BSCS';
    }

    private function termKey(StudentProfile $p): ?string
    {
        $y = $this->yearLevelToNum($p->year_level);
        if ($y === null || $y < 1 || $y > 4) {
            return null;
        }
        $sem = (int) ($p->academic_semester ?? 1);

        return $y.'-'.($sem === 2 ? 2 : 1);
    }

    private function yearLevelToNum(?string $yearLevel): ?int
    {
        if (!$yearLevel) {
            return null;
        }
        $s = strtolower($yearLevel);
        if (str_contains($s, '1st')) {
            return 1;
        }
        if (str_contains($s, '2nd')) {
            return 2;
        }
        if (str_contains($s, '3rd')) {
            return 3;
        }
        if (str_contains($s, '4th')) {
            return 4;
        }
        if (str_contains($s, '5th')) {
            return 5;
        }

        return null;
    }
}
