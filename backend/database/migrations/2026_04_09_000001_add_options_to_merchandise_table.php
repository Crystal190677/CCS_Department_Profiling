<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('merchandise', function (Blueprint $table) {
            $table->string('category_label', 120)->nullable()->after('description');
            $table->json('available_colors')->nullable()->after('category_label');
            $table->json('available_sizes')->nullable()->after('available_colors');
        });
    }

    public function down(): void
    {
        Schema::table('merchandise', function (Blueprint $table) {
            $table->dropColumn(['category_label', 'available_colors', 'available_sizes']);
        });
    }
};
