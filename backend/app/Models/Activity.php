<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Activity extends Model
{
    protected $fillable = [
        'name',
        'type',
        'criteria',
        'description',
        'time_slot',
        'max_enrollees',
        'reserve_slots',
        'is_active',
    ];

    protected $casts = [
        'criteria' => 'array',
        'is_active' => 'boolean',
        'max_enrollees' => 'integer',
        'reserve_slots' => 'integer',
    ];

    /** Criteria: academic (min_gpa, max_failed_units, academic_standings[], year_level_min, enrolled_units_min); skills (required_skills[], bonus_skills[] for ranking); physical (min_height_cm, require_preferred_position, allowed_positions[]); conduct (no_major_grave, max_minor_violations); availability (conflicting_activity_ids[], time_slot on model + skip_schedule_conflict to disable same-slot check) */

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function officerPositions(): HasMany
    {
        return $this->hasMany(OfficerPosition::class);
    }

    public function interestDeclarations(): HasMany
    {
        return $this->hasMany(StudentInterestDeclaration::class);
    }

    public function studentRankOverrides(): HasMany
    {
        return $this->hasMany(ActivityStudentRankOverride::class);
    }
}
