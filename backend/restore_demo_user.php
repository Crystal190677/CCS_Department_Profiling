<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$password = \Illuminate\Support\Facades\Hash::make('password123');
$user = \App\Models\User::updateOrCreate(
    ['email' => 'student@ccs.edu'],
    [
        'name' => 'Alex Student',
        'student_number' => '2299999',
        'password' => $password,
        'password_set_at' => now(),
        'role' => 'STUDENT'
    ]
);

\App\Models\StudentProfile::updateOrCreate(
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
        'activity_interests' => ['programming', 'basketball']
    ]
);

echo "Restored Alex Student!\n";
