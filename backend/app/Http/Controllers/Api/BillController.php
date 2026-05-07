<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillController extends Controller
{
    /**
     * List bills with optional search by ticket_number, category, status.
     * Supports pagination for performance.
     */
    public function index(Request $request): JsonResponse
    {
        $query = Bill::with(['category', 'payments.paymentChannel'])
            ->orderByDesc('created_at');

        // ── Search / Filter ──────────────────────────────────────────────────
        if ($search = $request->query('search')) {
            $s = "%{$search}%";
            $query->where(function ($q) use ($s) {
                $q->where('transaction_id', 'like', $s)
                  ->orWhere('biller_name', 'like', $s)
                  ->orWhere('account_number', 'like', $s)
                  ->orWhere('notes', 'like', $s)
                  ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $s));
            });
        }

        if ($categoryId = $request->query('category_id')) {
            $query->where('bill_category_id', $categoryId);
        }

        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }

        if ($from = $request->query('from')) {
            $query->whereDate('created_at', '>=', $from);
        }

        if ($to = $request->query('to')) {
            $query->whereDate('created_at', '<=', $to);
        }

        // Filter by month (YYYY-MM)
        if ($month = $request->query('month')) {
            [$year, $mon] = explode('-', $month);
            $query->whereYear('created_at', $year)->whereMonth('created_at', $mon);
        }

        $perPage = (int) $request->query('per_page', 20);
        $bills   = $query->paginate($perPage);

        return response()->json($bills);
    }

    /**
     * Create a new bill record and auto-generate transaction ID.
     */
    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'bill_category_id' => 'required|exists:bill_categories,id',
            'biller_name'      => 'nullable|string|max:150',
            'account_number'   => 'nullable|string|max:100',
            'total_amount'     => 'required|numeric|min:0.01',
            'due_date'         => 'nullable|date',
            'notes'            => 'nullable|string|max:500',
        ]);

        $data['transaction_id'] = Bill::generateTicketNumber((int) $data['bill_category_id']);
        $data['amount_paid']    = 0;
        $data['status']         = 'unpaid';

        $bill = Bill::create($data);
        $bill->load('category');

        return response()->json($bill, 201);
    }

    /**
     * Show a single bill with all its payments.
     */
    public function show(Bill $bill): JsonResponse
    {
        $bill->load(['category', 'payments.paymentChannel']);

        // Aggregate payment tubo totals server-side
        $bill->setAttribute('payment_totals', [
            'total_fee'        => (float) $bill->payments->sum('fee_amount'),
            'total_deduction'  => (float) $bill->payments->sum('deduction_amount'),
            'total_tubo'       => (float) $bill->payments->sum('tubo'),
        ]);

        return response()->json($bill);
    }

    /**
     * Update bill details (not payments — those go through BillPaymentController).
     */
    public function update(Request $request, Bill $bill): JsonResponse
    {
        $data = $request->validate([
            'bill_category_id' => 'sometimes|required|exists:bill_categories,id',
            'biller_name'      => 'nullable|string|max:150',
            'account_number'   => 'nullable|string|max:100',
            'total_amount'     => 'sometimes|required|numeric|min:0.01',
            'due_date'         => 'nullable|date',
            'notes'            => 'nullable|string|max:500',
        ]);

        $bill->update($data);

        // Recalculate status in case total_amount changed
        $bill->recalculate();
        $bill->load(['category', 'payments.paymentChannel']);

        return response()->json($bill);
    }

    /**
     * Delete a bill and all its payments.
     */
    public function destroy(Bill $bill): JsonResponse
    {
        $bill->delete();
        return response()->json(['message' => 'Bill deleted.']);
    }

    /**
     * Search bills across all fields — dedicated fast endpoint.
     */
    public function searchByTicket(Request $request): JsonResponse
    {
        $txn = $request->query('ticket', '');
        $s   = "%{$txn}%";

        $bills = Bill::with(['category', 'payments.paymentChannel'])
            ->where(function ($q) use ($s) {
                $q->where('transaction_id', 'like', $s)
                  ->orWhere('biller_name', 'like', $s)
                  ->orWhere('account_number', 'like', $s)
                  ->orWhere('notes', 'like', $s)
                  ->orWhereHas('category', fn ($c) => $c->where('name', 'like', $s));
            })
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        return response()->json($bills);
    }

    /**
     * Aggregated stats for the dashboard — no bill records returned.
     */
    public function stats(): JsonResponse
    {
        $total   = Bill::count();
        $paid    = Bill::where('status', 'paid')->count();
        $partial = Bill::where('status', 'partial')->count();
        $unpaid  = Bill::where('status', 'unpaid')->count();

        $totalAmount = Bill::sum('total_amount');
        $totalPaid   = Bill::sum('amount_paid');

        $recent = Bill::with('category')
            ->orderByDesc('created_at')
            ->limit(8)
            ->get(['id', 'transaction_id', 'bill_category_id', 'total_amount', 'due_date', 'status', 'created_at']);

        return response()->json([
            'total'        => $total,
            'paid'         => $paid,
            'partial'      => $partial,
            'unpaid'       => $unpaid,
            'total_amount' => $totalAmount,
            'total_paid'   => $totalPaid,
            'total_bal'    => $totalAmount - $totalPaid,
            'recent'       => $recent,
        ]);
    }

    /**
     * Return distinct biller names and account numbers for a given category.
     * Used to power autocomplete suggestions in the create bill form.
     */
    public function suggestions(Request $request): JsonResponse
    {
        $categoryId = $request->query('category_id');

        if (!$categoryId) {
            return response()->json(['billers' => [], 'accounts' => []]);
        }

        $billers = Bill::where('bill_category_id', $categoryId)
            ->whereNotNull('biller_name')
            ->where('biller_name', '!=', '')
            ->distinct()
            ->orderBy('biller_name')
            ->pluck('biller_name');

        $accounts = Bill::where('bill_category_id', $categoryId)
            ->whereNotNull('account_number')
            ->where('account_number', '!=', '')
            ->distinct()
            ->orderBy('account_number')
            ->pluck('account_number');

        return response()->json([
            'billers'  => $billers,
            'accounts' => $accounts,
        ]);
    }
}
