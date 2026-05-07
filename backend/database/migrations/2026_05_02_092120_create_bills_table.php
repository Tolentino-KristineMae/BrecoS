<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bills', function (Blueprint $table) {
            $table->id();
            $table->string('ticket_number')->unique()->index(); // e.g. BRC-20260502-0001
            $table->foreignId('bill_category_id')->constrained('bill_categories')->restrictOnDelete();
            $table->decimal('total_amount', 12, 2);            // total bill amount
            $table->decimal('amount_paid', 12, 2)->default(0); // running total of payments
            $table->date('due_date')->nullable();               // for customer reference
            $table->enum('status', ['unpaid', 'partial', 'paid'])->default('unpaid')->index();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bills');
    }
};
