<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'avatar_path',
        'contact_number',
        'student_number',
        'password',
        'password_set_at',
        'role',
        'is_sports_faculty',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'avatar_path',
    ];

    protected $appends = ['avatar_url'];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'password_set_at' => 'datetime',
            'is_sports_faculty' => 'boolean',
        ];
    }

    /** Student / officer has completed “claim account” and may sign in with password. */
    public function hasPasswordClaimed(): bool
    {
        return $this->password_set_at !== null;
    }

    public function getAvatarUrlAttribute(): ?string
    {
        if (!$this->avatar_path) {
            return null;
        }

        if (!Storage::disk('public')->exists($this->avatar_path)) {
            return null;
        }

        return asset('storage/'.ltrim($this->avatar_path, '/'));
    }

    public function studentProfile(): HasOne
    {
        return $this->hasOne(StudentProfile::class);
    }

    public function enrollments(): HasMany
    {
        return $this->hasMany(Enrollment::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(UserNotification::class)->orderByDesc('created_at');
    }

    public function officerPositions(): HasMany
    {
        return $this->hasMany(OfficerPosition::class);
    }

    public function merchandiseOrders(): HasMany
    {
        return $this->hasMany(MerchandiseOrder::class);
    }

    public function nonAcademicEntries(): HasMany
    {
        return $this->hasMany(StudentNonAcademicEntry::class);
    }

    public function skillEntries(): HasMany
    {
        return $this->hasMany(StudentSkillEntry::class);
    }

    public function interestDeclarations(): HasMany
    {
        return $this->hasMany(StudentInterestDeclaration::class)->with('activity');
    }

    public function conductEntries(): HasMany
    {
        return $this->hasMany(StudentConductEntry::class);
    }

    public function classSchedules(): HasMany
    {
        return $this->hasMany(StudentClassSchedule::class);
    }
}
