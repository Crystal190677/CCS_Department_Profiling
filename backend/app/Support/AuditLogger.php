<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class AuditLogger
{
    private const TARGET_MAX_LEN = 512;

    public static function log(string $action, string $target, ?User $performer = null): void
    {
        $action = strtolower($action);
        if (!in_array($action, [AuditLog::ACTION_CREATED, AuditLog::ACTION_UPDATED, AuditLog::ACTION_DELETED], true)) {
            return;
        }

        $user = $performer ?? Auth::user();
        if (!$user instanceof User) {
            return;
        }

        AuditLog::query()->create([
            'action' => $action,
            'target' => Str::limit($target, self::TARGET_MAX_LEN, ''),
            'performer_id' => $user->id,
        ]);
    }
}
