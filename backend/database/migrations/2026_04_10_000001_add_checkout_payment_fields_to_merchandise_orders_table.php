<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchandise_orders', function (Blueprint $table) {
            $table->string('payer_full_name')->nullable();
            $table->string('section', 120)->nullable();
            $table->string('course', 120)->nullable();
            $table->string('gcash_reference', 32)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('merchandise_orders', function (Blueprint $table) {
            $table->dropColumn(['payer_full_name', 'section', 'course', 'gcash_reference']);
        });
    }
};
