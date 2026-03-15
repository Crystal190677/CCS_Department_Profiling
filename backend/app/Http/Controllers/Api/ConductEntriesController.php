<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentConductEntry;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConductEntriesController extends Controller
{
    /**
     * List conduct entries.
     * Officers: 403. Student: own only. Faculty: require user_id (that student's). Admin: all or filter by user_id.
     */
    public function index(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($authUser->role === 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officers have no access to conduct data'], 403);
        }

        $query = StudentConductEntry::with(['user:id,name,student_number,email', 'recordedByUser:id,name', 'resolvedByUser:id,name'])
            ->orderBy('recorded_at', 'desc')
            ->orderBy('created_at', 'desc');

        if ($authUser->role === 'STUDENT') {
            $query->where('user_id', $authUser->id);
        } elseif ($authUser->role === 'FACULTY') {
            if (!$request->filled('user_id')) {
                return response()->json(['success' => false, 'message' => 'Faculty must specify user_id to view conduct'], 400);
            }
            $query->where('user_id', (int) $request->input('user_id'));
        } else {
            // Admin: optional user_id filter
            if ($request->filled('user_id')) {
                $query->where('user_id', (int) $request->input('user_id'));
            }
        }

        $perPage = (int) $request->input('per_page', 20);
        $entries = $query->paginate($perPage > 0 ? $perPage : 50);

        return response()->json([
            'success' => true,
            'data' => $entries,
        ]);
    }

    /**
     * Create a violation or commendation. Admin only.
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can create conduct records'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'type' => 'required|string|in:violation,commendation',
            'severity' => 'nullable|string|in:Minor,Major,Grave',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'recorded_at' => 'required|date',
        ]);

        $entry = StudentConductEntry::create([
            'user_id' => $request->input('user_id'),
            'type' => $request->input('type'),
            'severity' => $request->input('type') === StudentConductEntry::TYPE_VIOLATION ? $request->input('severity') : null,
            'title' => $request->input('title'),
            'description' => $request->input('description'),
            'recorded_at' => $request->input('recorded_at'),
            'recorded_by' => $authUser->id,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Conduct record created',
            'data' => $entry->load(['user:id,name,student_number,email', 'recordedByUser:id,name']),
        ], 201);
    }

    /**
     * Update a conduct entry. Admin only.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can edit conduct records'], 403);
        }

        $entry = StudentConductEntry::findOrFail($id);

        $request->validate([
            'type' => 'sometimes|string|in:violation,commendation',
            'severity' => 'nullable|string|in:Minor,Major,Grave',
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'recorded_at' => 'sometimes|date',
        ]);

        $entry->fill($request->only(['type', 'title', 'description', 'recorded_at']));
        $entry->severity = $entry->type === StudentConductEntry::TYPE_VIOLATION ? $request->input('severity') : null;
        $entry->save();

        return response()->json([
            'success' => true,
            'data' => $entry->fresh(['user:id,name,student_number,email', 'recordedByUser:id,name', 'resolvedByUser:id,name']),
        ]);
    }

    /**
     * Delete a conduct entry. Admin only.
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can delete conduct records'], 403);
        }

        $entry = StudentConductEntry::findOrFail($id);
        $entry->delete();

        return response()->json(['success' => true, 'message' => 'Conduct record deleted']);
    }

    /**
     * Submit a dispute request for a violation. Student own record only; cannot edit/dispute through system directly
     * except via this formal dispute ticket.
     */
    public function dispute(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only the student can submit a dispute for their own record'], 403);
        }

        $entry = StudentConductEntry::findOrFail($id);
        if ($entry->user_id !== $authUser->id) {
            return response()->json(['success' => false, 'message' => 'You can only dispute your own records'], 403);
        }

        if ($entry->dispute_status === StudentConductEntry::DISPUTE_STATUS_PENDING) {
            return response()->json(['success' => false, 'message' => 'A dispute is already pending for this record'], 422);
        }

        $request->validate([
            'reason' => 'required|string|max:2000',
        ]);

        $entry->dispute_requested_at = now();
        $entry->dispute_reason = $request->input('reason');
        $entry->dispute_status = StudentConductEntry::DISPUTE_STATUS_PENDING;
        $entry->resolved_at = null;
        $entry->resolved_by = null;
        $entry->resolve_note = null;
        $entry->save();

        return response()->json([
            'success' => true,
            'message' => 'Dispute submitted. Admin will review.',
            'data' => $entry->fresh(['recordedByUser:id,name', 'resolvedByUser:id,name']),
        ]);
    }

    /**
     * Resolve a dispute. Admin only.
     */
    public function resolveDispute(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Only Admin can resolve disputes'], 403);
        }

        $entry = StudentConductEntry::findOrFail($id);
        if ($entry->dispute_status !== StudentConductEntry::DISPUTE_STATUS_PENDING) {
            return response()->json(['success' => false, 'message' => 'No pending dispute for this record'], 422);
        }

        $request->validate([
            'dispute_status' => 'required|string|in:resolved_upheld,resolved_revised,dismissed',
            'resolve_note' => 'nullable|string|max:1000',
        ]);

        $entry->dispute_status = $request->input('dispute_status');
        $entry->resolved_at = now();
        $entry->resolved_by = $authUser->id;
        $entry->resolve_note = $request->input('resolve_note');
        $entry->save();

        return response()->json([
            'success' => true,
            'message' => 'Dispute resolved',
            'data' => $entry->fresh(['user:id,name,student_number,email', 'recordedByUser:id,name', 'resolvedByUser:id,name']),
        ]);
    }
}
