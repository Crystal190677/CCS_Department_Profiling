<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentProfileController extends Controller
{
    /** Physical + non-academic fields that students may update (Officers cannot update physical). */
    private const STUDENT_EDITABLE = [
        'height_cm', 'weight_kg', 'dominant_hand', 'preferred_position',
        'sports_interests', 'activity_interests', 'skills', 'notes',
    ];

    private const PHYSICAL_FIELDS = StudentProfile::PHYSICAL_FIELDS;

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        $profile = $user->studentProfile;

        if (!$profile) {
            return response()->json([
                'success' => true,
                'data' => null,
            ]);
        }

        $data = $profile->toArray();
        if ($user->role === 'OFFICER') {
            foreach (self::PHYSICAL_FIELDS as $key) {
                unset($data[$key]);
            }
        }

        return response()->json([
            'success' => true,
            'data' => $data,
        ]);
    }

    /**
     * Student/Officer: update own profile (non-academic fields only).
     * Academic data is read-only for students; only Admin can edit it.
     */
    public function store(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'message' => 'Unauthenticated'], 401);
        }

        if ($user->role !== 'STUDENT' && $user->role !== 'OFFICER') {
            return response()->json(['success' => false, 'message' => 'Only students or officers can update their own profile here'], 403);
        }

        $allowed = $user->role === 'STUDENT' ? self::STUDENT_EDITABLE : array_diff(self::STUDENT_EDITABLE, self::PHYSICAL_FIELDS);
        $allowed = array_values($allowed);

        $request->validate([
            'height_cm' => 'nullable|numeric|min:0',
            'weight_kg' => 'nullable|numeric|min:0',
            'dominant_hand' => 'nullable|string|max:50',
            'preferred_position' => 'nullable|string|max:100',
            'sports_interests' => 'nullable|array',
            'sports_interests.*' => 'string|max:50',
            'activity_interests' => 'nullable|array',
            'activity_interests.*' => 'string|max:50',
            'skills' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $profile = $user->studentProfile()->updateOrCreate(
            ['user_id' => $user->id],
            $request->only($allowed)
        );

        return response()->json([
            'success' => true,
            'data' => $profile,
        ], 201);
    }

    /**
     * Admin only: update any student's profile including academic data.
     * Admin-only update path for student profiles (talent directory / class list).
     */
    public function updateForStudent(Request $request, int $userId): JsonResponse
    {
        $authUser = $request->user();
        if (!$authUser || !in_array($authUser->role, ['ADMIN', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Only Admin or Officer can edit student academic data'], 403);
        }

        $targetUser = User::find($userId);
        if (!$targetUser || ($targetUser->role !== 'STUDENT' && $targetUser->role !== 'OFFICER')) {
            return response()->json(['success' => false, 'message' => 'User not found or not a student/officer'], 404);
        }

        // Admins may update academic / placement / card records only — not personal identity, physical, or student-managed interests.
        $request->validate([
            'course' => 'nullable|string|max:100',
            'year_level' => 'nullable|string|max:20',
            'academic_semester' => 'nullable|integer|in:1,2',
            'current_gpa' => 'nullable|numeric|min:0|max:5',
            'gpa_per_semester' => 'nullable|array',
            'gpa_per_semester.*.semester' => 'string|max:30',
            'gpa_per_semester.*.gpa' => 'numeric|min:0|max:5',
            'academic_standing' => 'nullable|string|in:Regular,Irregular,Probationary,On hold',
            'section' => 'nullable|string|max:50',
            'failed_units' => 'nullable|integer|min:0',
            'incomplete_grades' => 'nullable|integer|min:0',
            'enrolled_units' => 'nullable|integer|min:0',
            'membership_card_availed_at' => 'nullable|date',
        ]);

        $allowed = [
            'course', 'year_level', 'academic_semester', 'current_gpa', 'gpa_per_semester',
            'academic_standing', 'section', 'failed_units', 'incomplete_grades', 'enrolled_units',
            'membership_card_availed_at',
        ];

        $profile = StudentProfile::updateOrCreate(
            ['user_id' => $targetUser->id],
            $request->only($allowed)
        );

        return response()->json([
            'success' => true,
            'message' => 'Profile updated',
            'data' => $profile,
        ]);
    }
}
