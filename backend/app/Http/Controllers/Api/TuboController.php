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
     * OPTIMIZED: Uses single UNION query for totals and monthly data.
     */
    public function summary(Request $request): JsonResponse
    {
        $month = $request->query('month');
        $startDate = now()->subMonths(11)->startOfMonth()->toDateString();

        // ── Build WHERE clauses for month filter ──────────────────────────
        $monthWhereBill = '';
        $monthWhereCash = '';
        if ($month) {
            [$year, $mon] = explode('-', $month);
            $monthWhereBill = "AND EXTRACT(YEAR FROM date_paid) = {$year} AND EXTRACT(MONTH FROM date_paid) = {$mon}";
            $monthWhereCash = "AND EXTRACT(YEAR FROM transaction_date) = {$year} AND EXTRACT(MONTH FROM transaction_date) = {$mon}";
        }

        // ── Combined totals query (single query with UNION) ───────────────
        $totalsQuery = "
            SELECT 
                'bill' as source,
                COALESCE(SUM(fee_amount), 0) as total_fee,
                COALESCE(SUM(deduction_amount), 0) as total_deduction,
                COALESCE(SUM(tubo), 0) as total_tubo,
                COUNT(*) as total_count
            FROM bill_payments
            WHERE 1=1 {$monthWhereBill}
            
            UNION ALL
            
            SELECT 
                'cash' as source,
                COALESCE(SUM(fee_amount), 0) as total_fee,
                COALESCE(SUM(deduction_amount), 0) as total_deduction,
                COALESCE(SUM(tubo), 0) as total_tubo,
                COUNT(*) as total_count
            FROM cash_transactions
            WHERE status = 'settled' {$monthWhereCash}
        ";

        $totalsResults = DB::select($totalsQuery);
        
        $billTotals = collect($totalsResults)->firstWhere('source', 'bill');
        $cashTotals = collect($totalsResults)->firstWhere('source', 'cash');

        $combinedTotals = [
            'total_fee'        => (float) ($billTotals->total_fee ?? 0) + (float) ($cashTotals->total_fee ?? 0),
            'total_deduction'  => (float) ($billTotals->total_deduction ?? 0) + (float) ($cashTotals->total_deduction ?? 0),
            'total_tubo'       => (float) ($billTotals->total_tubo ?? 0) + (float) ($cashTotals->total_tubo ?? 0),
            'total_payments'   => (int) ($billTotals->total_count ?? 0) + (int) ($cashTotals->total_count ?? 0),
            'bill_tubo'        => (float) ($billTotals->total_tubo ?? 0),
            'cash_tubo'        => (float) ($cashTotals->total_tubo ?? 0),
        ];

        // ── Calculate tier progress (moved from frontend) ─────────────────
        $totalTubo = $combinedTotals['total_tubo'];
        $tiers = [
            ['goal' => 1000, 'label' => '₱1k'],
            ['goal' => 2000, 'label' => '₱2k'],
            ['goal' => 3000, 'label' => '₱3k'],
        ];

        $currentTier = 0;
        $tierProgress = 0;
        $tierBase = 0;
        $tierCeiling = 1000;

        foreach ($tiers as $index => $tier) {
            if ($totalTubo >= $tier['goal']) {
                $currentTier = $index + 1;
            }
        }

        if ($currentTier < count($tiers)) {
            $tierBase = $currentTier > 0 ? $tiers[$currentTier - 1]['goal'] : 0;
            $tierCeiling = $tiers[$currentTier]['goal'];
            $tierProgress = (($totalTubo - $tierBase) / ($tierCeiling - $tierBase)) * 100;
            $tierProgress = max(0, min(100, $tierProgress));
        } else {
            $tierProgress = 100;
            $tierBase = $tiers[count($tiers) - 1]['goal'];
            $tierCeiling = $tierBase;
        }

        $combinedTotals['tier_info'] = [
            'current_tier' => $currentTier,
            'tier_progress' => round($tierProgress, 2),
            'tier_base' => $tierBase,
            'tier_ceiling' => $tierCeiling,
            'tiers' => $tiers,
        ];

        // ── Monthly history (single UNION query) ──────────────────────────
        $monthlyQuery = "
            SELECT 
                TO_CHAR(date_paid, 'YYYY-MM') as month,
                TO_CHAR(date_paid, 'Mon YYYY') as month_label,
                COALESCE(SUM(tubo), 0) as bill_tubo,
                0 as cash_tubo,
                COUNT(*) as bill_count,
                0 as cash_count
            FROM bill_payments
            WHERE date_paid >= '{$startDate}'
            GROUP BY TO_CHAR(date_paid, 'YYYY-MM'), TO_CHAR(date_paid, 'Mon YYYY')
            
            UNION ALL
            
            SELECT 
                TO_CHAR(transaction_date, 'YYYY-MM') as month,
                TO_CHAR(transaction_date, 'Mon YYYY') as month_label,
                0 as bill_tubo,
                COALESCE(SUM(tubo), 0) as cash_tubo,
                0 as bill_count,
                COUNT(*) as cash_count
            FROM cash_transactions
            WHERE status = 'settled' AND transaction_date >= '{$startDate}'
            GROUP BY TO_CHAR(transaction_date, 'YYYY-MM'), TO_CHAR(transaction_date, 'Mon YYYY')
        ";

        $monthlyResults = DB::select($monthlyQuery);
        
        // Aggregate by month
        $monthlyData = collect($monthlyResults)
            ->groupBy('month')
            ->map(function ($group, $month) {
                $first = $group->first();
                return [
                    'month' => $month,
                    'month_label' => $first->month_label,
                    'bill_tubo' => (float) $group->sum('bill_tubo'),
                    'cash_tubo' => (float) $group->sum('cash_tubo'),
                    'total_tubo' => (float) $group->sum('bill_tubo') + (float) $group->sum('cash_tubo'),
                    'bill_count' => (int) $group->sum('bill_count'),
                    'cash_count' => (int) $group->sum('cash_count'),
                ];
            })
            ->sortKeysDesc()
            ->values();

        return response()->json([
            'totals'  => $combinedTotals,
            'monthly' => $monthlyData,
        ]);
    }
}
