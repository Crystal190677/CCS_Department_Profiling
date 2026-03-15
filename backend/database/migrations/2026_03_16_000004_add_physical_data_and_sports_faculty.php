<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->string('dominant_hand', 50)->nullable()->after('weight_kg');
            $table->string('preferred_position', 100)->nullable()->after('dominant_hand');
        });

        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_sports_faculty')->default(false)->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('student_profiles', function (Blueprint $table) {
            $table->dropColumn(['dominant_hand', 'preferred_position']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_sports_faculty');
        });
    }
};
