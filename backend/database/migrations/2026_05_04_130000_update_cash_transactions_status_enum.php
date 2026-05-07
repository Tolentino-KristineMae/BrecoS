<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Rename existing values: done → settled, settled → paid
        DB::statement("UPDATE cash_transactions SET status = 'paid'    WHERE status = 'settled'");
        DB::statement("UPDATE cash_transactions SET status = 'settled' WHERE status = 'done'");

        // Update check constraint: pending → paid → settled
        DB::statement("ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_status_check");
        DB::statement("ALTER TABLE cash_transactions ADD CONSTRAINT cash_transactions_status_check CHECK (status IN ('pending','paid','settled'))");
    }

    public function down(): void
    {
        DB::statement("UPDATE cash_transactions SET status = 'done'    WHERE status = 'settled'");
        DB::statement("UPDATE cash_transactions SET status = 'settled' WHERE status = 'paid'");
        DB::statement("ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_status_check");
        DB::statement("ALTER TABLE cash_transactions ADD CONSTRAINT cash_transactions_status_check CHECK (status IN ('pending','settled','done'))");
    }
};
