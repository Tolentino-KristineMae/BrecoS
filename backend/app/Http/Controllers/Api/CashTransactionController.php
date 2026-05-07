<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CashTransaction;
use App\Models\CashTransactionFile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class CashTransactionController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = CashTransaction::with(['receipts', 'proofs'])
            ->orderByRaw("CASE status WHEN 'pending' THEN 0 WHEN 'paid' THEN 1 WHEN 'settled' THEN 2 ELSE 3 END")
            ->orderByDesc('created_at');

        if ($type = $request->query('type')) {
            $query->where('type', $type);
        }
        if ($status = $request->query('status')) {
            $query->where('status', $status);
        }
        if ($search = $request->query('search')) {
            $s = "%{$search}%";
            $query->where(function ($q) use ($s) {
                $q->where('person_name', 'like', $s)
                  ->orWhere('transaction_code', 'like', $s)
                  ->orWhere('remarks', 'like', $s);
            });
        }
        if ($month = $request->query('month')) {
            [$year, $mon] = explode('-', $month);
            $query->whereYear('transaction_date', $year)
                  ->whereMonth('transaction_date', $mon);
        }

        $perPage = (int) $request->query('per_page', 20);
        return response()->json($query->paginate($perPage));
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'type'             => 'required|in:cash_in,cash_out',
            'person_name'      => 'required|string|max:150',
            'amount'           => 'required|numeric|min:0.01',
            'fee_amount'       => 'nullable|numeric|min:0',
            'deduction_amount' => 'nullable|numeric|min:0',
            'remarks'          => 'nullable|string|max:500',
            'receipts'         => 'nullable|array|max:5',
            'receipts.*'       => 'file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
            'proofs'           => 'nullable|array|max:5',
            'proofs.*'         => 'file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
        ]);

        $fee       = (float) ($data['fee_amount']       ?? 0);
        $deduction = (float) ($data['deduction_amount'] ?? 0);

        $txn = DB::transaction(function () use ($request, $data, $fee, $deduction) {
            $txn = CashTransaction::create([
                'type'             => $data['type'],
                'transaction_code' => CashTransaction::generateCode($data['type']),
                'person_name'      => $data['person_name'],
                'amount'           => $data['amount'],
                'fee_amount'       => $fee,
                'deduction_amount' => $deduction,
                'tubo'             => $fee - $deduction,
                'status'           => 'pending',
                'remarks'          => $data['remarks'] ?? null,
                'transaction_date' => now()->toDateString(),
            ]);

            $this->storeFiles($request, $txn, 'receipts', 'receipt');
            $this->storeFiles($request, $txn, 'proofs',   'proof');

            return $txn;
        });

        return response()->json($txn->load(['receipts', 'proofs', 'proofOfPayments']), 201);
    }

    public function show(CashTransaction $cashTransaction): JsonResponse
    {
        return response()->json($cashTransaction->load(['receipts', 'proofs', 'proofOfPayments']));
    }

    public function update(Request $request, CashTransaction $cashTransaction): JsonResponse
    {
        $data = $request->validate([
            'person_name'              => 'sometimes|required|string|max:150',
            'amount'                   => 'sometimes|required|numeric|min:0.01',
            'fee_amount'               => 'nullable|numeric|min:0',
            'deduction_amount'         => 'nullable|numeric|min:0',
            'remarks'                  => 'nullable|string|max:500',
            'status'                   => 'sometimes|in:pending,paid,settled',
            'new_receipts'             => 'nullable|array',
            'new_receipts.*'           => 'file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
            'new_proofs'               => 'nullable|array',
            'new_proofs.*'             => 'file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
            'new_proof_of_payments'    => 'nullable|array',
            'new_proof_of_payments.*'  => 'file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
        ]);

        DB::transaction(function () use ($request, $cashTransaction, $data) {
            if (isset($data['fee_amount']) || isset($data['deduction_amount'])) {
                $fee       = (float) ($data['fee_amount']       ?? $cashTransaction->fee_amount);
                $deduction = (float) ($data['deduction_amount'] ?? $cashTransaction->deduction_amount);
                $data['tubo'] = $fee - $deduction;
            }

            $cashTransaction->update($data);

            $receiptCount = $cashTransaction->receipts()->count();
            $proofCount   = $cashTransaction->proofs()->count();
            $popCount     = $cashTransaction->proofOfPayments()->count();

            if ($request->hasFile('new_receipts') && ($receiptCount + count($request->file('new_receipts'))) <= 5) {
                $this->storeFiles($request, $cashTransaction, 'new_receipts', 'receipt');
            }
            if ($request->hasFile('new_proofs') && ($proofCount + count($request->file('new_proofs'))) <= 5) {
                $this->storeFiles($request, $cashTransaction, 'new_proofs', 'proof');
            }
            if ($request->hasFile('new_proof_of_payments') && ($popCount + count($request->file('new_proof_of_payments'))) <= 5) {
                $this->storeFiles($request, $cashTransaction, 'new_proof_of_payments', 'proof_of_payment');
            }
        });

        return response()->json($cashTransaction->fresh(['receipts', 'proofs', 'proofOfPayments']));
    }

    public function destroy(CashTransaction $cashTransaction): JsonResponse
    {
        // Delete all files from storage
        foreach ($cashTransaction->files as $file) {
            Storage::disk('public')->delete($file->file_path);
        }
        $cashTransaction->delete();
        return response()->json(['message' => 'Transaction deleted.']);
    }

    public function destroyFile(CashTransaction $cashTransaction, CashTransactionFile $file): JsonResponse
    {
        abort_if($file->cash_transaction_id !== $cashTransaction->id, 404);
        Storage::disk('public')->delete($file->file_path);
        $file->delete();
        return response()->json(['message' => 'File deleted.']);
    }

    /**
     * Summary for tubo tracking — includes cash transactions.
     */
    public function summary(Request $request): JsonResponse
    {
        $month = $request->query('month');

        $query = CashTransaction::query();
        if ($month) {
            [$year, $mon] = explode('-', $month);
            $query->whereYear('transaction_date', $year)
                  ->whereMonth('transaction_date', $mon);
        }

        // Totals grouped by type + status
        $rows = (clone $query)
            ->selectRaw('type, status, COUNT(*) as count, SUM(amount) as total_amount, SUM(tubo) as total_tubo')
            ->groupBy('type', 'status')
            ->get();

        $result = ['cash_in' => null, 'cash_out' => null];

        foreach (['cash_in', 'cash_out'] as $type) {
            $typeRows      = $rows->where('type', $type);
            $pendingRow    = $typeRows->firstWhere('status', 'pending');
            $result[$type] = [
                'total_count'    => $typeRows->sum('count'),
                'total_amount'   => (float) $typeRows->sum('total_amount'),
                'total_tubo'     => (float) $typeRows->sum('total_tubo'),
                'pending_amount' => (float) ($pendingRow?->total_amount ?? 0),
                'pending_count'  => (int)   ($pendingRow?->count        ?? 0),
                'paid_count'     => (int)   ($typeRows->firstWhere('status', 'paid')?->count    ?? 0),
                'settled_count'  => (int)   ($typeRows->firstWhere('status', 'settled')?->count ?? 0),
            ];
        }

        return response()->json($result);
    }

    // ── Private ───────────────────────────────────────────────────────────────

    private function storeFiles(Request $request, CashTransaction $txn, string $field, string $type): void
    {
        if (!$request->hasFile($field)) return;

        foreach ($request->file($field) as $file) {
            $path = $file->store("cash-{$type}s", 'public');
            $txn->files()->create([
                'file_type'     => $type,
                'file_path'     => $path,
                'original_name' => $file->getClientOriginalName(),
            ]);
        }
    }
}
