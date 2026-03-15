<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('student_conduct_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 20); // violation, commendation
            $table->string('severity', 20)->nullable(); // minor, major, grave (for violations)
            $table->string('title');
            $table->text('description')->nullable();
            $table->date('recorded_at');
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('dispute_requested_at')->nullable();
            $table->text('dispute_reason')->nullable();
            $table->string('dispute_status', 30)->nullable(); // pending, resolved_upheld, resolved_revised, dismissed
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('resolve_note')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('student_conduct_entries');
    }
};
