<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // PostgreSQL: update check constraint to add proof_of_payment
        DB::statement("ALTER TABLE cash_transaction_files DROP CONSTRAINT IF EXISTS cash_transaction_files_file_type_check");
        DB::statement("ALTER TABLE cash_transaction_files ADD CONSTRAINT cash_transaction_files_file_type_check CHECK (file_type IN ('receipt','proof','proof_of_payment'))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE cash_transaction_files DROP CONSTRAINT IF EXISTS cash_transaction_files_file_type_check");
        DB::statement("ALTER TABLE cash_transaction_files ADD CONSTRAINT cash_transaction_files_file_type_check CHECK (file_type IN ('receipt','proof'))");
    }
};
