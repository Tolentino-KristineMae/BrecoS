<?php

use App\Http\Controllers\Api\PrintController;
use Illuminate\Support\Facades\Route;

Route::get('/', fn () => redirect('/print/bills'));

// ── Print routes (web, returns Blade HTML) ────────────────────────────────────
Route::prefix('print')->name('print.')->group(function () {
    Route::get('bills',        [PrintController::class, 'billsList'])->name('bills');
    Route::get('bills/{bill}', [PrintController::class, 'bill'])->name('bill');
    Route::get('cash',         [PrintController::class, 'cashList'])->name('cash');
    Route::get('all',          [PrintController::class, 'allTransactions'])->name('all');
});
