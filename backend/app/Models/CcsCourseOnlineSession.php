<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CcsCourseOnlineSession extends Model
{
    protected $fillable = [
        'course_code',
        'title',
        'meeting_url',
        'platform',
        'starts_at',
        'ends_at',
    ];

    protected function casts(): array
    {
        return [
            'starts_at' => 'datetime',
            'ends_at' => 'datetime',
        ];
    }
}
