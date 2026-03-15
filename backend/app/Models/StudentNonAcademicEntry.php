<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentNonAcademicEntry extends Model
{
    public const TYPE_PAST_ACTIVITY = 'past_activity';
    public const TYPE_AWARD = 'award';
    public const TYPE_LEADERSHIP = 'leadership';

    public const STATUS_PENDING = 'pending';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'description',
        'proof_path',
        'status',
        'approved_by',
        'approved_at',
        'rejection_reason',
        'flagged_by',
        'flagged_at',
        'endorsed_by',
        'endorsed_at',
    ];

    protected $casts = [
        'approved_at' => 'datetime',
        'flagged_at' => 'datetime',
        'endorsed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function flaggedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'flagged_by');
    }

    public function endorsedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'endorsed_by');
    }
}
