<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\OfficerPosition;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OfficerPositionsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $activityId = $request->input('activity_id');
        if (!$activityId) {
            return response()->json(['success' => false, 'message' => 'activity_id required'], 400);
        }

        $positions = OfficerPosition::with(['user:id,name,email,student_number', 'assignedByUser:id,name'])
            ->where('activity_id', $activityId)
            ->orderBy('position')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $positions,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'user_id' => 'required|exists:users,id',
            'position' => 'required|string|max:100',
        ]);

        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $user = User::findOrFail($request->input('user_id'));
        if ($user->role !== 'STUDENT' && $user->role !== 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officer positions are assigned to students or officers'], 400);
        }

        $activityId = $request->input('activity_id');
        $userId = $request->input('user_id');
        $positionTitle = $request->input('position');

        $existing = OfficerPosition::where('activity_id', $activityId)
            ->where('user_id', $userId)
            ->first();

        if ($existing) {
            $existing->update(['position' => $positionTitle, 'assigned_by' => $authUser->id]);
            return response()->json([
                'success' => true,
                'message' => 'Position updated',
                'data' => $existing->load(['user:id,name,email,student_number', 'assignedByUser:id,name']),
            ]);
        }

        $position = OfficerPosition::create([
            'activity_id' => $activityId,
            'user_id' => $userId,
            'position' => $positionTitle,
            'assigned_by' => $authUser->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Officer position assigned',
            'data' => $position->load(['user:id,name,email,student_number', 'assignedByUser:id,name']),
        ], 201);
    }

    public function destroy(int $id): JsonResponse
    {
        $position = OfficerPosition::findOrFail($id);
        $position->delete();

        return response()->json(['success' => true, 'message' => 'Officer position removed']);
    }
}
