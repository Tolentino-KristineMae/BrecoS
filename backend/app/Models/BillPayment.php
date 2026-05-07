<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BillPayment extends Model
{
    protected $fillable = [
        'bill_id',
        'payment_channel_id',
        'amount',
        'date_paid',
        'remarks',
        'fee_amount',
        'deduction_amount',
        'tubo',
        'receipt_path',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'date_paid'        => 'date:Y-m-d',
        'fee_amount'       => 'decimal:2',
        'deduction_amount' => 'decimal:2',
        'tubo'             => 'decimal:2',
    ];

    public function getReceiptUrlAttribute(): ?string
    {
        if (!$this->receipt_path) {
            return null;
        }
        
        try {
            return \Storage::url($this->receipt_path);
        } catch (\Exception $e) {
            return null;
        }
    }

    protected $appends = ['receipt_url'];

    public function bill(): BelongsTo
    {
        return $this->belongsTo(Bill::class);
    }

    public function paymentChannel(): BelongsTo
    {
        return $this->belongsTo(PaymentChannel::class);
    }
}
