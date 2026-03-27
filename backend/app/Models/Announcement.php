<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Storage;

class Announcement extends Model
{
    protected $fillable = [
        'user_id',
        'title',
        'content',
        'image_path',
        'tag',
    ];

    protected $appends = ['image_url'];

    public function getImageUrlAttribute(): ?string
    {
        if (!$this->image_path) {
            return null;
        }

        return Storage::disk('public')->exists($this->image_path)
            ? url(Storage::disk('public')->url($this->image_path))
            : null;
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
