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
            ['name' => 'Jane Officer', 'email' => 'officer@ccs.edu', 'student_number' => '2299998', 'role' => 'OFFICER'],
            ['name' => 'Alex Student', 'email' => 'student@ccs.edu', 'student_number' => '2299999', 'role' => 'STUDENT'],
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
                        'activity_interests' => ['programming', 'basketball'],
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
            ['name' => 'Programming', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Mr. and Ms. Sportsfest', 'type' => 'event', 'criteria' => []],
            ['name' => 'Cheerdance', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Basketball', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Volleyball', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Badminton', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Table Tennis', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Track and Field', 'type' => 'sport', 'criteria' => []],
            ['name' => 'Mobile Competition', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Spelling Bee', 'type' => 'event', 'criteria' => []],
            ['name' => 'General Knowledge Quiz', 'type' => 'event', 'criteria' => []],
            ['name' => 'Science Quiz Bowl', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Chess Club', 'type' => 'activity', 'criteria' => []],
            ['name' => 'Esports / Online Games', 'type' => 'activity', 'criteria' => []],
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
                ['created', 'Student: Alex Student (#2299999)', now()->subDays(3)],
                ['updated', 'Student/officer role → OFFICER: Jane Officer (#2299998)', now()->subDays(2)],
                ['deleted', 'Student: Archived record (#9999)', now()->subDay()],
                ['created', 'Merchandise catalog seeded', now()->subHours(20)],
                ['updated', 'Announcement: Intramurals & sportsfest schedule', now()->subHours(6)],
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

        if ($adminUser) {
            Announcement::updateOrCreate(
                ['title' => 'Intramurals & Mr. and Ms. Sportsfest'],
                [
                    'user_id' => $adminUser->id,
                    'content' => 'Stay tuned for Cheerdance, team sports (Basketball, Volleyball, Badminton, Table Tennis, Track and Field), and the Mr. and Ms. Sportsfest. Registration opens through the student portal.',
                    'tag' => 'event',
                    'image_path' => null,
                ]
            );
        }

        $this->call(CcsCourseWorkspaceDemoSeeder::class);
        $this->call(StudentClassScheduleSeeder::class);
        $this->call(MerchandiseCatalogSeeder::class);
        
        // This will generate exactly 500 BSIT and 500 BSCS students (1,000 total)
        $this->call(StudentSeeder::class);
        
        // Commenting these out to maintain the exact 1,000 student requirement 
        // $this->call(StudentRosterSeeder::class);
        // $this->call(ClassListIrregularStudentsSeeder::class);

        $this->command->info('✓ Seed data created.');
    }
}
