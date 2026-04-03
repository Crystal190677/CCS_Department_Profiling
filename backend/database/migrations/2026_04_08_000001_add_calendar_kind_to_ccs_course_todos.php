<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ccs_course_todos', function (Blueprint $table) {
            $table->string('calendar_kind', 32)->nullable()->after('is_completed');
        });
    }

    public function down(): void
    {
        Schema::table('ccs_course_todos', function (Blueprint $table) {
            $table->dropColumn('calendar_kind');
        });
    }
};
