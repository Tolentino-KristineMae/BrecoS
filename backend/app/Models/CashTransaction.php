<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CashTransaction extends Model
{
    protected $fillable = [
        'type',
        'transaction_code',
        'person_name',
        'amount',
        'fee_amount',
        'deduction_amount',
        'tubo',
        'status',
        'remarks',
        'transaction_date',
    ];

    protected $casts = [
        'amount'           => 'decimal:2',
        'fee_amount'       => 'decimal:2',
        'deduction_amount' => 'decimal:2',
        'tubo'             => 'decimal:2',
        'transaction_date' => 'date:Y-m-d',
    ];

    public function files(): HasMany
    {
        return $this->hasMany(CashTransactionFile::class);
    }

    public function receipts(): HasMany
    {
        return $this->hasMany(CashTransactionFile::class)->where('file_type', 'receipt');
    }

    public function proofs(): HasMany
    {
        return $this->hasMany(CashTransactionFile::class)->where('file_type', 'proof');
    }

    public function proofOfPayments(): HasMany
    {
        return $this->hasMany(CashTransactionFile::class)->where('file_type', 'proof_of_payment');
    }

    /**
     * Generate unique transaction code: CIN-YYYYMMDD-XXXX or COT-YYYYMMDD-XXXX
     */
    public static function generateCode(string $type): string
    {
        $prefix = $type === 'cash_in' ? 'CIN' : 'COT';
        $date   = now()->format('Ymd');
        $full   = "{$prefix}-{$date}-";

        $last = self::where('transaction_code', 'like', "{$full}%")
            ->orderByDesc('transaction_code')
            ->value('transaction_code');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $full . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
