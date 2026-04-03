<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CcsCourseScore extends Model
{
    protected $fillable = [
        'user_id',
        'course_code',
        'assessment_title',
        'points_earned',
        'points_max',
        'percentage',
        'graded_at',
    ];

    protected function casts(): array
    {
        return [
            'points_earned' => 'decimal:2',
            'points_max' => 'decimal:2',
            'percentage' => 'decimal:2',
            'graded_at' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
