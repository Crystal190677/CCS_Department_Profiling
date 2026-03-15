<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Merchandise extends Model
{
    protected $table = 'merchandise';

    protected $fillable = [
        'name',
        'description',
        'price',
        'image_path',
        'is_available',
        'created_by',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'is_available' => 'boolean',
    ];

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function orders(): HasMany
    {
        return $this->hasMany(MerchandiseOrder::class, 'merchandise_id');
    }
}
