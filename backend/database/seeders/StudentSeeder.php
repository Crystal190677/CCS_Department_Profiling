<?php

namespace Database\Seeders;

use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class StudentSeeder extends Seeder
{
    public function run(): void
    {
        $this->command->info('Truncating existing students...');
        
        $studentIds = User::where('role', 'STUDENT')->pluck('id')->toArray();
        if (!empty($studentIds)) {
            StudentProfile::whereIn('user_id', $studentIds)->delete();
            User::whereIn('id', $studentIds)->delete();
        }

        try {
            $faker = fake('en_PH');
        } catch (\Throwable) {
            $faker = fake();
        }

        $password = Hash::make('password123');
        $now = now();

        $courses = ['BSIT', 'BSCS'];
        $categories = [
            '1st yr' => '1',
            '2nd yr' => '2',
            '3rd yr' => '3',
            '4th yr' => '4',
            'Irregular' => 'IRR'
        ];
        $sections = ['A', 'B', 'C', 'D', 'E'];
        $studentsPerSection = 50;

        $usersToInsert = [];
        $profilesToInsert = [];

        $this->command->info('Generating 2,500 students...');

        foreach ($courses as $course) {
            foreach ($categories as $categoryName => $levelCode) {
                foreach ($sections as $section) {
                    for ($i = 1; $i <= $studentsPerSection; $i++) {
                        // e.g. 2024-BSIT-1A-001
                        $studentNumber = sprintf("2024-%s-%s%s-%03d", $course, $levelCode, $section, $i);
                        // Emails must be unique
                        $email = strtolower("s{$studentNumber}@seed.ccs.edu");
                        
                        $first = $faker->firstName();
                        $last = $faker->lastName();
                        $name = "{$first} {$last}";

                        $usersToInsert[] = [
                            'name' => $name,
                            'email' => $email,
                            'student_number' => $studentNumber,
                            'password' => $password,
                            'role' => 'STUDENT',
                            'password_set_at' => $now,
                            'created_at' => $now,
                            'updated_at' => $now,
                            'course_meta' => $course, 
                            'category_meta' => $categoryName,
                            'section_meta' => $section,
                        ];
                    }
                }
            }
        }

        DB::beginTransaction();
        
        $chunks = array_chunk($usersToInsert, 500);
        foreach ($chunks as $chunk) {
            $insertData = array_map(function($u) {
                unset($u['course_meta'], $u['category_meta'], $u['section_meta']);
                return $u;
            }, $chunk);
            User::insert($insertData);
        }

        $insertedUsers = User::where('role', 'STUDENT')
            ->where('student_number', 'like', '2024-%')
            ->get();
        
        $userMap = $insertedUsers->keyBy('student_number');

        foreach ($usersToInsert as $u) {
            $userRecord = $userMap->get($u['student_number']);
            if ($userRecord) {
                $standing = $u['category_meta'] === 'Irregular' 
                    ? StudentProfile::ACADEMIC_STANDING_IRREGULAR 
                    : StudentProfile::ACADEMIC_STANDING_REGULAR;

                $profilesToInsert[] = [
                    'user_id' => $userRecord->id,
                    'course' => $u['course_meta'],
                    'year_level' => $u['category_meta'],
                    'section' => $u['section_meta'],
                    'academic_standing' => $standing,
                    'academic_semester' => 1,
                    'current_gpa' => $faker->randomFloat(2, 1.0, 3.0),
                    'created_at' => $now,
                    'updated_at' => $now,
                ];
            }
        }

        $profileChunks = array_chunk($profilesToInsert, 500);
        foreach ($profileChunks as $chunk) {
            StudentProfile::insert($chunk);
        }

        DB::commit();

        $bsitCount = StudentProfile::where('course', 'BSIT')->count();
        $bscsCount = StudentProfile::where('course', 'BSCS')->count();

        $this->command->info("StudentSeeder finished!");
        $this->command->info("BSIT students: {$bsitCount}");
        $this->command->info("BSCS students: {$bscsCount}");
        $this->command->info("Grand total: " . ($bsitCount + $bscsCount));
    }
}
