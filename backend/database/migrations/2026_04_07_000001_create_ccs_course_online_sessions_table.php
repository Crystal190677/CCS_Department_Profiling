<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ccs_course_online_sessions', function (Blueprint $table) {
            $table->id();
            $table->string('course_code', 32)->index();
            $table->string('title');
            $table->text('meeting_url');
            $table->string('platform', 80)->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ccs_course_online_sessions');
    }
};
