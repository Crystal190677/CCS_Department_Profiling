<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds demo students with academic_standing Irregular for Class List → Irregulars → year-level folders.
 * Two students per 1st–4th year per program (BSCS / BSIT). Emails @irregular.demo.ccs.local — purged on re-run.
 */
class ClassListIrregularStudentsSeeder extends Seeder
{
    private const EMAIL_DOMAIN = 'irregular.demo.ccs.local';

    private function faker(): \Faker\Generator
    {
        try {
            return fake('en_PH');
        } catch (\Throwable) {
            return fake();
        }
    }

    public function run(): void
    {
        $faker = $this->faker();
        $password = Hash::make('password123');

        $yearNotes = [
            '1st yr' => [
                'Transferee; irregular first-year curriculum mix.',
                'Bridging subjects; off-sequence with cohort.',
            ],
            '2nd yr' => [
                'LOA return; retaking failed cores off cohort.',
                'Shifted from related program; credit evaluation pending.',
            ],
            '3rd yr' => [
                'Summer makeup; off-sequence electives.',
                'Minor overload with adviser approval (irregular).',
            ],
            '4th yr' => [
                'Thesis extension; irregular residency.',
                'Capstone deferred; mixed year-level subjects.',
            ],
        ];

        $yearEmailSlug = [
            '1st yr' => '1st',
            '2nd yr' => '2nd',
            '3rd yr' => '3rd',
            '4th yr' => '4th',
        ];

        $yearNumSlug = [
            '1st yr' => '1ST',
            '2nd yr' => '2ND',
            '3rd yr' => '3RD',
            '4th yr' => '4TH',
        ];

        $blueprint = [];
        $gpaBase = 2.05;
        foreach (['BSCS', 'BSIT'] as $course) {
            foreach (['1st yr', '2nd yr', '3rd yr', '4th yr'] as $yearLevel) {
                foreach ([1, 2] as $slot) {
                    $section = $slot === 1 ? 'A' : 'B';
                    $blueprint[] = [
                        'course' => $course,
                        'section' => $section,
                        'year_level' => $yearLevel,
                        'current_gpa' => round($gpaBase + (count($blueprint) % 8) * 0.04, 2),
                        'failed_units' => min(12, 2 + (count($blueprint) % 5) * 2),
                        'enrolled_units' => 12 + (count($blueprint) % 7),
                        'academic_semester' => (count($blueprint) % 2) + 1,
                        'note' => $yearNotes[$yearLevel][$slot - 1],
                        'email_slug' => $yearEmailSlug[$yearLevel],
                        'num_slug' => $yearNumSlug[$yearLevel],
                        'slot' => $slot,
                    ];
                }
            }
        }

        DB::transaction(function () use ($faker, $password, $blueprint): void {
            User::query()->where('email', 'like', '%@'.self::EMAIL_DOMAIN)->delete();

            foreach ($blueprint as $idx => $row) {
                // Seven-digit numbers only (same login rules as official roster).
                $studentNumber = sprintf('%07d', 2_270_001 + $idx);
                $email = sprintf(
                    'irreg-%s-%s-%d@%s',
                    strtolower($row['course']),
                    $row['email_slug'],
                    $row['slot'],
                    self::EMAIL_DOMAIN,
                );

                $first = $faker->firstName();
                $last = $faker->lastName();
                $name = "{$first} {$last}";

                $user = User::query()->create([
                    'name' => $name,
                    'email' => $email,
                    'student_number' => $studentNumber,
                    'password' => $password,
                    'password_set_at' => now(),
                    'role' => 'STUDENT',
                    'remember_token' => Str::random(10),
                ]);

                StudentProfile::query()->create([
                    'user_id' => $user->id,
                    'course' => $row['course'],
                    'year_level' => $row['year_level'],
                    'academic_semester' => $row['academic_semester'],
                    'section' => $row['section'],
                    'academic_standing' => StudentProfile::ACADEMIC_STANDING_IRREGULAR,
                    'current_gpa' => $row['current_gpa'],
                    'failed_units' => $row['failed_units'],
                    'enrolled_units' => $row['enrolled_units'],
                    'incomplete_grades' => $faker->boolean(25) ? 1 : 0,
                    'notes' => $row['note'],
                    'skills' => $faker->randomElement([
                        'Python, SQL',
                        'Java, Web',
                        'Networking basics',
                        'UI design, HTML/CSS',
                    ]),
                ]);
            }
        });

        $this->command->info('Class list irregular demo: '.count($blueprint).' students (@'.self::EMAIL_DOMAIN.'). Password: password123');
    }
}
