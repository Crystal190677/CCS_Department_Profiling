<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentProfileController extends Controller
{
    public function show(Request $request): JsonResponse
    {
        $profile = $request->user()->studentProfile;

        if (!$profile) {
            return response()->json([
                'success' => true,
                'data' => null,
            ]);
        }

        return response()->json([
            'success' => true,
            'data' => $profile,
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        if ($request->user()->role !== 'STUDENT') {
            return response()->json(['success' => false, 'message' => 'Only students can create profiles'], 403);
        }

        $request->validate([
            'height_cm' => 'nullable|numeric|min:0',
            'weight_kg' => 'nullable|numeric|min:0',
            'course' => 'nullable|string|max:100',
            'year_level' => 'nullable|string|max:20',
            'sports_interests' => 'nullable|array',
            'sports_interests.*' => 'string|max:50',
            'activity_interests' => 'nullable|array',
            'activity_interests.*' => 'string|max:50',
            'skills' => 'nullable|string',
            'notes' => 'nullable|string',
        ]);

        $profile = $request->user()->studentProfile()->updateOrCreate(
            ['user_id' => $request->user()->id],
            $request->only([
                'height_cm', 'weight_kg', 'course', 'year_level',
                'sports_interests', 'activity_interests', 'skills', 'notes',
            ])
        );

        return response()->json([
            'success' => true,
            'data' => $profile,
        ], 201);
    }
}
