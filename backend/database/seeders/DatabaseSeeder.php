<?php

namespace Database\Seeders;

use App\Models\Activity;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('admin123');

        $users = [
            ['name' => 'System Admin', 'email' => 'admin@ccs.edu', 'student_number' => null, 'role' => 'ADMIN'],
            ['name' => 'John Faculty', 'email' => 'faculty@ccs.edu', 'student_number' => null, 'role' => 'FACULTY'],
            ['name' => 'Jane Officer', 'email' => 'officer@ccs.edu', 'student_number' => null, 'role' => 'OFFICER'],
            ['name' => 'Alex Student', 'email' => 'student@ccs.edu', 'student_number' => '2024-001', 'role' => 'STUDENT'],
        ];

        foreach ($users as $data) {
            $user = User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'student_number' => $data['student_number'],
                    'password' => $password,
                    'role' => $data['role'],
                ]
            );

            if ($data['role'] === 'STUDENT') {
                StudentProfile::updateOrCreate(
                    ['user_id' => $user->id],
                    [
                        'height_cm' => 170,
                        'weight_kg' => 65,
                        'course' => 'BS Computer Science',
                        'year_level' => '2',
                        'sports_interests' => ['basketball', 'volleyball'],
                        'activity_interests' => ['hackathon', 'chess'],
                    ]
                );
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

        $this->command->info('✓ Seed data created.');
    }
}
