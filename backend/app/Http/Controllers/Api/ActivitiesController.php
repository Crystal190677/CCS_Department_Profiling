<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Enrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivitiesController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $activities = Activity::where('is_active', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get();
        $this->attachEnrollmentCounts($activities);

        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    /** Active activities for interest declaration dropdown (any authenticated user). */
    public function available(Request $request): JsonResponse
    {
        $activities = Activity::where('is_active', true)
            ->orderBy('type')
            ->orderBy('name')
            ->get(['id', 'name', 'type']);

        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    /** Admin: list all activities (including inactive) for setup. */
    public function listForAdmin(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        $activities = Activity::orderBy('type')->orderBy('name')->get();
        $this->attachEnrollmentCounts($activities);

        return response()->json([
            'success' => true,
            'data' => $activities,
        ]);
    }

    /** Admin: create activity with qualification criteria and slot config. */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|string|in:sport,activity,event',
            'description' => 'nullable|string',
            'time_slot' => 'nullable|string|max:100',
            'max_enrollees' => 'nullable|integer|min:0',
            'reserve_slots' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'criteria' => 'nullable|array',
            'criteria.min_gpa' => 'nullable|numeric|min:0|max:5',
            'criteria.max_failed_units' => 'nullable|integer|min:0',
            'criteria.academic_standings' => 'nullable|array',
            'criteria.academic_standings.*' => 'string|in:Regular,Irregular,Probationary,On hold',
            'criteria.year_level_min' => 'nullable|integer|min:1',
            'criteria.enrolled_units_min' => 'nullable|integer|min:0',
            'criteria.min_height_cm' => 'nullable|numeric|min:0',
            'criteria.required_skills' => 'nullable|array',
            'criteria.bonus_skills' => 'nullable|array',
            'criteria.conflicting_activity_ids' => 'nullable|array',
            'criteria.conflicting_activity_ids.*' => 'integer|exists:activities,id',
            'criteria.no_major_grave' => 'nullable|boolean',
            'criteria.max_minor_violations' => 'nullable|integer|min:0',
            'criteria.require_preferred_position' => 'nullable|boolean',
            'criteria.allowed_positions' => 'nullable|array',
            'criteria.allowed_positions.*' => 'string|max:100',
            'criteria.skip_schedule_conflict' => 'nullable|boolean',
            'criteria.allow_probationary_and_hold' => 'nullable|boolean',
            'criteria.permit_major_grave_violations' => 'nullable|boolean',
        ]);

        $activity = Activity::create([
            'name' => $validated['name'],
            'type' => $validated['type'],
            'description' => $validated['description'] ?? null,
            'time_slot' => $validated['time_slot'] ?? null,
            'max_enrollees' => $validated['max_enrollees'] ?? null,
            'reserve_slots' => $validated['reserve_slots'] ?? null,
            'is_active' => $request->boolean('is_active', true),
            'criteria' => $validated['criteria'] ?? [],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Activity created',
            'data' => $activity,
        ], 201);
    }

    /** Admin: update activity. */
    public function update(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        $activity = Activity::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'type' => 'sometimes|string|in:sport,activity,event',
            'description' => 'nullable|string',
            'time_slot' => 'nullable|string|max:100',
            'max_enrollees' => 'nullable|integer|min:0',
            'reserve_slots' => 'nullable|integer|min:0',
            'is_active' => 'boolean',
            'criteria' => 'nullable|array',
            'criteria.min_gpa' => 'nullable|numeric|min:0|max:5',
            'criteria.max_failed_units' => 'nullable|integer|min:0',
            'criteria.academic_standings' => 'nullable|array',
            'criteria.year_level_min' => 'nullable|integer|min:1',
            'criteria.enrolled_units_min' => 'nullable|integer|min:0',
            'criteria.min_height_cm' => 'nullable|numeric|min:0',
            'criteria.required_skills' => 'nullable|array',
            'criteria.bonus_skills' => 'nullable|array',
            'criteria.conflicting_activity_ids' => 'nullable|array',
            'criteria.no_major_grave' => 'nullable|boolean',
            'criteria.max_minor_violations' => 'nullable|integer|min:0',
            'criteria.require_preferred_position' => 'nullable|boolean',
            'criteria.allowed_positions' => 'nullable|array',
            'criteria.allowed_positions.*' => 'string|max:100',
            'criteria.skip_schedule_conflict' => 'nullable|boolean',
            'criteria.allow_probationary_and_hold' => 'nullable|boolean',
            'criteria.permit_major_grave_violations' => 'nullable|boolean',
        ]);

        $activity->fill($request->only(['name', 'type', 'description', 'time_slot', 'max_enrollees', 'reserve_slots']));
        $activity->is_active = $request->has('is_active') ? $request->boolean('is_active') : $activity->is_active;
        if ($request->has('criteria')) {
            $activity->criteria = $request->input('criteria');
        }
        $activity->save();

        return response()->json([
            'success' => true,
            'message' => 'Activity updated',
            'data' => $activity->fresh(),
        ]);
    }

    /** Admin: delete activity. */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        $activity = Activity::findOrFail($id);
        $activity->delete();

        return response()->json(['success' => true, 'message' => 'Activity deleted']);
    }

    /**
     * @param  \Illuminate\Support\Collection<int, Activity>  $activities
     */
    private function attachEnrollmentCounts($activities): void
    {
        if ($activities->isEmpty()) {
            return;
        }

        $ids = $activities->pluck('id');
        $enrollmentCounts = Enrollment::query()
            ->selectRaw('activity_id, status, count(*) as c')
            ->whereIn('activity_id', $ids)
            ->groupBy('activity_id', 'status')
            ->get()
            ->groupBy('activity_id');

        $rosterStatuses = Enrollment::rosterSeatStatuses();
        foreach ($activities as $a) {
            $counts = $enrollmentCounts->get($a->id, collect())->pluck('c', 'status')->toArray();
            $roster = 0;
            foreach ($rosterStatuses as $st) {
                $roster += (int) ($counts[$st] ?? 0);
            }
            $a->enrollment_counts = array_merge($counts, ['roster' => $roster]);
        }
    }
}
