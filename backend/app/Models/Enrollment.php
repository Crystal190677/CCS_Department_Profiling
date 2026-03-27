<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Enrollment extends Model
{
    /** Legacy + confirmed roster seat (counts toward activity capacity). */
    public const STATUS_ACTIVE = 'active';

    /** Faculty selected student; student must confirm (Phase 5). */
    public const STATUS_PENDING_CONFIRMATION = 'pending_confirmation';

    /** Student accepted enrollment. */
    public const STATUS_CONFIRMED = 'confirmed';

    public const STATUS_WAITLIST = 'waitlist';

    protected $fillable = [
        'user_id',
        'activity_id',
        'enrolled_by',
        'enrolled_at',
        'status',
        'confirmed_at',
    ];

    protected $casts = [
        'enrolled_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    /**
     * Statuses that occupy a main roster slot (not waitlist).
     *
     * @return list<string>
     */
    public static function rosterSeatStatuses(): array
    {
        return [
            self::STATUS_ACTIVE,
            self::STATUS_PENDING_CONFIRMATION,
            self::STATUS_CONFIRMED,
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function enrolledByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'enrolled_by');
    }
}
