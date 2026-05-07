<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cash_transaction_files', function (Blueprint $table) {
            $table->id();
            $table->foreignId('cash_transaction_id')
                  ->constrained('cash_transactions')
                  ->cascadeOnDelete();
            $table->enum('file_type', ['receipt', 'proof']);  // receipt = before, proof = after done
            $table->string('file_path');
            $table->string('original_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cash_transaction_files');
    }
};
