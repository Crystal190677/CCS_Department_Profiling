<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
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
        'student_number',
        'password',
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
    ];

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
            'is_sports_faculty' => 'boolean',
        ];
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
}
