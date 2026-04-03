<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ccs_course_posts', function (Blueprint $table) {
            $table->id();
            $table->string('course_code', 32)->index();
            $table->string('post_type', 32); // announcement | module | activity
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('professor_name', 120)->nullable();
            $table->timestamps();
        });

        Schema::create('ccs_course_assignments', function (Blueprint $table) {
            $table->id();
            $table->string('course_code', 32)->index();
            $table->string('assignment_kind', 32); // activity | quiz
            $table->string('title');
            $table->text('description')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamps();
        });

        Schema::create('ccs_course_todos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('course_code', 32)->index();
            $table->string('title');
            $table->timestamp('due_at')->nullable();
            $table->boolean('is_completed')->default(false);
            $table->timestamps();
        });

        Schema::create('ccs_course_scores', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('course_code', 32)->index();
            $table->string('assessment_title');
            $table->decimal('points_earned', 8, 2);
            $table->decimal('points_max', 8, 2);
            $table->decimal('percentage', 5, 2);
            $table->date('graded_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ccs_course_scores');
        Schema::dropIfExists('ccs_course_todos');
        Schema::dropIfExists('ccs_course_assignments');
        Schema::dropIfExists('ccs_course_posts');
    }
};
