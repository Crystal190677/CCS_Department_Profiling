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
        if (!$auth || $auth->role !== 'ADMIN') {
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
                'students' => User::query()->where('role', 'STUDENT')->count(),
                'officers' => User::query()->where('role', 'OFFICER')->count(),
                'violations_this_month' => $violationsThisMonth,
            ],
        ]);
    }
}
