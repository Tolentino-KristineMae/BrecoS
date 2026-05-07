<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BillPayment;
use App\Models\CashTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TuboController extends Controller
{
    /**
     * Return combined tubo summary (bill payments + settled cash transactions).
     * Optional ?month=YYYY-MM to filter to a specific month.
     * Uses PostgreSQL-compatible SQL (TO_CHAR instead of DATE_FORMAT).
     */
    public function summary(Request $request): JsonResponse
    {
        $month = $request->query('month');

        // ── Bill payment totals ───────────────────────────────────────────
        $billBase = BillPayment::query();
        if ($month) {
            [$year, $mon] = explode('-', $month);
            $billBase->whereYear('date_paid', $year)->whereMonth('date_paid', $mon);
        }
        $billTotals = (clone $billBase)->selectRaw('
            COALESCE(SUM(fee_amount), 0)       as total_fee,
            COALESCE(SUM(deduction_amount), 0) as total_deduction,
            COALESCE(SUM(tubo), 0)             as total_tubo,
            COUNT(*)                           as total_payments
        ')->first();

        // ── Settled cash transaction totals ───────────────────────────────
        $cashBase = CashTransaction::where('status', 'settled');
        if ($month) {
            [$year, $mon] = explode('-', $month);
            $cashBase->whereYear('transaction_date', $year)->whereMonth('transaction_date', $mon);
        }
        $cashTotals = (clone $cashBase)->selectRaw('
            COALESCE(SUM(fee_amount), 0)       as total_fee,
            COALESCE(SUM(deduction_amount), 0) as total_deduction,
            COALESCE(SUM(tubo), 0)             as total_tubo,
            COUNT(*)                           as total_count
        ')->first();

        // ── Combined totals ───────────────────────────────────────────────
        $combinedTotals = [
            'total_fee'        => (float) $billTotals->total_fee        + (float) $cashTotals->total_fee,
            'total_deduction'  => (float) $billTotals->total_deduction  + (float) $cashTotals->total_deduction,
            'total_tubo'       => (float) $billTotals->total_tubo       + (float) $cashTotals->total_tubo,
            'total_payments'   => (int)   $billTotals->total_payments   + (int)   $cashTotals->total_count,
            'bill_tubo'        => (float) $billTotals->total_tubo,
            'cash_tubo'        => (float) $cashTotals->total_tubo,
        ];

        // ── Per-month history (last 12 months) — bills ────────────────────
        $billMonthly = BillPayment::selectRaw("
            TO_CHAR(date_paid, 'YYYY-MM')  as month,
            TO_CHAR(date_paid, 'Mon YYYY') as month_label,
            COALESCE(SUM(tubo), 0)         as bill_tubo,
            COUNT(*)                       as bill_count
        ")
        ->whereDate('date_paid', '>=', now()->subMonths(11)->startOfMonth())
        ->groupByRaw("TO_CHAR(date_paid, 'YYYY-MM'), TO_CHAR(date_paid, 'Mon YYYY')")
        ->get()
        ->keyBy('month');

        // ── Per-month history (last 12 months) — cash ─────────────────────
        $cashMonthly = CashTransaction::where('status', 'settled')
        ->selectRaw("
            TO_CHAR(transaction_date, 'YYYY-MM')  as month,
            TO_CHAR(transaction_date, 'Mon YYYY') as month_label,
            COALESCE(SUM(tubo), 0)                as cash_tubo,
            COUNT(*)                              as cash_count
        ")
        ->whereDate('transaction_date', '>=', now()->subMonths(11)->startOfMonth())
        ->groupByRaw("TO_CHAR(transaction_date, 'YYYY-MM'), TO_CHAR(transaction_date, 'Mon YYYY')")
        ->get()
        ->keyBy('month');

        // ── Merge into unified monthly list — sorted descending (most recent first) ──
        $allMonths = collect(array_keys($billMonthly->toArray()) + array_keys($cashMonthly->toArray()))
            ->unique()->sortDesc()->values();

        $monthly = $allMonths->map(function ($m) use ($billMonthly, $cashMonthly) {
            $b = $billMonthly->get($m);
            $c = $cashMonthly->get($m);
            $label = $b?->month_label ?? $c?->month_label
                ?? \Carbon\Carbon::createFromFormat('Y-m', $m)->format('M Y');
            return [
                'month'       => $m,
                'month_label' => $label,
                'bill_tubo'   => (float) ($b?->bill_tubo ?? 0),
                'cash_tubo'   => (float) ($c?->cash_tubo ?? 0),
                'total_tubo'  => (float) ($b?->bill_tubo ?? 0) + (float) ($c?->cash_tubo ?? 0),
                'bill_count'  => (int)   ($b?->bill_count ?? 0),
                'cash_count'  => (int)   ($c?->cash_count ?? 0),
            ];
        })->values();

        return response()->json([
            'totals'  => $combinedTotals,
            'monthly' => $monthly,
        ]);
    }
}
