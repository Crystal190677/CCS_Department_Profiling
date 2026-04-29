<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class StudentSeeder extends Seeder
{
    private const TARGET_PER_COURSE = 500;
    private const COURSES = ['BSIT', 'BSCS'];
    private const YEAR_LEVELS = ['1st yr', '2nd yr', '3rd yr', '4th yr'];
    private const SECTIONS = ['A', 'B', 'C', 'D', 'E'];
    private const SECTION_CAPACITY = 50;
    private const MANAGED_EMAIL_DOMAIN = '@seed.ccs.edu';
    private const REQUIRED_BSIT_4A_STUDENTS = ['2203416', '2203428', '2203387'];

    public function run(): void
    {
        try {
            $faker = fake('en_PH');
        } catch (\Throwable) {
            $faker = fake();
        }

        $defaultPassword = Hash::make('password123');
        $created = 0;

        foreach (self::COURSES as $courseIndex => $course) {
            $this->trimCourseOverflow($course);
            $this->enforceSectionCapForCourse($course);
            $created += $this->topUpCourseToTarget($faker, $defaultPassword, $course, $courseIndex);
            $this->enforceSectionCapForCourse($course);
            $created += $this->topUpCourseToTarget($faker, $defaultPassword, $course, $courseIndex);
            $this->trimCourseOverflow($course);
        }

        $this->ensureProtectedStudentsActivated();

        $bsitCount = $this->courseCount('BSIT');
        $bscsCount = $this->courseCount('BSCS');
        $total = $bsitCount + $bscsCount;

        $this->command?->info("StudentSeeder created {$created} students.");
        $this->command?->info("BSIT students: {$bsitCount}");
        $this->command?->info("BSCS students: {$bscsCount}");
        $this->command?->info("Grand total (BSIT + BSCS): {$total}");
    }

    private function topUpCourseToTarget(object $faker, string $defaultPassword, string $course, int $courseIndex): int
    {
        $current = $this->courseCount($course);
        if ($current >= self::TARGET_PER_COURSE) {
            return 0;
        }

        $created = 0;
        $needed = self::TARGET_PER_COURSE - $current;

        for ($i = 0; $i < $needed; $i++) {
            $yearLevel = $this->pickYearWithDeficit($course);
            $section = $this->pickSectionWithCapacity($course, $yearLevel);
            $this->createSeedStudent($faker, $defaultPassword, $courseIndex, $course, $yearLevel, $section);
            $created++;
        }

        return $created;
    }

    private function createSeedStudent(
        object $faker,
        string $defaultPassword,
        int $courseIndex,
        string $course,
        string $yearLevel,
        string $section
    ): void {
        $base = 8_500_000 + ($courseIndex * 100_000);
        $cursor = $base;
        while (User::query()->where('student_number', (string) $cursor)->exists()) {
            $cursor++;
        }

        $studentNumber = (string) $cursor;
        $user = User::query()->createOrFirst(
            ['student_number' => $studentNumber],
            [
                'name' => $faker->name(),
                'email' => "s{$studentNumber}@seed.ccs.edu",
                'password' => $defaultPassword,
                'role' => 'STUDENT',
                'password_set_at' => now(),
            ]
        );

        if ($user->password_set_at === null) {
            $user->forceFill(['password_set_at' => now()])->save();
        }

        StudentProfile::query()->updateOrCreate(
            ['user_id' => $user->id],
            [
                'course' => $course,
                'year_level' => $yearLevel,
                'section' => $section,
                'academic_standing' => StudentProfile::ACADEMIC_STANDING_REGULAR,
                'academic_semester' => 1,
            ]
        );
    }

    private function courseCount(string $course): int
    {
        return User::query()
            ->where('role', 'STUDENT')
            ->whereHas('studentProfile', fn ($q) => $q->where('course', $course))
            ->count();
    }

    private function courseYearCount(string $course, string $yearLevel): int
    {
        return User::query()
            ->where('role', 'STUDENT')
            ->whereHas('studentProfile', fn ($q) => $q->where('course', $course)->where('year_level', $yearLevel))
            ->count();
    }

    private function pickYearWithDeficit(string $course): string
    {
        $targetPerYear = intdiv(self::TARGET_PER_COURSE, count(self::YEAR_LEVELS)); // 125
        $selected = self::YEAR_LEVELS[0];
        $largestDeficit = PHP_INT_MIN;

        foreach (self::YEAR_LEVELS as $yearLevel) {
            $deficit = $targetPerYear - $this->courseYearCount($course, $yearLevel);
            if ($deficit > $largestDeficit) {
                $largestDeficit = $deficit;
                $selected = $yearLevel;
            }
        }

        return $selected;
    }

    private function pickSectionWithCapacity(string $course, string $yearLevel): string
    {
        $counts = [];
        foreach (self::SECTIONS as $section) {
            $counts[$section] = User::query()
                ->where('role', 'STUDENT')
                ->whereHas('studentProfile', fn ($q) => $q
                    ->where('course', $course)
                    ->where('year_level', $yearLevel)
                    ->where('section', $section)
                    ->where('academic_standing', StudentProfile::ACADEMIC_STANDING_REGULAR))
                ->count();
        }

        $withRoom = array_filter(self::SECTIONS, fn ($section) => ($counts[$section] ?? 0) < self::SECTION_CAPACITY);
        if (!empty($withRoom)) {
            usort($withRoom, fn ($a, $b) => ($counts[$a] <=> $counts[$b]) ?: strcmp($a, $b));

            return $withRoom[0];
        }

        $sorted = self::SECTIONS;
        usort($sorted, fn ($a, $b) => ($counts[$a] <=> $counts[$b]) ?: strcmp($a, $b));

        return $sorted[0];
    }

    private function trimCourseOverflow(string $course): void
    {
        $count = $this->courseCount($course);
        if ($count <= self::TARGET_PER_COURSE) {
            return;
        }

        $overflow = $count - self::TARGET_PER_COURSE;
        $protectedIds = $this->protectedIds();

        $managedIds = User::query()
            ->where('role', 'STUDENT')
            ->whereHas('studentProfile', fn ($q) => $q->where('course', $course))
            ->where('email', 'like', '%'.self::MANAGED_EMAIL_DOMAIN)
            ->whereNotIn('id', $protectedIds)
            ->orderByDesc('id')
            ->limit($overflow)
            ->pluck('id')
            ->all();

        $this->removeFromCourse($managedIds);
        $remaining = $overflow - count($managedIds);
        if ($remaining <= 0) {
            return;
        }

        $fallbackIds = User::query()
            ->where('role', 'STUDENT')
            ->whereHas('studentProfile', fn ($q) => $q->where('course', $course))
            ->whereNotIn('id', $protectedIds)
            ->whereNotIn('id', $managedIds)
            ->orderByDesc('id')
            ->limit($remaining)
            ->pluck('id')
            ->all();

        $this->removeFromCourse($fallbackIds);
    }

    private function enforceSectionCapForCourse(string $course): void
    {
        foreach (self::YEAR_LEVELS as $yearLevel) {
            foreach (self::SECTIONS as $section) {
                $sectionIds = User::query()
                    ->where('role', 'STUDENT')
                    ->whereHas('studentProfile', fn ($q) => $q
                        ->where('course', $course)
                        ->where('year_level', $yearLevel)
                        ->where('section', $section)
                        ->where('academic_standing', StudentProfile::ACADEMIC_STANDING_REGULAR))
                    ->orderBy('id')
                    ->pluck('id')
                    ->all();

                if (count($sectionIds) <= self::SECTION_CAPACITY) {
                    continue;
                }

                $protectedIds = ($course === 'BSIT' && $yearLevel === '4th yr' && $section === 'A')
                    ? $this->protectedIds()
                    : [];

                $keepIds = [];
                foreach ($sectionIds as $id) {
                    if (in_array($id, $protectedIds, true)) {
                        $keepIds[] = $id;
                    }
                }
                foreach ($sectionIds as $id) {
                    if (count($keepIds) >= self::SECTION_CAPACITY) {
                        break;
                    }
                    if (!in_array($id, $keepIds, true)) {
                        $keepIds[] = $id;
                    }
                }

                $overflowIds = array_values(array_diff($sectionIds, $keepIds));
                $this->removeFromCourse($overflowIds);
            }
        }
    }

    private function ensureProtectedStudentsActivated(): void
    {
        User::query()
            ->whereIn('student_number', self::REQUIRED_BSIT_4A_STUDENTS)
            ->where('role', 'STUDENT')
            ->whereNull('password_set_at')
            ->update(['password_set_at' => now()]);
    }

    private function protectedIds(): array
    {
        return User::query()
            ->whereIn('student_number', self::REQUIRED_BSIT_4A_STUDENTS)
            ->pluck('id')
            ->all();
    }

    private function removeFromCourse(array $userIds): void
    {
        if (empty($userIds)) {
            return;
        }

        StudentProfile::query()
            ->whereIn('user_id', $userIds)
            ->update([
                'course' => null,
                'year_level' => null,
                'section' => null,
                'academic_standing' => StudentProfile::ACADEMIC_STANDING_REGULAR,
            ]);
    }
}
