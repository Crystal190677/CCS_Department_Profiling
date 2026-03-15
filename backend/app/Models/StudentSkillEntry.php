<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StudentSkillEntry extends Model
{
    public const PROFICIENCY_BEGINNER = 'Beginner';
    public const PROFICIENCY_INTERMEDIATE = 'Intermediate';
    public const PROFICIENCY_ADVANCED = 'Advanced';
    public const PROFICIENCY_EXPERT = 'Expert';

    protected $fillable = [
        'user_id',
        'skill',
        'proficiency_level',
        'portfolio_url',
        'github_url',
        'endorsed_by',
        'endorsed_at',
        'disputed_by',
        'disputed_at',
    ];

    protected $casts = [
        'endorsed_at' => 'datetime',
        'disputed_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function endorsedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'endorsed_by');
    }

    public function disputedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'disputed_by');
    }
}
