<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->decimal('current_gpa', 4, 2)->nullable()->after('year_level');
            $table->json('gpa_per_semester')->nullable()->after('current_gpa'); // e.g. [{"semester":"1-1","gpa":3.5}, ...]
            $table->string('academic_standing', 50)->nullable()->after('gpa_per_semester'); // Regular, Irregular, Probationary
            $table->string('section', 50)->nullable()->after('academic_standing');
            $table->unsignedSmallInteger('failed_units')->nullable()->after('section');
            $table->unsignedSmallInteger('incomplete_grades')->nullable()->after('failed_units');
            $table->unsignedSmallInteger('enrolled_units')->nullable()->after('incomplete_grades');
        });
    }

    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'current_gpa',
                'gpa_per_semester',
                'academic_standing',
                'section',
                'failed_units',
                'incomplete_grades',
                'enrolled_units',
            ]);
        });
    }
};
