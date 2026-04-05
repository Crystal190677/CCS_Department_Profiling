<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentNonAcademicEntry;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NonAcademicEntriesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $query = StudentNonAcademicEntry::with(['user:id,name,student_number,email', 'approvedByUser:id,name', 'flaggedByUser:id,name', 'endorsedByUser:id,name']);

        // Admin: can list all pending for approval queue
        if ($request->filled('status') && $authUser->role === 'ADMIN') {
            $query->where('status', $request->input('status'));
        } elseif ($request->filled('user_id')) {
            $targetUserId = (int) $request->input('user_id');
            if ($authUser->role === 'STUDENT') {
                if ($targetUserId !== $authUser->id) {
                    return response()->json(['success' => false, 'message' => 'You can only view your own entries'], 403);
                }
            }
            $query->where('user_id', $targetUserId);
        } else {
            if ($authUser->role === 'STUDENT' || $authUser->role === 'OFFICER') {
                $query->where('user_id', $authUser->id);
            } else {
                return response()->json(['success' => false, 'message' => 'user_id or status (Admin) required'], 400);
            }
        }

        $entries = $query->latest()->paginate($request->input('per_page', 20));

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
            'type' => 'required|string|in:past_activity,award,leadership',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'proof' => 'nullable|file|max:5120|mimes:pdf,jpg,jpeg,png',
            'user_id' => 'nullable|exists:users,id',
        ]);

        $targetUserId = $authUser->id;
        if ($authUser->role === 'ADMIN' && $request->filled('user_id')) {
            $u = User::find((int) $request->input('user_id'));
            if (!$u || !in_array($u->role, ['STUDENT', 'OFFICER'], true)) {
                return response()->json(['success' => false, 'message' => 'Invalid target user'], 422);
            }
            $targetUserId = $u->id;
        } elseif ($authUser->role !== 'STUDENT' && $authUser->role !== 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Only students or officers can submit non-academic entries'], 403);
        }

        $proofPath = null;
        if ($request->hasFile('proof')) {
            $proofPath = $request->file('proof')->store('non-academic-proofs', 'public');
        }

        $isAdminForOther = $authUser->role === 'ADMIN' && $targetUserId !== $authUser->id;
        $entry = StudentNonAcademicEntry::create([
            'user_id' => $targetUserId,
            'type' => $request->input('type'),
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'proof_path' => $proofPath,
            'status' => $isAdminForOther ? StudentNonAcademicEntry::STATUS_APPROVED : StudentNonAcademicEntry::STATUS_PENDING,
            'approved_by' => $isAdminForOther ? $authUser->id : null,
            'approved_at' => $isAdminForOther ? now() : null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entry submitted for Admin approval',
            'data' => $entry->load(['approvedByUser:id,name']),
        ], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can edit entries'], 403);
        }

        $entry = StudentNonAcademicEntry::findOrFail($id);

        $request->validate([
            'type' => 'sometimes|string|in:past_activity,award,leadership',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'proof' => 'nullable|file|max:5120|mimes:pdf,jpg,jpeg,png',
        ]);

        $data = $request->only(['type', 'title', 'description']);
        if ($request->hasFile('proof')) {
            if ($entry->proof_path) {
                Storage::disk('public')->delete($entry->proof_path);
            }
            $data['proof_path'] = $request->file('proof')->store('non-academic-proofs', 'public');
        }

        $entry->update($data);

        return response()->json([
            'success' => true,
            'message' => 'Entry updated',
            'data' => $entry->fresh(['user:id,name,student_number,email', 'approvedByUser:id,name']),
        ]);
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can delete entries'], 403);
        }

        $entry = StudentNonAcademicEntry::findOrFail($id);
        if ($entry->proof_path) {
            Storage::disk('public')->delete($entry->proof_path);
        }
        $entry->delete();

        return response()->json(['success' => true, 'message' => 'Entry deleted']);
    }

    public function approve(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can approve entries'], 403);
        }

        $entry = StudentNonAcademicEntry::findOrFail($id);
        $entry->update([
            'status' => StudentNonAcademicEntry::STATUS_APPROVED,
            'approved_by' => $authUser->id,
            'approved_at' => now(),
            'rejection_reason' => null,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entry approved',
            'data' => $entry->fresh(['user:id,name,student_number,email', 'approvedByUser:id,name']),
        ]);
    }

    public function reject(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can reject entries'], 403);
        }

        $request->validate([
            'rejection_reason' => 'nullable|string|max:500',
        ]);

        $entry = StudentNonAcademicEntry::findOrFail($id);
        $entry->update([
            'status' => StudentNonAcademicEntry::STATUS_REJECTED,
            'approved_by' => $authUser->id,
            'approved_at' => now(),
            'rejection_reason' => $request->input('rejection_reason'),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entry rejected',
            'data' => $entry->fresh(['user:id,name,student_number,email', 'approvedByUser:id,name']),
        ]);
    }

    public function flag(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can flag entries'], 403);
        }

        $entry = StudentNonAcademicEntry::findOrFail($id);
        $entry->update([
            'flagged_by' => $authUser->id,
            'flagged_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entry flagged',
            'data' => $entry->fresh(['flaggedByUser:id,name']),
        ]);
    }

    public function endorse(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can endorse entries'], 403);
        }

        $entry = StudentNonAcademicEntry::findOrFail($id);
        $entry->update([
            'endorsed_by' => $authUser->id,
            'endorsed_at' => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Entry endorsed',
            'data' => $entry->fresh(['endorsedByUser:id,name']),
        ]);
    }
}
