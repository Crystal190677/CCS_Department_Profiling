<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Activity;
use App\Models\ActivityStudentRankOverride;
use App\Models\Enrollment;
use App\Models\StudentProfile;
use App\Models\User;
use App\Models\UserNotification;
use App\Services\ActivityQualificationScoringService;
use App\Services\ActivityQualificationService;
use App\Services\QualifiedStudentPresentationService;
use App\Support\AuditLogger;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StudentsController extends Controller
{
    /**
     * Phase 3 — Smart filter (qualification engine) for Admin/Faculty dashboard.
     *
     * Step 1: Base pool — users with role STUDENT (optional include_officers for officers list).
     * Step 2: Hard filters — {@see ActivityQualificationService::applyToUserQuery()}.
     * Step 3: Soft ranking — {@see ActivityQualificationScoringService::applyRankingSelectAndOrder()}.
     * Step 4: Qualified list presentation + Phase 4 manual filters (section, year, skill, interest_only, sort).
     */
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

        $filterActivity = null;
        if ($request->filled('qualify_for')) {
            $filterActivity = Activity::find($request->input('qualify_for'));
        } elseif ($request->filled('activity_id')) {
            $filterActivity = Activity::find($request->input('activity_id'));
        }

        if ($filterActivity) {
            $aid = $filterActivity->id;

            $excludedIds = ActivityStudentRankOverride::query()
                ->where('activity_id', $aid)
                ->where('type', ActivityStudentRankOverride::TYPE_EXCLUDE)
                ->pluck('user_id');
            if ($excludedIds->isNotEmpty()) {
                $query->whereNotIn('users.id', $excludedIds);
            }

            $query->whereDoesntHave('enrollments', fn ($q) => $q->where('activity_id', $aid))
                ->where(function ($q) use ($filterActivity) {
                    ActivityQualificationService::applyToUserQuery($q, $filterActivity);
                });

            if ($request->filled('profile_section')) {
                $sec = trim((string) $request->input('profile_section'));
                $query->whereHas('studentProfile', fn (Builder $q) => $q->where('section', 'like', '%'.$sec.'%'));
            }
            if ($request->filled('profile_year_level')) {
                $yl = trim((string) $request->input('profile_year_level'));
                $query->whereHas('studentProfile', fn (Builder $q) => $q->where('year_level', $yl));
            }
            if ($request->filled('skill')) {
                $sk = trim((string) $request->input('skill'));
                $query->whereHas('skillEntries', fn (Builder $q) => $q->where('skill', 'like', '%'.$sk.'%'));
            }
            if ($request->boolean('interest_only')) {
                $query->whereHas('interestDeclarations', fn (Builder $q) => $q->where('activity_id', $aid));
            }

            $query->select('users.*');
            $query->with(['skillEntries', 'conductEntries']);
            $sort = (string) $request->input('sort', 'score');
            $sortDir = (string) $request->input('sort_dir', 'desc');
            ActivityQualificationScoringService::applyRankingSelectAndOrder($query, $filterActivity, $sort, $sortDir);
        } else {
            if ($request->filled('skill')) {
                $sk = trim((string) $request->input('skill'));
                $query->whereHas('skillEntries', fn (Builder $q) => $q->where('skill', 'like', '%'.$sk.'%'));
            }
            if ($request->filled('course')) {
                $co = trim((string) $request->input('course'));
                $query->whereHas('studentProfile', fn (Builder $q) => $q->where('course', 'like', '%'.$co.'%'));
            }
            $query->with('skillEntries');
            $query->orderBy('name');
        }

        $students = $query->paginate((int) $request->input('per_page', 15));

        if ($filterActivity) {
            $scoreMax = ActivityQualificationScoringService::theoreticalMaxScore($filterActivity);
            $boostOverrides = ActivityStudentRankOverride::query()
                ->where('activity_id', $filterActivity->id)
                ->where('type', ActivityStudentRankOverride::TYPE_BOOST)
                ->get()
                ->keyBy('user_id');
            $students->getCollection()->transform(function (User $student) use ($filterActivity, $scoreMax, $boostOverrides) {
                $ov = $boostOverrides->get($student->id);
                QualifiedStudentPresentationService::appendToUser($student, $filterActivity, $scoreMax, $ov);

                return $student;
            });
        }

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

    /**
     * Admin: create a student user and baseline profile (personal + academic shell).
     */
    public function store(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|max:255|unique:users,email',
            'student_number' => 'required|string|max:50|unique:users,student_number',
            'password' => 'nullable|string|min:6',
            'course' => 'required|string|in:BSCS,BSIT',
            'section' => 'required|string|in:A,B,C,D,E',
            'academic_standing' => 'required|string|in:Regular,Irregular',
        ]);

        $hasInitialPassword = !empty($validated['password']);
        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'student_number' => $validated['student_number'],
            'password' => $hasInitialPassword ? $validated['password'] : Str::password(32),
            'password_set_at' => $hasInitialPassword ? now() : null,
            'role' => 'STUDENT',
        ]);

        StudentProfile::create([
            'user_id' => $user->id,
            'course' => $validated['course'],
            'year_level' => '1st yr',
            'section' => $validated['section'],
            'academic_standing' => $validated['academic_standing'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Student created',
            'data' => $user->fresh()->load(['studentProfile', 'skillEntries']),
        ], 201);
    }

    /**
     * Admin: delete a student and dependent records (cascading FKs).
     */
    public function destroy(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'ADMIN') {
            return response()->json(['success' => false, 'message' => 'Admin only'], 403);
        }

        $student = User::query()->whereIn('role', ['STUDENT', 'OFFICER'])->find($id);
        if (!$student) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        if ($student->id === $authUser->id) {
            return response()->json(['success' => false, 'message' => 'Cannot delete your own account'], 400);
        }

        $label = 'Student: '.$student->name.' (#'.$student->student_number.')';
        $student->delete();

        AuditLogger::log('deleted', $label, $authUser);

        return response()->json(['success' => true, 'message' => 'Student removed']);
    }

    /**
     * Toggle system role between STUDENT and OFFICER (same login: student number). Admin or Faculty.
     */
    public function updateRole(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || !in_array($authUser->role, ['ADMIN', 'FACULTY'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $validated = $request->validate([
            'role' => 'required|string|in:STUDENT,OFFICER',
        ]);

        $target = User::findOrFail($id);
        if (!in_array($target->role, ['STUDENT', 'OFFICER'], true) || $target->student_number === null || $target->student_number === '') {
            return response()->json(['success' => false, 'message' => 'Only student accounts with a student number can use this role'], 400);
        }

        if ($target->role === $validated['role']) {
            return response()->json(['success' => true, 'data' => $target]);
        }

        $target->role = $validated['role'];
        $target->save();

        AuditLogger::log(
            'updated',
            'Student/officer role → '.$validated['role'].': '.$target->name.' (#'.$target->student_number.')',
            $authUser
        );

        return response()->json([
            'success' => true,
            'message' => 'Role updated',
            'data' => $target->fresh(),
        ]);
    }

    /**
     * Phase 4 — Full profile for faculty/admin review (history, skills, conduct, enrollments, interests).
     */
    public function showFullProfile(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || !in_array($authUser->role, ['ADMIN', 'FACULTY'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $student = User::query()
            ->with([
                'studentProfile',
                'enrollments.activity',
                'skillEntries',
                'conductEntries' => fn ($q) => $q->orderByDesc('recorded_at'),
                'nonAcademicEntries' => fn ($q) => $q->orderByDesc('created_at'),
                'interestDeclarations.activity',
            ])
            ->findOrFail($id);

        if (!in_array($student->role, ['STUDENT', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Not a student record'], 404);
        }

        if ($authUser->role === 'FACULTY' && !$authUser->is_sports_faculty) {
            if ($student->relationLoaded('studentProfile') && $student->studentProfile) {
                $student->studentProfile->makeHidden(StudentProfile::PHYSICAL_FIELDS);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $student,
        ]);
    }

    /**
     * Minimal list for Officers (student picker). Optionally filter by profile year level
     * or irregular standing for membership-card views — includes student_profile when filtered.
     */
    public function listForOfficers(Request $request): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officers only'], 403);
        }

        $yearLevel = $request->filled('year_level') ? trim((string) $request->input('year_level')) : null;
        $irregularsOnly = $request->boolean('irregulars_only');
        $section = null;
        if ($request->filled('section')) {
            $section = strtoupper(trim((string) $request->input('section')));
            if (!in_array($section, ['A', 'B', 'C', 'D', 'E'], true)) {
                return response()->json(['success' => false, 'message' => 'Invalid section'], 422);
            }
        }

        $withProfile = $yearLevel !== null || $irregularsOnly || $section !== null;

        $query = User::query()
            ->whereIn('role', ['STUDENT', 'OFFICER'])
            ->orderBy('name');

        if ($yearLevel !== null) {
            $query->whereHas(
                'studentProfile',
                fn (Builder $q) => $q->where('year_level', $yearLevel)
            );
        }

        if ($section !== null) {
            $query->whereHas(
                'studentProfile',
                fn (Builder $q) => $q->where('section', $section)
            );
        }

        if ($irregularsOnly) {
            $query->whereHas(
                'studentProfile',
                fn (Builder $q) => $q->where('academic_standing', StudentProfile::ACADEMIC_STANDING_IRREGULAR)
            );
        }

        if ($withProfile) {
            $query->with('studentProfile');
        }

        $columns = ['id', 'name', 'student_number'];
        if ($withProfile) {
            $columns[] = 'email';
        }

        $students = $query->get($columns);

        if ($withProfile) {
            $students->each(function (User $student): void {
                if ($student->relationLoaded('studentProfile') && $student->studentProfile) {
                    $student->studentProfile->makeHidden(StudentProfile::PHYSICAL_FIELDS);
                }
            });
        }

        return response()->json([
            'success' => true,
            'data' => $students,
        ]);
    }

    /**
     * Officer: set or clear when a student availed their membership card (stored on student_profiles).
     */
    public function patchMembershipCardAvailed(Request $request, int $id): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || $authUser->role !== 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Officers only'], 403);
        }

        $request->validate([
            'membership_card_availed_at' => 'nullable|date',
        ]);

        $target = User::query()->whereIn('role', ['STUDENT', 'OFFICER'])->find($id);
        if (!$target) {
            return response()->json(['success' => false, 'message' => 'Student not found'], 404);
        }

        $raw = $request->input('membership_card_availed_at');
        $value = $raw === '' || $raw === null ? null : $raw;

        $profile = StudentProfile::query()->firstOrCreate(['user_id' => $target->id]);
        $profile->membership_card_availed_at = $value;
        $profile->save();

        $profile->makeHidden(StudentProfile::PHYSICAL_FIELDS);

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    /**
     * Phase 5 — Enroll with serialized slot check (lock + recount) and pending student confirmation for roster seats.
     */
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
        if (!in_array($student->role, ['STUDENT', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'User is not a student or officer account'], 400);
        }

        $activityId = (int) $request->input('activity_id');

        return DB::transaction(function () use ($request, $authUser, $student, $activityId): JsonResponse {
            $activity = Activity::whereKey($activityId)->lockForUpdate()->firstOrFail();

            if (Enrollment::query()
                ->where('user_id', $student->id)
                ->where('activity_id', $activityId)
                ->lockForUpdate()
                ->exists()) {
                return response()->json(['success' => false, 'message' => 'Student is already enrolled in this activity'], 400);
            }

            if (!ActivityQualificationService::userQualifies($student, $activity)) {
                return response()->json(['success' => false, 'message' => 'Student does not meet the qualification criteria for this activity'], 400);
            }

            $rosterCount = Enrollment::query()
                ->where('activity_id', $activityId)
                ->whereIn('status', Enrollment::rosterSeatStatuses())
                ->lockForUpdate()
                ->count();

            $maxEnrollees = $activity->max_enrollees ? (int) $activity->max_enrollees : null;
            $reserveSlots = $activity->reserve_slots ? (int) $activity->reserve_slots : 0;
            $waitlistCount = Enrollment::query()
                ->where('activity_id', $activityId)
                ->where('status', Enrollment::STATUS_WAITLIST)
                ->lockForUpdate()
                ->count();

            $status = Enrollment::STATUS_PENDING_CONFIRMATION;
            if ($maxEnrollees !== null && $rosterCount >= $maxEnrollees) {
                if ($reserveSlots > 0 && $waitlistCount < $reserveSlots) {
                    $status = Enrollment::STATUS_WAITLIST;
                } else {
                    return response()->json([
                        'success' => false,
                        'message' => 'No roster seats available. The last slot may have just been taken—refresh and try again if needed.',
                    ], 409);
                }
            }

            $enrollment = Enrollment::create([
                'user_id' => $student->id,
                'activity_id' => $activityId,
                'enrolled_by' => $authUser->id,
                'enrolled_at' => now(),
                'status' => $status,
            ]);

            $activity = $enrollment->activity;
            $enrolledBy = $authUser->name;

            if ($status === Enrollment::STATUS_WAITLIST) {
                $title = 'Added to waitlist';
                $message = "You have been added to the waitlist for {$activity->name} by {$enrolledBy}.";
            } else {
                $title = 'Enrollment pending your confirmation';
                $message = "You have been selected and enrolled in {$activity->name} by {$enrolledBy}. Please confirm your enrollment in your profile to finalize your spot.";
            }

            UserNotification::create([
                'user_id' => $student->id,
                'type' => 'enrollment',
                'title' => $title,
                'message' => $message,
                'data' => [
                    'student_id' => $student->id,
                    'enrollment_id' => $enrollment->id,
                    'activity_id' => $activity->id,
                    'enrolled_by_user_id' => $authUser->id,
                    'enrolled_by_name' => $enrolledBy,
                    'status' => $status,
                    'enrolled_at' => optional($enrollment->enrolled_at)->toIso8601String(),
                ],
            ]);

            return response()->json([
                'success' => true,
                'message' => $status === Enrollment::STATUS_WAITLIST
                    ? 'Student added to waitlist.'
                    : 'Enrollment recorded. The student has been notified to confirm.',
                'data' => $enrollment->load(['activity', 'enrolledByUser:id,name']),
            ], 201);
        });
    }

}
