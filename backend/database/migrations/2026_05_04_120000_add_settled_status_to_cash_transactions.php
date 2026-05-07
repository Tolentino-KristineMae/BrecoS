<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: alter the check constraint on status to add 'settled'
        DB::statement("ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_status_check");
        DB::statement("ALTER TABLE cash_transactions ADD CONSTRAINT cash_transactions_status_check CHECK (status IN ('pending','settled','done'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE cash_transactions DROP CONSTRAINT IF EXISTS cash_transactions_status_check");
        DB::statement("ALTER TABLE cash_transactions ADD CONSTRAINT cash_transactions_status_check CHECK (status IN ('pending','done'))");
    }
};
