<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CcsCourseAssignment extends Model
{
    protected $fillable = [
        'course_code',
        'assignment_kind',
        'title',
        'description',
        'due_at',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
        ];
    }
}
