<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\StudentInterestDeclaration;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InterestDeclarationsController extends Controller
{
    /**
     * List interest declarations.
     * Officers: 403. Student: own only. Admin: all, optional user_id and activity_id filters.
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
        } elseif ($authUser->role === 'ADMIN') {
            if ($request->filled('user_id')) {
                $query->where('user_id', (int) $request->input('user_id'));
            }
            if ($request->filled('activity_id')) {
                $query->where('activity_id', (int) $request->input('activity_id'));
            }
        } else {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
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
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'activity_id' => 'required|exists:activities,id',
            'note' => 'nullable|string|max:500',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $targetUserId = $authUser->id;
        if ($authUser->role === 'ADMIN' && $request->filled('user_id')) {
            $u = User::find((int) $request->input('user_id'));
            if (!$u || !in_array($u->role, ['STUDENT', 'OFFICER'], true)) {
                return response()->json(['success' => false, 'message' => 'Invalid target user'], 422);
            }
            $targetUserId = $u->id;
        } elseif ($authUser->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only students can add interest declarations'], 403);
        }

        $activityId = (int) $request->input('activity_id');
        $existing = StudentInterestDeclaration::where('user_id', $targetUserId)->where('activity_id', $activityId)->first();
        if ($existing) {
            return response()->json(['success' => false, 'message' => 'Interest already recorded for this activity'], 422);
        }

        $activity = Activity::find($activityId);
        if ($activity && !$activity->is_active) {
            return response()->json(['success' => false, 'message' => 'This activity is not currently available'], 422);
        }

        $declaration = StudentInterestDeclaration::create([
            'user_id' => $targetUserId,
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
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $declaration = StudentInterestDeclaration::findOrFail($id);
        if ($authUser->role === 'ADMIN') {
            // Admin may update any declaration (e.g. note).
        } elseif ($authUser->role === 'STUDENT' && $declaration->user_id === $authUser->id) {
            // Own declaration.
        } else {
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
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $declaration = StudentInterestDeclaration::findOrFail($id);
        if ($authUser->role === 'ADMIN') {
            $declaration->delete();

            return response()->json(['success' => true, 'message' => 'Interest removed']);
        }

        if ($authUser->role !== 'STUDENT' || $declaration->user_id !== $authUser->id) {
            return response()->json(['success' => false, 'message' => 'You can only retract your own declarations'], 403);
        }

        $declaration->delete();

        return response()->json(['success' => true, 'message' => 'Interest retracted']);
    }
}
