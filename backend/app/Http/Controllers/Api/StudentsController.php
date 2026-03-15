<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Enrollment;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['studentProfile', 'enrollments.activity', 'officerPositions.activity']);
        if (!$request->boolean('include_officers')) {
            $query->where('role', 'STUDENT');
        } else {
            $query->whereIn('role', ['STUDENT', 'OFFICER']);
        }

        // Search: name, student_number, email
        if ($request->filled('search')) {
            $search = $request->input('search');
            $query->where(function (Builder $q) use ($search): void {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by activity
        if ($request->filled('activity_id')) {
            $activityId = $request->input('activity_id');
            $activity = Activity::find($activityId);
            if ($activity) {
                $query->whereDoesntHave('enrollments', fn ($q) => $q->where('activity_id', $activityId))
                    ->where(function ($q) use ($activity) {
                        $this->applyQualificationFilter($q, $activity);
                    });
            }
        }

        // Filter by qualification (smart filter)
        if ($request->filled('qualify_for')) {
            $qualifyFor = $request->input('qualify_for');
            $activity = Activity::find($qualifyFor);
            if ($activity) {
                $query->whereDoesntHave('enrollments', fn ($q) => $q->where('activity_id', $activity->id))
                    ->where(function ($q) use ($activity) {
                        $this->applyQualificationFilter($q, $activity);
                    });
            }
        }

        $students = $query->orderBy('name')->paginate((int) $request->input('per_page', 15));

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    public function enroll(Request $request): JsonResponse
    {
        $request->validate([
            'student_id' => 'required|exists:users,id',
            'activity_id' => 'required|exists:activities,id',
        ]);

        $authUser = $request->user();
        if (!$authUser) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $student = User::findOrFail($request->input('student_id'));
        if ($student->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'User is not a student'], 400);
        }

        $activityId = $request->input('activity_id');
        $exists = Enrollment::where('user_id', $student->id)
            ->where('activity_id', $activityId)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Student already enrolled'], 400);
        }

        $enrollment = Enrollment::create([
            'user_id' => $student->id,
            'activity_id' => $activityId,
            'enrolled_by' => $authUser->id,
        ]);

        $activity = $enrollment->activity;
        $enrolledBy = $authUser->name;

        UserNotification::create([
            'user_id' => $student->id,
            'type' => 'enrollment',
            'title' => 'You have been enrolled',
            'message' => "You have been enrolled in {$activity->name} by {$enrolledBy}.",
            'data' => ['enrollment_id' => $enrollment->id, 'activity_id' => $activity->id],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Student enrolled successfully',
            'data' => $enrollment->load('activity'),
        ], 201);
    }

    /**
     * @param  Builder<User>  $query
     */
    private function applyQualificationFilter(Builder $query, Activity $activity): void
    {
        $criteria = $activity->criteria ?? [];
        $activityName = strtolower($activity->name);

        $query->whereHas('studentProfile', function (Builder $sub) use ($criteria, $activityName) {
            if (!empty($criteria['min_height'])) {
                $sub->where('height_cm', '>=', $criteria['min_height']);
            }
            if (!empty($criteria['min_weight'])) {
                $sub->where('weight_kg', '>=', $criteria['min_weight']);
            }
            if (!empty($criteria['max_height'])) {
                $sub->where('height_cm', '<=', $criteria['max_height']);
            }
            if (!empty($criteria['max_weight'])) {
                $sub->where('weight_kg', '<=', $criteria['max_weight']);
            }
            if (!empty($criteria['courses'])) {
                $sub->whereIn('course', (array) $criteria['courses']);
            }
            $sub->where(function (Builder $inner) use ($activityName) {
                $inner->whereJsonContains('sports_interests', $activityName)
                    ->orWhereJsonContains('activity_interests', $activityName)
                    ->orWhere('sports_interests', 'like', "%{$activityName}%")
                    ->orWhere('activity_interests', 'like', "%{$activityName}%");
            });
        });
    }
}
