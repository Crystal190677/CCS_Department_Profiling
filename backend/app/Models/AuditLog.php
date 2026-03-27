<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    public const ACTION_CREATED = 'created';

    public const ACTION_UPDATED = 'updated';

    public const ACTION_DELETED = 'deleted';

    protected $fillable = [
        'action',
        'target',
        'performer_id',
    ];

    public function performer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'performer_id');
    }
}
