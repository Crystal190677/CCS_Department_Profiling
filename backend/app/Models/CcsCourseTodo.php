<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CcsCourseTodo extends Model
{
    protected $fillable = [
        'user_id',
        'course_code',
        'title',
        'due_at',
        'is_completed',
        'calendar_kind',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'is_completed' => 'boolean',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
