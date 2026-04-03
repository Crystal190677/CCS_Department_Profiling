<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CcsCoursePost extends Model
{
    protected $fillable = [
        'course_code',
        'post_type',
        'title',
        'body',
        'professor_name',
    ];
}
