<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('merchandise_orders', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('merchandise_id')->constrained('merchandise')->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->decimal('amount', 10, 2);
            $table->string('payment_status')->default('pending'); // pending, paid_online, paid_cash
            $table->string('proof_image_path')->nullable();
            $table->timestamp('submitted_at')->nullable();
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('confirmed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('merchandise_orders');
    }
};
