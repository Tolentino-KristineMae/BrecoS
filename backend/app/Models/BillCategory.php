<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class BillCategory extends Model
{
    protected $fillable = ['name', 'description', 'logo_path', 'is_active'];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Return full URL for the logo
    public function getLogoUrlAttribute(): ?string
    {
        if (!$this->logo_path) {
            return null;
        }
        
        try {
            return \Storage::url($this->logo_path);
        } catch (\Exception $e) {
            // Fallback if Storage is not configured
            return null;
        }
    }

    protected $appends = ['logo_url'];

    public function bills(): HasMany
    {
        return $this->hasMany(Bill::class);
    }
}
