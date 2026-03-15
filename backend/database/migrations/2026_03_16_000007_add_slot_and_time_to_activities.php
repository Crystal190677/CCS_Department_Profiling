<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->string('time_slot')->nullable()->after('description'); // e.g. "MWF 3-5PM" for conflict check
            $table->unsignedInteger('max_enrollees')->nullable()->after('time_slot');
            $table->unsignedInteger('reserve_slots')->nullable()->after('max_enrollees'); // waitlist capacity
        });
    }

    public function down(): void
    {
        Schema::table('activities', function (Blueprint $table) {
            $table->dropColumn(['time_slot', 'max_enrollees', 'reserve_slots']);
        });
    }
};
