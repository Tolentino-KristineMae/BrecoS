<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillCategoryController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\BillPaymentController;
use App\Http\Controllers\Api\CashTransactionController;
use App\Http\Controllers\Api\PaymentChannelController;
use App\Http\Controllers\Api\TuboController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Breco System API Routes
|--------------------------------------------------------------------------
*/

// Health check endpoint (no auth required)
Route::get('health', function () {
    return response()->json([
        'status' => 'healthy',
        'api_version' => 'v1',
        'timestamp' => now()->toIso8601String(),
    ]);
});

Route::prefix('v1')->group(function () {

    // ── Auth (public) ─────────────────────────────────────────────────────
    Route::post('auth/register', [AuthController::class, 'register']);
    Route::post('auth/login',    [AuthController::class, 'login']);

    // ── Protected routes ──────────────────────────────────────────────────
    Route::middleware('auth:sanctum')->group(function () {

        // Auth
        Route::get('auth/me',     [AuthController::class, 'me']);
        Route::post('auth/logout', [AuthController::class, 'logout']);

        // ── Bill Categories ───────────────────────────────────────────────
        Route::apiResource('categories', BillCategoryController::class);

        // ── Payment Channels ──────────────────────────────────────────────
        Route::apiResource('payment-channels', PaymentChannelController::class);

        // ── Bills ─────────────────────────────────────────────────────────
        Route::get('bills/search',      [BillController::class, 'searchByTicket']);
        Route::get('bills/suggestions', [BillController::class, 'suggestions']);
        Route::get('bills/stats',       [BillController::class, 'stats']);
        Route::apiResource('bills', BillController::class);

        // ── Bill Payments (nested under bills) ────────────────────────────
        Route::apiResource('bills.payments', BillPaymentController::class);

        // ── Tubo Summary ──────────────────────────────────────────────────
        Route::get('tubo/summary', [TuboController::class, 'summary']);

        // ── Cash Transactions ─────────────────────────────────────────────
        Route::get('cash/summary', [CashTransactionController::class, 'summary']);
        Route::delete('cash/{cashTransaction}/files/{file}', [CashTransactionController::class, 'destroyFile']);
        Route::apiResource('cash', CashTransactionController::class)->parameters(['cash' => 'cashTransaction']);
    });
});
