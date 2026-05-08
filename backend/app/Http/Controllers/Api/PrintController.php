<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\CashTransaction;
use Illuminate\Http\Request;

class PrintController extends Controller
{
    /**
     * Print a single bill receipt.
     */
    public function bill(Bill $bill)
    {
        try {
            $bill->load(['category', 'payments.paymentChannel']);
            return view('print.bill', compact('bill'));
        } catch (\Exception $e) {
            \Log::error('Print bill error: ' . $e->getMessage(), [
                'bill_id' => $bill->id,
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->view('errors.500', [
                'message' => 'Failed to generate bill receipt',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Print the bills list (with optional filters).
     */
    public function billsList(Request $request)
    {
        try {
            $query = Bill::with(['category', 'payments.paymentChannel'])
                ->orderByDesc('created_at');

            if ($search = $request->query('search')) {
                $s = "%{$search}%";
                $query->where(function ($q) use ($s) {
                    $q->where('transaction_id', 'like', $s)
                      ->orWhere('biller_name', 'like', $s)
                      ->orWhere('account_number', 'like', $s)
                      ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $s));
                });
            }

            if ($categoryId = $request->query('category_id')) {
                $query->where('bill_category_id', $categoryId);
            }

            if ($status = $request->query('status')) {
                $query->where('status', $status);
            }

            if ($month = $request->query('month')) {
                [$year, $mon] = explode('-', $month);
                $query->whereRaw("EXTRACT(YEAR FROM created_at) = ?", [$year])
                      ->whereRaw("EXTRACT(MONTH FROM created_at) = ?", [$mon]);
            }

            $bills = $query->get();

            $filters = [
                'search'   => $request->query('search'),
                'status'   => $request->query('status'),
                'category' => $request->query('category_name'),
            ];

            return view('print.bills-list', compact('bills', 'filters'));
        } catch (\Exception $e) {
            \Log::error('Print bills list error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->view('errors.500', [
                'message' => 'Failed to generate bills report',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }

    /**
     * Print all transactions — bills + cash in + cash out combined.
     */
    public function allTransactions(Request $request)
    {
        try {
            $month = $request->query('month');

            // Bills
            $billQuery = Bill::with(['category'])->orderByDesc('created_at');
            if ($month) {
                [$y, $m] = explode('-', $month);
                $billQuery->whereRaw("EXTRACT(YEAR FROM created_at) = ?", [$y])
                          ->whereRaw("EXTRACT(MONTH FROM created_at) = ?", [$m]);
            }
            if ($bs = $request->query('bill_status')) {
                $billQuery->where('status', $bs);
            }
            $bills = $billQuery->get();

            // Cash - PostgreSQL compatible ordering
            $cashQuery = CashTransaction::orderByRaw("
                CASE status 
                    WHEN 'pending' THEN 1 
                    WHEN 'paid' THEN 2 
                    WHEN 'settled' THEN 3 
                    ELSE 4 
                END
            ")->orderByDesc('transaction_date');
            
            if ($month) {
                [$y, $m] = explode('-', $month);
                $cashQuery->whereRaw("EXTRACT(YEAR FROM transaction_date) = ?", [$y])
                          ->whereRaw("EXTRACT(MONTH FROM transaction_date) = ?", [$m]);
            }
            if ($cs = $request->query('cash_status')) {
                $cashQuery->where('status', $cs);
            }
            $cashTransactions = $cashQuery->get();

            return view('print.all-transactions', compact('bills', 'cashTransactions'));
        } catch (\Exception $e) {
            \Log::error('Print all transactions error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->view('errors.500', [
                'message' => 'Failed to generate report',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
    public function cashList(Request $request)
    {
        try {
            // PostgreSQL compatible ordering
            $query = CashTransaction::orderByRaw("
                CASE status 
                    WHEN 'pending' THEN 1 
                    WHEN 'paid' THEN 2 
                    WHEN 'settled' THEN 3 
                    ELSE 4 
                END
            ")->orderByDesc('transaction_date');

            if ($type = $request->query('type')) {
                $query->where('type', $type);
            }

            if ($status = $request->query('status')) {
                $query->where('status', $status);
            }

            if ($month = $request->query('month')) {
                [$year, $mon] = explode('-', $month);
                $query->whereRaw("EXTRACT(YEAR FROM transaction_date) = ?", [$year])
                      ->whereRaw("EXTRACT(MONTH FROM transaction_date) = ?", [$mon]);
            }

            $transactions = $query->get();

            $filters = [
                'type'   => $request->query('type', 'all'),
                'status' => $request->query('status'),
                'month'  => $request->query('month'),
            ];

            return view('print.cash-list', compact('transactions', 'filters'));
        } catch (\Exception $e) {
            \Log::error('Print cash list error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->view('errors.500', [
                'message' => 'Failed to generate cash transactions report',
                'error' => config('app.debug') ? $e->getMessage() : null
            ], 500);
        }
    }
}
