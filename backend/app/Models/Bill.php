<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bill extends Model
{
    protected $fillable = [
        'transaction_id',
        'bill_category_id',
        'biller_name',
        'account_number',
        'total_amount',
        'amount_paid',
        'due_date',
        'status',
        'notes',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'amount_paid'  => 'decimal:2',
        'due_date'     => 'date:Y-m-d',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function category(): BelongsTo
    {
        return $this->belongsTo(BillCategory::class, 'bill_category_id');
    }

    public function payments(): HasMany
    {
        return $this->hasMany(BillPayment::class)->orderBy('date_paid');
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Recalculate amount_paid and update status after a payment change.
     */
    public function recalculate(): void
    {
        $paid = $this->payments()->sum('amount');
        $this->amount_paid = $paid;

        if ($paid <= 0) {
            $this->status = 'unpaid';
        } elseif ($paid < $this->total_amount) {
            $this->status = 'partial';
        } else {
            $this->status = 'paid';
        }

        $this->save();
    }

    /**
     * Derive a short 3-letter category code from the category name.
     * Uses consonants-first logic to keep it readable and unique.
     * e.g. Meralco → MRL, Converge → CVG, PhilHealth → PHL
     */
    public static function categoryCode(string $name): string
    {
        // Strip spaces and special chars, uppercase
        $clean = strtoupper(preg_replace('/[^a-zA-Z]/', '', $name));

        if (strlen($clean) <= 3) {
            return str_pad($clean, 3, 'X');
        }

        // Take first letter, then pick 2 consonants (or next letters if not enough)
        $first      = $clean[0];
        $consonants = preg_replace('/[AEIOU]/', '', substr($clean, 1));
        $rest       = strlen($consonants) >= 2
            ? substr($consonants, 0, 2)
            : substr(substr($clean, 1), 0, 2);

        return $first . $rest;
    }

    /**
     * Generate a unique transaction ID: {CAT}-{YYYYMMDD}-{XXXX}
     * e.g. MRL-20260502-0001, CVG-20260502-0003
     */
    public static function generateTicketNumber(int $categoryId): string
    {
        $category = \App\Models\BillCategory::find($categoryId);
        $code     = $category ? self::categoryCode($category->name) : 'BRC';
        $date     = now()->format('Ymd');
        $prefix   = "{$code}-{$date}-";

        $last = self::where('transaction_id', 'like', "{$prefix}%")
            ->orderByDesc('transaction_id')
            ->value('transaction_id');

        $seq = $last ? ((int) substr($last, -4)) + 1 : 1;

        return $prefix . str_pad($seq, 4, '0', STR_PAD_LEFT);
    }
}
