<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            // Rename ticket_number → transaction_id
            $table->renameColumn('ticket_number', 'transaction_id');

            // Add biller info fields (PostgreSQL doesn't support after(), columns appended at end)
            $table->string('biller_name')->nullable();
            $table->string('account_number')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('bills', function (Blueprint $table) {
            $table->renameColumn('transaction_id', 'ticket_number');
            $table->dropColumn(['biller_name', 'account_number']);
        });
    }
};
