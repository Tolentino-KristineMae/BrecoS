<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CashTransactionFile extends Model
{
    protected $fillable = [
        'cash_transaction_id',
        'file_type',
        'file_path',
        'original_name',
    ];

    // file_url is NOT in $appends to avoid Storage calls on every list query.
    // It is appended conditionally in detail/show views.
    // protected $appends = ['file_url'];

    public function getFileUrlAttribute(): ?string
    {
        if (!$this->file_path) {
            return null;
        }
        
        try {
            return \Storage::disk(config('filesystems.default', 'local'))->url($this->file_path);
        } catch (\Throwable $e) {
            return null;
        }
    }

    public function transaction(): BelongsTo
    {
        return $this->belongsTo(CashTransaction::class, 'cash_transaction_id');
    }
}
