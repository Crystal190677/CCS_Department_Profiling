<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\Announcement;
use App\Models\AuditLog;
use App\Models\StudentProfile;
use App\Models\StudentSkillEntry;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('password123');

        $users = [
            ['name' => 'System Admin', 'email' => 'admin@ccs.edu', 'student_number' => null, 'role' => 'ADMIN'],
            ['name' => 'John Faculty', 'email' => 'faculty@ccs.edu', 'student_number' => null, 'role' => 'FACULTY', 'is_sports_faculty' => true],
            ['name' => 'Jane Officer', 'email' => 'officer@ccs.edu', 'student_number' => 'OFC001', 'role' => 'OFFICER'],
            ['name' => 'Alex Student', 'email' => 'student@ccs.edu', 'student_number' => '1', 'role' => 'STUDENT'],
        ];

        foreach ($users as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'student_number' => $data['student_number'],
                    'password' => $password,
                    'password_set_at' => now(),
                    'role' => $data['role'],
                    'is_sports_faculty' => $data['is_sports_faculty'] ?? false,
                ]
            );

            if (in_array($data['role'], ['STUDENT', 'OFFICER'], true)) {
                StudentProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'height_cm' => 170,
                        'weight_kg' => 65,
                        'course' => 'BSCS',
                        'year_level' => '2nd yr',
                        'academic_semester' => 1,
                        'section' => 'A',
                        'academic_standing' => 'Regular',
                        'sports_interests' => ['basketball', 'volleyball'],
                        'activity_interests' => ['hackathon', 'chess'],
                    ]
                );

                foreach (
                    [
                        ['skill' => 'Basketball', 'proficiency_level' => 'Intermediate'],
                        ['skill' => 'Programming', 'proficiency_level' => 'Advanced'],
                    ] as $sk
                ) {
                    StudentSkillEntry::updateOrCreate(
                        ['user_id' => $user->id, 'skill' => $sk['skill']],
                        ['proficiency_level' => $sk['proficiency_level']]
                    );
                }
            }
        }

        $activities = [
            ['name' => 'Basketball', 'type' => 'sport', 'criteria' => ['min_height' => 160]],
            ['name' => 'Volleyball', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Hackathon 2026', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Chess Club', 'type' => 'activity', 'criteria' => []],
        ];

        foreach ($activities as $data) {
            Activity::updateOrCreate(
                ['name' => $data['name']],
                array_merge($data, ['is_active' => true])
            );
        }

        $adminUser = User::where('email', 'admin@ccs.edu')->first();
        if ($adminUser && AuditLog::query()->count() === 0) {
            $samples = [
                ['created', 'Student: Alex Student (#1)', now()->subDays(3)],
                ['updated', 'Student/officer role → OFFICER: Jane Officer (#OFC001)', now()->subDays(2)],
                ['deleted', 'Student: Archived record (#9999)', now()->subDay()],
                ['created', 'Faculty account: John Faculty (faculty@ccs.edu)', now()->subHours(20)],
                ['updated', 'Announcement: Upcoming Hackathon 2026', now()->subHours(6)],
            ];
            foreach ($samples as [$action, $target, $at]) {
                AuditLog::query()->insert([
                    'action' => $action,
                    'target' => $target,
                    'performer_id' => $adminUser->id,
                    'created_at' => $at,
                    'updated_at' => $at,
                ]);
            }
        }

        $facultyUser = User::where('email', 'faculty@ccs.edu')->first();
        if ($facultyUser) {
            Announcement::updateOrCreate(
                ['title' => 'Upcoming Hackathon 2026'],
                [
                    'user_id' => $facultyUser->id,
                    'content' => 'Join us for the annual CCS Hackathon on March 20-21, 2026. Prizes and registration details will be posted soon.',
                    'tag' => 'event',
                    'image_path' => null,
                ]
            );
        }

        $this->call(CcsCourseWorkspaceDemoSeeder::class);
        $this->call(StudentClassScheduleSeeder::class);
        $this->call(MerchandiseCatalogSeeder::class);
        $this->call(ClassListIrregularStudentsSeeder::class);

        $this->command->info('✓ Seed data created.');
    }
}
