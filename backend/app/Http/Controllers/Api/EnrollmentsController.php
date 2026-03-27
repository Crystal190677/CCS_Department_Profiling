<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EnrollmentsController extends Controller
{
    /** Student: list own enrollments (Phase 5 confirmation). */
    public function mine(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Students only'], 403);
        }

        $rows = Enrollment::query()
            ->with(['activity', 'enrolledByUser:id,name'])
            ->where('user_id', $user->id)
            ->orderByDesc('enrolled_at')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $rows,
        ]);
    }

    /** Student: confirm a pending enrollment (roster seat finalized). */
    public function confirm(Request $request, int $id): JsonResponse
    {
        $user = $request->user();
        if (!$user || $user->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Students only'], 403);
        }

        $enrollment = Enrollment::query()
            ->whereKey($id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        if ($enrollment->status !== Enrollment::STATUS_PENDING_CONFIRMATION) {
            return response()->json([
                'success' => false,
                'message' => 'This enrollment does not require confirmation or was already processed.',
            ], 400);
        }

        $enrollment->update([
            'status' => Enrollment::STATUS_CONFIRMED,
            'confirmed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Enrollment confirmed.',
            'data' => $enrollment->fresh()->load(['activity', 'enrolledByUser:id,name']),
        ]);
    }
}
