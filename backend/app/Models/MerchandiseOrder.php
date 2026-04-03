<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MerchandiseOrder extends Model
{
    public const PAYMENT_STATUS_PENDING = 'pending';
    public const PAYMENT_STATUS_PAID_ONLINE = 'paid_online';
    public const PAYMENT_STATUS_PAID_CASH = 'paid_cash';

    protected $fillable = [
        'user_id',
        'merchandise_id',
        'quantity',
        'amount',
        'payer_full_name',
        'section',
        'course',
        'gcash_reference',
        'payment_status',
        'proof_image_path',
        'submitted_at',
        'confirmed_by',
        'confirmed_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'submitted_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function merchandise(): BelongsTo
    {
        return $this->belongsTo(Merchandise::class);
    }

    public function confirmedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'confirmed_by');
    }
}
