<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentConductEntry extends Model
{
    public const TYPE_VIOLATION = 'violation';
    public const TYPE_COMMENDATION = 'commendation';

    public const SEVERITY_MINOR = 'Minor';
    public const SEVERITY_MAJOR = 'Major';
    public const SEVERITY_GRAVE = 'Grave';

    public const DISPUTE_STATUS_PENDING = 'pending';
    public const DISPUTE_STATUS_UPHELD = 'resolved_upheld';
    public const DISPUTE_STATUS_REVISED = 'resolved_revised';
    public const DISPUTE_STATUS_DISMISSED = 'dismissed';

    protected $table = 'student_conduct_entries';

    protected $fillable = [
        'user_id',
        'type',
        'severity',
        'title',
        'description',
        'recorded_at',
        'recorded_by',
        'dispute_requested_at',
        'dispute_reason',
        'dispute_status',
        'resolved_at',
        'resolved_by',
        'resolve_note',
    ];

    protected $casts = [
        'recorded_at' => 'date',
        'dispute_requested_at' => 'datetime',
        'resolved_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function recordedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }

    public function resolvedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
