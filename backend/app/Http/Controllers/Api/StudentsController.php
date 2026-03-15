<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\Enrollment;
use App\Models\StudentConductEntry;
use App\Models\StudentProfile;
use App\Models\StudentSkillEntry;
use App\Models\User;
use App\Models\UserNotification;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentsController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = User::with(['studentProfile', 'enrollments.activity', 'officerPositions.activity', 'interestDeclarations.activity']);
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

        $authUser = $request->user();
        if ($authUser && ($authUser->role === 'OFFICER' || ($authUser->role === 'FACULTY' && !$authUser->is_sports_faculty))) {
            $students->getCollection()->transform(function ($student) {
                if ($student->relationLoaded('studentProfile') && $student->studentProfile) {
                    $student->studentProfile->makeHidden(StudentProfile::PHYSICAL_FIELDS);
                }
                return $student;
            });
        }

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    /** Minimal list for Officers to select a student and view their non-academic entries. */
    public function listForOfficers(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officers only'], 403);
        }

        $students = User::whereIn('role', ['STUDENT', 'OFFICER'])
            ->orderBy('name')
            ->get(['id', 'name', 'student_number']);

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

        $activityId = (int) $request->input('activity_id');
        $activity = Activity::findOrFail($activityId);

        $exists = Enrollment::where('user_id', $student->id)
            ->where('activity_id', $activityId)
            ->exists();

        if ($exists) {
            return response()->json(['success' => false, 'message' => 'Student already enrolled'], 400);
        }

        $activeCount = Enrollment::where('activity_id', $activityId)->where('status', 'active')->count();
        $maxEnrollees = $activity->max_enrollees ? (int) $activity->max_enrollees : null;
        $reserveSlots = $activity->reserve_slots ? (int) $activity->reserve_slots : 0;
        $waitlistCount = Enrollment::where('activity_id', $activityId)->where('status', 'waitlist')->count();
        $status = 'active';
        if ($maxEnrollees !== null) {
            if ($activeCount >= $maxEnrollees) {
                if ($reserveSlots > 0 && $waitlistCount < $reserveSlots) {
                    $status = 'waitlist';
                } else {
                    return response()->json(['success' => false, 'message' => 'Activity has reached maximum enrollees and waitlist is full'], 400);
                }
            }
        }

        $enrollment = Enrollment::create([
            'user_id' => $student->id,
            'activity_id' => $activityId,
            'enrolled_by' => $authUser->id,
            'status' => $status,
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

        // Academic requirements (student must have a profile for these)
        $query->whereHas('studentProfile', function (Builder $sub) use ($criteria) {
            if (isset($criteria['min_gpa']) && $criteria['min_gpa'] !== '' && $criteria['min_gpa'] !== null) {
                $sub->where('current_gpa', '>=', (float) $criteria['min_gpa']);
            }
            if (isset($criteria['max_failed_units']) && $criteria['max_failed_units'] !== '' && $criteria['max_failed_units'] !== null) {
                $sub->where(function (Builder $q) use ($criteria) {
                    $q->whereNull('failed_units')->orWhere('failed_units', '<=', (int) $criteria['max_failed_units']);
                });
            }
            if (!empty($criteria['academic_standings']) && is_array($criteria['academic_standings'])) {
                $sub->whereIn('academic_standing', $criteria['academic_standings']);
            }
            if (isset($criteria['year_level_min']) && $criteria['year_level_min'] !== '' && $criteria['year_level_min'] !== null) {
                $sub->where('year_level', '>=', (int) $criteria['year_level_min']);
            }
            if (isset($criteria['enrolled_units_min']) && $criteria['enrolled_units_min'] !== '' && $criteria['enrolled_units_min'] !== null) {
                $sub->where('enrolled_units', '>=', (int) $criteria['enrolled_units_min']);
            }
            // Physical: min_height_cm (support both min_height and min_height_cm for backward compat)
            $minH = $criteria['min_height_cm'] ?? $criteria['min_height'] ?? null;
            if ($minH !== null && $minH !== '') {
                $sub->where('height_cm', '>=', (float) $minH);
            }
        });

        // Conflicting activity enrollment: must not be enrolled in conflicting activities
        $conflictingIds = $criteria['conflicting_activity_ids'] ?? [];
        if (!empty($conflictingIds) && is_array($conflictingIds)) {
            $query->whereDoesntHave('enrollments', function (Builder $q) use ($conflictingIds) {
                $q->whereIn('activity_id', $conflictingIds)->where('status', 'active');
            });
        }

        // Conduct: no Major/Grave violations (or within allowed)
        if (!empty($criteria['no_major_grave'])) {
            $query->whereDoesntHave('conductEntries', function (Builder $q) {
                $q->where('type', StudentConductEntry::TYPE_VIOLATION)
                    ->whereIn('severity', [StudentConductEntry::SEVERITY_MAJOR, StudentConductEntry::SEVERITY_GRAVE]);
            });
        }
        if (isset($criteria['max_minor_violations']) && $criteria['max_minor_violations'] !== '' && $criteria['max_minor_violations'] !== null) {
            $maxMinor = (int) $criteria['max_minor_violations'];
            $query->whereHas('conductEntries', function (Builder $q) use ($maxMinor) {
                $q->where('type', StudentConductEntry::TYPE_VIOLATION)->where('severity', StudentConductEntry::SEVERITY_MINOR);
            }, '<=', $maxMinor);
        }

        // Skills: required_skills (array of {skill, min_proficiency})
        $requiredSkills = $criteria['required_skills'] ?? [];
        if (!empty($requiredSkills) && is_array($requiredSkills)) {
            foreach ($requiredSkills as $req) {
                $skillName = is_array($req) ? ($req['skill'] ?? $req['name'] ?? '') : (string) $req;
                $minProf = is_array($req) ? ($req['min_proficiency'] ?? 'Beginner') : 'Beginner';
                if ($skillName === '') {
                    continue;
                }
                $query->whereHas('skillEntries', function (Builder $q) use ($skillName, $minProf) {
                    $q->where('skill', $skillName);
                    $order = ['Beginner' => 1, 'Intermediate' => 2, 'Advanced' => 3, 'Expert' => 4];
                    $minLevel = $order[$minProf] ?? 1;
                    $allowed = array_filter(array_keys($order), fn ($p) => ($order[$p] ?? 0) >= $minLevel);
                    if (!empty($allowed)) {
                        $q->whereIn('proficiency_level', $allowed);
                    }
                });
            }
        }
    }
}
