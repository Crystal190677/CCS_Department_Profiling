<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_skill_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('skill', 100);
            $table->string('proficiency_level', 50)->nullable(); // e.g. Beginner, Intermediate, Advanced, Expert
            $table->string('portfolio_url', 500)->nullable();
            $table->string('github_url', 500)->nullable();
            $table->foreignId('endorsed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('endorsed_at')->nullable();
            $table->foreignId('disputed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('disputed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_skill_entries');
    }
};
