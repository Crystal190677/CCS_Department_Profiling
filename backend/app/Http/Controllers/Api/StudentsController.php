<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Enrollment;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['studentProfile', 'enrollments.activity'])
            ->where('role', 'STUDENT');

        // Search: name, student_number, email
        if ($search = $request->get('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('student_number', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }

        // Filter by activity
        if ($activityId = $request->get('activity_id')) {
            $activity = Activity::find($activityId);
            if ($activity) {
                $query->whereDoesntHave('enrollments', fn ($q) => $q->where('activity_id', $activityId))
                    ->where(function ($q) use ($activity) {
                        $this->applyQualificationFilter($q, $activity);
                    });
            }
        }

        // Filter by qualification (smart filter)
        if ($qualifyFor = $request->get('qualify_for')) {
            $activity = Activity::find($qualifyFor);
            if ($activity) {
                $query->whereDoesntHave('enrollments', fn ($q) => $q->where('activity_id', $activity->id))
                    ->where(function ($q) use ($activity) {
                        $this->applyQualificationFilter($q, $activity);
                    });
            }
        }

        $students = $query->orderBy('name')->paginate($request->get('per_page', 15));

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

        $student = User::findOrFail($request->student_id);
        if ($student->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'User is not a student'], 400);
        }

        $exists = Enrollment::where('user_id', $student->id)
            ->where('activity_id', $request->activity_id)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Student already enrolled'], 400);
        }

        $enrollment = Enrollment::create([
            'user_id' => $student->id,
            'activity_id' => $request->activity_id,
            'enrolled_by' => $request->user()->id,
        ]);

        $activity = $enrollment->activity;
        $enrolledBy = $request->user()->name;

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

    private function applyQualificationFilter($query, Activity $activity): void
    {
        $criteria = $activity->criteria ?? [];
        $activityName = strtolower($activity->name);

        $query->whereHas('studentProfile', function ($sub) use ($criteria, $activityName) {
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
            $sub->where(function ($inner) use ($activityName) {
                $inner->whereJsonContains('sports_interests', $activityName)
                    ->orWhereJsonContains('activity_interests', $activityName)
                    ->orWhere('sports_interests', 'like', "%{$activityName}%")
                    ->orWhere('activity_interests', 'like', "%{$activityName}%");
            });
        });
    }
}
