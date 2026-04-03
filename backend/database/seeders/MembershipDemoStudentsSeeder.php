<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds 50 students × 5 sections × 4 year levels (1,000 users) for membership card officer views.
 * emails: memo-{y}-{s}-{n}@demo.ccs.local — safe to delete and re-run via purge step below.
 */
class MembershipDemoStudentsSeeder extends Seeder
{
    private const EMAIL_DOMAIN = 'demo.ccs.local';

    /** Laravel Faker locale; fall back silently if unavailable. */
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

        DB::transaction(function () use ($faker, $password): void {
            User::query()->where('email', 'like', '%@'.self::EMAIL_DOMAIN)->delete();

            $years = ['1st yr', '2nd yr', '3rd yr', '4th yr'];
            $sections = ['A', 'B', 'C', 'D', 'E'];
            $courses = ['BSCS', 'BSIT'];

            $yearSlug = ['1', '2', '3', '4'];
            $total = 0;

            foreach ($years as $yi => $yearLevel) {
                $yLabel = $yearSlug[$yi];
                foreach ($sections as $section) {
                    $secLower = strtolower($section);
                    for ($i = 1; $i <= 50; $i++) {
                        $numPad = str_pad((string) $i, 2, '0', STR_PAD_LEFT);
                        $studentNumber = sprintf('MEMO-%s-%s-%s', $yLabel, $section, $numPad);
                        $email = sprintf('memo-%s-%s-%s@%s', $yLabel, $secLower, $numPad, self::EMAIL_DOMAIN);

                        $first = $faker->firstName();
                        $last = $faker->lastName();
                        $name = "{$first} {$last}";

                        $hasCard = $faker->boolean(62);
                        $availed = null;
                        if ($hasCard) {
                            $availed = $faker->dateTimeBetween('-9 months', 'now');
                        }

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
                            'course' => $courses[($total + $i - 1) % 2],
                            'year_level' => $yearLevel,
                            'academic_semester' => ($yi % 2) + 1,
                            'section' => $section,
                            'academic_standing' => $faker->randomElement([
                                StudentProfile::ACADEMIC_STANDING_REGULAR,
                                StudentProfile::ACADEMIC_STANDING_REGULAR,
                                StudentProfile::ACADEMIC_STANDING_REGULAR,
                                StudentProfile::ACADEMIC_STANDING_IRREGULAR,
                                StudentProfile::ACADEMIC_STANDING_PROBATIONARY,
                            ]),
                            'membership_card_availed_at' => $availed,
                        ]);
                    }
                    $total += 50;
                }
            }
        });

        $this->command->info('Membership demo students seeded: 1,000 (50 × 5 sections × 4 years). Password: password123');
    }
}
