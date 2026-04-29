<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\Storage;

class Merchandise extends Model
{
    protected $table = 'merchandise';

    protected $fillable = [
        'name',
        'description',
        'category_label',
        'available_colors',
        'available_sizes',
        'price',
        'image_path',
        'is_available',
        'created_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_available' => 'boolean',
        'available_colors' => 'array',
        'available_sizes' => 'array',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }
        return Storage::disk('public')->exists($this->image_path)
            ? "/api/merchandise/{$this->id}/image"
            : null;
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(MerchandiseOrder::class, 'merchandise_id');
    }
}
