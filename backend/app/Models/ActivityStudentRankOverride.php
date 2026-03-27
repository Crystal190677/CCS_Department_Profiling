<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ActivityStudentRankOverride extends Model
{
    public const TYPE_EXCLUDE = 'exclude';

    public const TYPE_BOOST = 'boost';

    public const MAX_BOOST_POINTS = 500;

    protected $table = 'activity_student_rank_overrides';

    protected $fillable = [
        'activity_id',
        'user_id',
        'type',
        'boost_points',
        'reason',
        'created_by',
    ];

    public function activity(): BelongsTo
    {
        return $this->belongsTo(Activity::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
