<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::table('users')->where('role', 'FACULTY')->delete();
    }

    public function down(): void
    {
        // Irreversible: faculty accounts are removed.
    }
};
