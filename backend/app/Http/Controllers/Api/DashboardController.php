<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BillPayment;
use App\Models\CashTransaction;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    /**
     * Unified dashboard endpoint - returns all dashboard data in a single request.
     * OPTIMIZED: Combines bill stats, cash summary, and tubo summary into one response.
     * Reduces HTTP round-trips from 4 to 1.
     */
    public function summary(Request $request): JsonResponse
    {
        $month = $request->query('month');
        
        // ── Bill Stats (optimized with single query) ──────────────────────
        $billStats = DB::selectOne("
            SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN status = 'paid' THEN 1 END) as paid,
                COUNT(CASE WHEN status = 'partial' THEN 1 END) as partial,
                COUNT(CASE WHEN status = 'unpaid' THEN 1 END) as unpaid,
                COALESCE(SUM(total_amount), 0) as total_amount,
                COALESCE(SUM(amount_paid), 0) as total_paid
            FROM bills
        ");

        $recentBills = Bill::with('category')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['id', 'transaction_id', 'bill_category_id', 'total_amount', 'due_date', 'status', 'created_at']);

        // ── Cash Summary (optimized with single query) ────────────────────
        $cashQuery = "
            SELECT 
                type,
                status,
                COUNT(*) as count,
                COALESCE(SUM(amount), 0) as total_amount,
                COALESCE(SUM(tubo), 0) as total_tubo
            FROM cash_transactions
        ";
        
        if ($month) {
            [$year, $mon] = explode('-', $month);
            $cashQuery .= " WHERE EXTRACT(YEAR FROM transaction_date) = {$year} AND EXTRACT(MONTH FROM transaction_date) = {$mon}";
        }
        
        $cashQuery .= " GROUP BY type, status";
        
        $cashRows = DB::select($cashQuery);
        $cashSummary = ['cash_in' => null, 'cash_out' => null];

        foreach (['cash_in', 'cash_out'] as $type) {
            $typeRows = collect($cashRows)->where('type', $type);
            $pendingRow = $typeRows->firstWhere('status', 'pending');
            
            $cashSummary[$type] = [
                'total_count'    => $typeRows->sum('count'),
                'total_amount'   => (float) $typeRows->sum('total_amount'),
                'total_tubo'     => (float) $typeRows->sum('total_tubo'),
                'pending_amount' => (float) ($pendingRow->total_amount ?? 0),
                'pending_count'  => (int) ($pendingRow->count ?? 0),
                'paid_count'     => (int) ($typeRows->firstWhere('status', 'paid')->count ?? 0),
                'settled_count'  => (int) ($typeRows->firstWhere('status', 'settled')->count ?? 0),
            ];
        }

        // ── Tubo Summary (optimized with UNION query) ─────────────────────
        $monthWhereBill = '';
        $monthWhereCash = '';
        if ($month) {
            [$year, $mon] = explode('-', $month);
            $monthWhereBill = "AND EXTRACT(YEAR FROM date_paid) = {$year} AND EXTRACT(MONTH FROM date_paid) = {$mon}";
            $monthWhereCash = "AND EXTRACT(YEAR FROM transaction_date) = {$year} AND EXTRACT(MONTH FROM transaction_date) = {$mon}";
        }

        $tuboTotalsQuery = "
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

        $tuboResults = DB::select($tuboTotalsQuery);
        $billTubo = collect($tuboResults)->firstWhere('source', 'bill');
        $cashTubo = collect($tuboResults)->firstWhere('source', 'cash');

        $totalTubo = (float) ($billTubo->total_tubo ?? 0) + (float) ($cashTubo->total_tubo ?? 0);

        // Calculate tier progress
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

        $tuboSummary = [
            'total_fee'        => (float) ($billTubo->total_fee ?? 0) + (float) ($cashTubo->total_fee ?? 0),
            'total_deduction'  => (float) ($billTubo->total_deduction ?? 0) + (float) ($cashTubo->total_deduction ?? 0),
            'total_tubo'       => $totalTubo,
            'total_payments'   => (int) ($billTubo->total_count ?? 0) + (int) ($cashTubo->total_count ?? 0),
            'bill_tubo'        => (float) ($billTubo->total_tubo ?? 0),
            'cash_tubo'        => (float) ($cashTubo->total_tubo ?? 0),
            'tier_info' => [
                'current_tier'   => $currentTier,
                'tier_progress'  => round($tierProgress, 2),
                'tier_base'      => $tierBase,
                'tier_ceiling'   => $tierCeiling,
                'tiers'          => $tiers,
            ],
        ];

        // ── Monthly History (last 12 months) ──────────────────────────────
        $startDate = now()->subMonths(11)->startOfMonth()->toDateString();
        
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
        
        $monthlyData = collect($monthlyResults)
            ->groupBy('month')
            ->map(function ($group, $month) {
                $first = $group->first();
                return [
                    'month'       => $month,
                    'month_label' => $first->month_label,
                    'bill_tubo'   => (float) $group->sum('bill_tubo'),
                    'cash_tubo'   => (float) $group->sum('cash_tubo'),
                    'total_tubo'  => (float) $group->sum('bill_tubo') + (float) $group->sum('cash_tubo'),
                    'bill_count'  => (int) $group->sum('bill_count'),
                    'cash_count'  => (int) $group->sum('cash_count'),
                ];
            })
            ->sortKeysDesc()
            ->values();

        // ── Combined Response ──────────────────────────────────────────────
        return response()->json([
            'bills' => [
                'total'        => (int) $billStats->total,
                'paid'         => (int) $billStats->paid,
                'partial'      => (int) $billStats->partial,
                'unpaid'       => (int) $billStats->unpaid,
                'total_amount' => (float) $billStats->total_amount,
                'total_paid'   => (float) $billStats->total_paid,
                'total_bal'    => (float) ($billStats->total_amount - $billStats->total_paid),
                'recent'       => $recentBills,
            ],
            'cash' => $cashSummary,
            'tubo' => [
                'totals'  => $tuboSummary,
                'monthly' => $monthlyData,
            ],
        ]);
    }
}
