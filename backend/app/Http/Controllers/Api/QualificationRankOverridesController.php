<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityStudentRankOverride;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class QualificationRankOverridesController extends Controller
{
    /** Audit list: Admin only. */
    public function index(Request $request, int $activityId): JsonResponse
    {
        $auth = $request->user();
        if (!$auth || $auth->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        Activity::findOrFail($activityId);
        $rows = ActivityStudentRankOverride::query()
            ->where('activity_id', $activityId)
            ->with(['user:id,name,student_number,email', 'createdByUser:id,name'])
            ->orderByDesc('updated_at')
            ->get();

        return response()->json(['success' => true, 'data' => $rows]);
    }

    public function store(Request $request, int $activityId): JsonResponse
    {
        $auth = $request->user();
        if (!$auth || $auth->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        Activity::findOrFail($activityId);

        $validated = $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|string|in:exclude,boost',
            'boost_points' => 'required_if:type,boost|nullable|integer|min:1|max:'.ActivityStudentRankOverride::MAX_BOOST_POINTS,
            'reason' => 'nullable|string|max:2000',
        ]);

        $student = User::findOrFail($validated['user_id']);
        if ($student->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Target must be a student'], 400);
        }

        $type = $validated['type'];
        $boost = $type === ActivityStudentRankOverride::TYPE_BOOST
            ? min(ActivityStudentRankOverride::MAX_BOOST_POINTS, max(0, (int) ($validated['boost_points'] ?? 150)))
            : 0;

        if ($type === ActivityStudentRankOverride::TYPE_BOOST && $boost < 1) {
            return response()->json(['success' => false, 'message' => 'boost_points must be at least 1 for boost'], 422);
        }

        $row = ActivityStudentRankOverride::updateOrCreate(
            [
                'activity_id' => $activityId,
                'user_id' => $student->id,
            ],
            [
                'type' => $type,
                'boost_points' => $boost,
                'reason' => $validated['reason'] ?? null,
                'created_by' => $auth->id,
            ]
        );

        return response()->json([
            'success' => true,
            'message' => $type === ActivityStudentRankOverride::TYPE_EXCLUDE
                ? 'Student excluded from this activity’s qualified list'
                : 'Rank boost applied',
            'data' => $row->load(['user:id,name', 'createdByUser:id,name']),
        ], 201);
    }

    public function destroy(Request $request, int $activityId, int $userId): JsonResponse
    {
        $auth = $request->user();
        if (!$auth || $auth->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        Activity::findOrFail($activityId);

        $deleted = ActivityStudentRankOverride::query()
            ->where('activity_id', $activityId)
            ->where('user_id', $userId)
            ->delete();

        return response()->json([
            'success' => true,
            'message' => $deleted ? 'Override removed' : 'No override found',
        ]);
    }
}
