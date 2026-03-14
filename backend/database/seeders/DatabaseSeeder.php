<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $password = Hash::make('admin123');

        $users = [
            ['name' => 'System Admin', 'email' => 'admin@ccs.edu', 'role' => 'ADMIN'],
            ['name' => 'John Faculty', 'email' => 'faculty@ccs.edu', 'role' => 'FACULTY'],
            ['name' => 'Jane Officer', 'email' => 'officer@ccs.edu', 'role' => 'OFFICER'],
            ['name' => 'Alex Student', 'email' => 'student@ccs.edu', 'role' => 'STUDENT'],
        ];

        foreach ($users as $data) {
            User::updateOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => $password,
                    'role' => $data['role'],
                ]
            );
        }

        $this->command->info('✓ Seed data created.');
    }
}
