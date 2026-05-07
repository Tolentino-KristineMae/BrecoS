<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_transactions', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['cash_in', 'cash_out']);   // direction
            $table->string('transaction_code')->unique()->index(); // e.g. CIN-20260504-0001
            $table->string('person_name');                   // name of sender/receiver
            $table->decimal('amount', 12, 2);                // principal amount
            $table->decimal('fee_amount', 12, 2)->default(0);
            $table->decimal('deduction_amount', 12, 2)->default(0);
            $table->decimal('tubo', 12, 2)->default(0);      // fee - deduction
            $table->enum('status', ['pending', 'done'])->default('pending');
            $table->text('remarks')->nullable();
            $table->date('transaction_date');                // auto today
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transactions');
    }
};
