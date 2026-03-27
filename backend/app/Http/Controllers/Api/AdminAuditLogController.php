<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminAuditLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = AuditLog::query()
            ->with('performer:id,name')
            ->orderByDesc('created_at');

        if ($request->filled('action')) {
            $act = strtolower((string) $request->input('action'));
            if (in_array($act, [AuditLog::ACTION_CREATED, AuditLog::ACTION_UPDATED, AuditLog::ACTION_DELETED], true)) {
                $query->where('action', $act);
            }
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->input('date_from'));
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->input('date_to'));
        }

        $paginator = $query->paginate(15)->through(function (AuditLog $log) {
            return [
                'id' => $log->id,
                'action' => $log->action,
                'target' => $log->target,
                'performed_by' => $log->performer?->name ?? '—',
                'performer_id' => $log->performer_id,
                'created_at' => $log->created_at?->toIso8601String(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $paginator->items(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
            ],
        ]);
    }
}
