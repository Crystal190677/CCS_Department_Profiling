<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentConductEntry;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AdminStatsController extends Controller
{
    public function stats(Request $request): JsonResponse
    {
        $auth = $request->user();
        if (!$auth || !in_array($auth->role, ['ADMIN', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $now = now();

        $violationsThisMonth = StudentConductEntry::query()
            ->where('type', StudentConductEntry::TYPE_VIOLATION)
            ->whereYear('recorded_at', $now->year)
            ->whereMonth('recorded_at', $now->month)
            ->count();

        return response()->json([
            'success' => true,
            'data' => [
                // Dashboard student KPI mirrors Class List "All" population (BSIT/BSCS student accounts).
                'students' => User::query()
                    ->where('role', 'STUDENT')
                    ->whereHas('studentProfile', fn ($q) => $q->whereIn('course', ['BSIT', 'BSCS']))
                    ->count(),
                'officers' => User::query()->where('role', 'OFFICER')->count(),
                'violations_this_month' => $violationsThisMonth,
            ],
        ]);
    }
}
