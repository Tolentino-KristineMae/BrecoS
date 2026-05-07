<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Bill;
use App\Models\BillPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BillPaymentController extends Controller
{
    public function index(Bill $bill): JsonResponse
    {
        $payments = $bill->payments()->with('paymentChannel')->get();
        return response()->json($payments);
    }

    public function store(Request $request, Bill $bill): JsonResponse
    {
        $data = $request->validate([
            'payment_channel_id' => 'required|exists:payment_channels,id',
            'amount'             => 'required|numeric|min:0.01',
            'remarks'            => 'nullable|string|max:500',
            'fee_amount'         => 'nullable|numeric|min:0',
            'deduction_amount'   => 'nullable|numeric|min:0',
            'receipt'            => 'nullable|file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
        ]);

        $remaining = $bill->total_amount - $bill->amount_paid;
        if ($data['amount'] > $remaining) {
            return response()->json([
                'message' => "Payment amount exceeds remaining balance of {$remaining}.",
            ], 422);
        }

        $fee       = (float) ($data['fee_amount']       ?? 0);
        $deduction = (float) ($data['deduction_amount'] ?? 0);
        $tubo      = $fee - $deduction;

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $receiptPath = $request->file('receipt')->store('payment-receipts', 'public');
        }

        $payment = DB::transaction(function () use ($bill, $data, $fee, $deduction, $tubo, $receiptPath) {
            $payment = $bill->payments()->create([
                'payment_channel_id' => $data['payment_channel_id'],
                'amount'             => $data['amount'],
                'date_paid'          => now()->toDateString(),
                'remarks'            => $data['remarks']          ?? null,
                'fee_amount'         => $fee,
                'deduction_amount'   => $deduction,
                'tubo'               => $tubo,
                'receipt_path'       => $receiptPath,
            ]);
            $bill->recalculate();
            return $payment;
        });

        $payment->load('paymentChannel');

        return response()->json([
            'payment' => $payment,
            'bill'    => $bill->fresh(['category', 'payments.paymentChannel']),
        ], 201);
    }

    public function show(Bill $bill, BillPayment $payment): JsonResponse
    {
        $this->ensurePaymentBelongsToBill($bill, $payment);
        $payment->load('paymentChannel');
        return response()->json($payment);
    }

    public function update(Request $request, Bill $bill, BillPayment $payment): JsonResponse
    {
        $this->ensurePaymentBelongsToBill($bill, $payment);

        $data = $request->validate([
            'payment_channel_id' => 'sometimes|required|exists:payment_channels,id',
            'amount'             => 'sometimes|required|numeric|min:0.01',
            'remarks'            => 'nullable|string|max:500',
            'fee_amount'         => 'nullable|numeric|min:0',
            'deduction_amount'   => 'nullable|numeric|min:0',
            'receipt'            => 'nullable|file|mimes:jpg,jpeg,png,pdf,webp|max:102400',
        ]);

        if (isset($data['fee_amount']) || isset($data['deduction_amount'])) {
            $fee       = (float) ($data['fee_amount']       ?? $payment->fee_amount);
            $deduction = (float) ($data['deduction_amount'] ?? $payment->deduction_amount);
            $data['tubo'] = $fee - $deduction;
        }

        if ($request->hasFile('receipt')) {
            if ($payment->receipt_path) {
                Storage::disk('public')->delete($payment->receipt_path);
            }
            $data['receipt_path'] = $request->file('receipt')->store('payment-receipts', 'public');
        }

        unset($data['receipt']);

        DB::transaction(function () use ($bill, $payment, $data) {
            $payment->update($data);
            $bill->recalculate();
        });

        $payment->load('paymentChannel');

        return response()->json([
            'payment' => $payment,
            'bill'    => $bill->fresh(['category', 'payments.paymentChannel']),
        ]);
    }

    public function destroy(Bill $bill, BillPayment $payment): JsonResponse
    {
        $this->ensurePaymentBelongsToBill($bill, $payment);

        DB::transaction(function () use ($bill, $payment) {
            if ($payment->receipt_path) {
                Storage::disk('public')->delete($payment->receipt_path);
            }
            $payment->delete();
            $bill->recalculate();
        });

        return response()->json([
            'message' => 'Payment deleted.',
            'bill'    => $bill->fresh(['category', 'payments.paymentChannel']),
        ]);
    }

    private function ensurePaymentBelongsToBill(Bill $bill, BillPayment $payment): void
    {
        abort_if($payment->bill_id !== $bill->id, 404, 'Payment not found for this bill.');
    }
}
