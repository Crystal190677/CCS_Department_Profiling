<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentProfile extends Model
{
    public const ACADEMIC_STANDING_REGULAR = 'Regular';
    public const ACADEMIC_STANDING_IRREGULAR = 'Irregular';
    public const ACADEMIC_STANDING_PROBATIONARY = 'Probationary';

    public const ACADEMIC_STANDING_ON_HOLD = 'On hold';

    /** Physical data fields (sensitive); restricted for Officers and non-sports Faculty. */
    public const PHYSICAL_FIELDS = ['height_cm', 'weight_kg', 'dominant_hand', 'preferred_position'];

    protected $fillable = [
        'user_id',
        'photo_url',
        'height_cm',
        'weight_kg',
        'dominant_hand',
        'preferred_position',
        'course',
        'year_level',
        'current_gpa',
        'gpa_per_semester',
        'academic_standing',
        'section',
        'failed_units',
        'incomplete_grades',
        'enrolled_units',
        'sports_interests',
        'activity_interests',
        'skills',
        'notes',
    ];

    protected $casts = [
        'height_cm' => 'decimal:2',
        'weight_kg' => 'decimal:2',
        'current_gpa' => 'decimal:2',
        'gpa_per_semester' => 'array',
        'sports_interests' => 'array',
        'activity_interests' => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
