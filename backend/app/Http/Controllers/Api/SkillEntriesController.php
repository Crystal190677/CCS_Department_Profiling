<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentSkillEntry;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SkillEntriesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($authUser->role === 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officers have no access to skills data'], 403);
        }

        $query = StudentSkillEntry::with(['endorsedByUser:id,name', 'disputedByUser:id,name']);

        if ($request->filled('user_id')) {
            $targetUserId = (int) $request->input('user_id');
            if ($authUser->role === 'STUDENT') {
                if ($targetUserId !== $authUser->id) {
                    return response()->json(['success' => false, 'message' => 'You can only view your own skills'], 403);
                }
            }
            $query->where('user_id', $targetUserId);
        } else {
            if ($authUser->role === 'STUDENT') {
                $query->where('user_id', $authUser->id);
            } else {
                return response()->json(['success' => false, 'message' => 'user_id required'], 400);
            }
        }

        $entries = $query->orderBy('skill')->get();

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $request->validate([
            'skill' => 'required|string|max:100',
            'proficiency_level' => 'nullable|string|max:50',
            'portfolio_url' => 'nullable|url|max:500',
            'github_url' => 'nullable|url|max:500',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $userId = $authUser->id;
        if ($authUser->role === 'ADMIN' && $request->filled('user_id')) {
            $target = User::find($request->input('user_id'));
            if ($target && in_array($target->role, ['STUDENT', 'OFFICER'])) {
                $userId = $target->id;
            }
        } elseif ($authUser->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only students can self-submit skills, or Admin can add for a student'], 403);
        }

        $entry = StudentSkillEntry::create([
            'user_id' => $userId,
            'skill' => $request->input('skill'),
            'proficiency_level' => $request->input('proficiency_level'),
            'portfolio_url' => $request->input('portfolio_url'),
            'github_url' => $request->input('github_url'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Skill added',
            'data' => $entry->load(['endorsedByUser:id,name', 'disputedByUser:id,name']),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $entry = StudentSkillEntry::findOrFail($id);

        if ($authUser->role === 'ADMIN') {
            $request->validate([
                'skill' => 'sometimes|string|max:100',
                'proficiency_level' => 'nullable|string|max:50',
                'portfolio_url' => 'nullable|url|max:500',
                'github_url' => 'nullable|url|max:500',
            ]);
            $entry->update($request->only(['skill', 'proficiency_level', 'portfolio_url', 'github_url']));
        } elseif ($authUser->role === 'STUDENT' && $entry->user_id === $authUser->id) {
            $request->validate([
                'skill' => 'sometimes|string|max:100',
                'proficiency_level' => 'nullable|string|max:50',
                'portfolio_url' => 'nullable|url|max:500',
                'github_url' => 'nullable|url|max:500',
            ]);
            $entry->update($request->only(['skill', 'proficiency_level', 'portfolio_url', 'github_url']));
        } else {
            return response()->json(['success' => false, 'message' => 'You can only edit your own skills or use Admin to edit any'], 403);
        }

        return response()->json([
            'success' => true,
            'message' => 'Skill updated',
            'data' => $entry->fresh(['endorsedByUser:id,name', 'disputedByUser:id,name']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $entry = StudentSkillEntry::findOrFail($id);

        if ($authUser->role !== 'ADMIN' && $entry->user_id !== $authUser->id) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $entry->delete();

        return response()->json(['success' => true, 'message' => 'Skill removed']);
    }

    public function endorse(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'FACULTY') {
            return response()->json(['success' => false, 'message' => 'Only Faculty can endorse skills'], 403);
        }

        $entry = StudentSkillEntry::findOrFail($id);
        $entry->update([
            'endorsed_by' => $authUser->id,
            'endorsed_at' => now(),
            'disputed_by' => null,
            'disputed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Skill endorsed',
            'data' => $entry->fresh(['endorsedByUser:id,name']),
        ]);
    }

    public function dispute(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'FACULTY') {
            return response()->json(['success' => false, 'message' => 'Only Faculty can dispute skills'], 403);
        }

        $entry = StudentSkillEntry::findOrFail($id);
        $entry->update([
            'disputed_by' => $authUser->id,
            'disputed_at' => now(),
            'endorsed_by' => null,
            'endorsed_at' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Skill disputed',
            'data' => $entry->fresh(['disputedByUser:id,name']),
        ]);
    }
}
