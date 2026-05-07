<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PaymentChannel;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentChannelController extends Controller
{
    public function index(): JsonResponse
    {
        $channels = PaymentChannel::where('is_active', true)->orderBy('name')->get();
        return response()->json($channels);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'required|string|max:100|unique:payment_channels,name',
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
        ]);

        $channel = PaymentChannel::create($data);
        return response()->json($channel, 201);
    }

    public function show(PaymentChannel $paymentChannel): JsonResponse
    {
        return response()->json($paymentChannel);
    }

    public function update(Request $request, PaymentChannel $paymentChannel): JsonResponse
    {
        $data = $request->validate([
            'name'        => 'sometimes|required|string|max:100|unique:payment_channels,name,' . $paymentChannel->id,
            'description' => 'nullable|string|max:255',
            'is_active'   => 'boolean',
        ]);

        $paymentChannel->update($data);
        return response()->json($paymentChannel);
    }

    public function destroy(PaymentChannel $paymentChannel): JsonResponse
    {
        // Check if payment channel is being used by any bill payments
        if ($paymentChannel->billPayments()->exists()) {
            return response()->json([
                'message' => 'Cannot delete payment channel because it is being used by one or more bill payments.',
                'error' => 'PAYMENT_CHANNEL_IN_USE'
            ], 422);
        }

        $paymentChannel->delete();
        return response()->json(['message' => 'Payment channel deleted successfully.']);
    }
}
