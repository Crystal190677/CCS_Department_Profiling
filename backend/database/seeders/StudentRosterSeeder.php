<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Pre-provisioned official class roster: fixed count per section, 7-digit student numbers.
 * Password is a random hash until the student activates via /api/auth/claim (password_set_at null).
 *
 * Override count: SEED_ROSTER_PER_SECTION=10 (max 50).
 */
class StudentRosterSeeder extends Seeder
{
    public function run(): void
    {
        $perSection = max(1, min(50, (int) env('SEED_ROSTER_PER_SECTION', 50)));
        $dummyHash = Hash::make(Str::password(48));

        $courses = ['BSCS', 'BSIT'];
        $years = ['1st yr', '2nd yr', '3rd yr', '4th yr'];
        $sections = ['A', 'B', 'C', 'D', 'E'];

        $reserved = ['2203416' => true, '2203428' => true];
        $seq = 2_210_000;
        $nextStudentNumber = function () use (&$seq, $reserved): string {
            do {
                if ($seq > 9_999_999) {
                    throw new \RuntimeException('Roster student number space exhausted (7-digit cap).');
                }
                $n = (string) $seq++;
            } while (isset($reserved[$n]));

            return $n;
        };

        try {
            $faker = fake('en_PH');
        } catch (\Throwable) {
            $faker = fake();
        }

        foreach ($courses as $course) {
            foreach ($years as $yearLevel) {
                foreach ($sections as $section) {
                    for ($i = 1; $i <= $perSection; $i++) {
                        if ($course === 'BSIT' && $yearLevel === '4th yr' && $section === 'A' && $i === 1) {
                            $this->upsertRosterStudent(
                                '2203428',
                                'Shariel D. Osias',
                                's2203428@roster.ccs.edu',
                                $course,
                                $yearLevel,
                                $section,
                                $dummyHash
                            );

                            continue;
                        }

                        if ($course === 'BSIT' && $yearLevel === '4th yr' && $section === 'A' && $i === 2) {
                            $this->upsertRosterStudent(
                                '2203416',
                                'Crystal Anne Barayrang',
                                's2203416@roster.ccs.edu',
                                $course,
                                $yearLevel,
                                $section,
                                $dummyHash
                            );

                            continue;
                        }

                        $sn = $nextStudentNumber();
                        $first = $faker->firstName();
                        $last = $faker->lastName();
                        $name = "{$first} {$last}";
                        $email = $sn.'@roster.ccs.edu';

                        $this->upsertRosterStudent($sn, $name, $email, $course, $yearLevel, $section, $dummyHash);
                    }
                }
            }
        }

        $total = count($courses) * count($years) * count($sections) * $perSection;
        $this->command->info("Official roster seeded: {$total} students ({$perSection} per section, 7-digit numbers). Activate with student number on login.");
    }

    private function upsertRosterStudent(
        string $sn,
        string $name,
        string $email,
        string $course,
        string $yearLevel,
        string $section,
        string $dummyHash,
    ): void {
        $user = User::query()->where('student_number', $sn)->first();

        if ($user) {
            if ($user->role === 'STUDENT') {
                $user->forceFill([
                    'name' => $name,
                    'email' => $email,
                ])->save();
            }
        } else {
            $user = User::query()->create([
                'name' => $name,
                'email' => $email,
                'student_number' => $sn,
                'password' => $dummyHash,
                'password_set_at' => null,
                'role' => 'STUDENT',
            ]);
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
}
