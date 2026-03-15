<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\StudentInterestDeclaration;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterestDeclarationsController extends Controller
{
    /**
     * List interest declarations.
     * Officers: 403. Student: own only. Faculty/Admin: all, optional user_id and activity_id filters.
     */
    public function index(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($authUser->role === 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officers have no access to interest declarations'], 403);
        }

        $query = StudentInterestDeclaration::with(['user:id,name,student_number,email', 'activity:id,name,type,is_active'])
            ->orderBy('created_at', 'desc');

        if ($authUser->role === 'STUDENT') {
            $query->where('user_id', $authUser->id);
        } else {
            if ($request->filled('user_id')) {
                $query->where('user_id', (int) $request->input('user_id'));
            }
            if ($request->filled('activity_id')) {
                $query->where('activity_id', (int) $request->input('activity_id'));
            }
        }

        $perPage = (int) $request->input('per_page', 50);
        $items = $perPage > 0 ? $query->paginate($perPage) : $query->get();

        return response()->json([
            'success' => true,
            'data' => $items,
        ]);
    }

    /**
     * Add an interest declaration. Student only.
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only students can add interest declarations'], 403);
        }

        $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'note' => 'nullable|string|max:500',
        ]);

        $activityId = (int) $request->input('activity_id');
        $existing = StudentInterestDeclaration::where('user_id', $authUser->id)->where('activity_id', $activityId)->first();
        if ($existing) {
            return response()->json(['success' => false, 'message' => 'You already declared interest in this activity'], 422);
        }

        $activity = Activity::find($activityId);
        if ($activity && !$activity->is_active) {
            return response()->json(['success' => false, 'message' => 'This activity is not currently available'], 422);
        }

        $declaration = StudentInterestDeclaration::create([
            'user_id' => $authUser->id,
            'activity_id' => $activityId,
            'note' => $request->input('note'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Interest added',
            'data' => $declaration->load('activity:id,name,type'),
        ], 201);
    }

    /**
     * Update an interest declaration (e.g. note). Student own only.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only students can update their interest declarations'], 403);
        }

        $declaration = StudentInterestDeclaration::findOrFail($id);
        if ($declaration->user_id !== $authUser->id) {
            return response()->json(['success' => false, 'message' => 'You can only update your own declarations'], 403);
        }

        $request->validate([
            'note' => 'nullable|string|max:500',
        ]);

        $declaration->note = $request->input('note');
        $declaration->save();

        return response()->json([
            'success' => true,
            'data' => $declaration->fresh('activity:id,name,type'),
        ]);
    }

    /**
     * Retract an interest declaration. Student own only.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only students can retract their interest declarations'], 403);
        }

        $declaration = StudentInterestDeclaration::findOrFail($id);
        if ($declaration->user_id !== $authUser->id) {
            return response()->json(['success' => false, 'message' => 'You can only retract your own declarations'], 403);
        }

        $declaration->delete();

        return response()->json(['success' => true, 'message' => 'Interest retracted']);
    }
}
