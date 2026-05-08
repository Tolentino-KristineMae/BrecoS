<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Add indexes for tubo summary queries
        Schema::table('bill_payments', function (Blueprint $table) {
            $table->index('date_paid');
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->index('transaction_date');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::table('bill_payments', function (Blueprint $table) {
            $table->dropIndex(['date_paid']);
        });

        Schema::table('cash_transactions', function (Blueprint $table) {
            $table->dropIndex(['transaction_date']);
            $table->dropIndex(['status']);
        });
    }
};
