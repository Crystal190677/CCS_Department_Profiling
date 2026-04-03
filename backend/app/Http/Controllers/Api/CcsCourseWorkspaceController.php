<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CcsCourseAssignment;
use App\Models\CcsCourseOnlineSession;
use App\Models\CcsCoursePost;
use App\Models\CcsCourseScore;
use App\Models\CcsCourseTodo;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CcsCourseWorkspaceController extends Controller
{
    public function show(Request $request, string $courseCode): JsonResponse
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['STUDENT', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $code = strtoupper(trim($courseCode));
        if ($code === '') {
            return response()->json(['success' => false, 'message' => 'Invalid course code'], 422);
        }

        $classPosts = CcsCoursePost::query()
            ->where('course_code', $code)
            ->whereIn('post_type', ['announcement', 'module'])
            ->orderByDesc('created_at')
            ->get()
            ->map(fn (CcsCoursePost $p) => [
                'id' => $p->id,
                'post_type' => $p->post_type,
                'title' => $p->title,
                'body' => $p->body,
                'professor_name' => $p->professor_name,
                'created_at' => $p->created_at?->toIso8601String(),
            ]);

        $assignments = CcsCourseAssignment::query()
            ->where('course_code', $code)
            ->where('assignment_kind', 'assignment')
            ->orderByRaw('due_at IS NULL')
            ->orderBy('due_at')
            ->orderBy('title')
            ->get()
            ->map(fn (CcsCourseAssignment $a) => $this->mapAssignment($a));

        $quizzesActivities = CcsCourseAssignment::query()
            ->where('course_code', $code)
            ->whereIn('assignment_kind', ['quiz', 'activity'])
            ->orderByRaw('due_at IS NULL')
            ->orderBy('due_at')
            ->orderBy('title')
            ->get()
            ->map(fn (CcsCourseAssignment $a) => $this->mapAssignment($a));

        $todos = CcsCourseTodo::query()
            ->where('user_id', $user->id)
            ->where('course_code', $code)
            ->orderByRaw('due_at IS NULL')
            ->orderBy('due_at')
            ->orderBy('title')
            ->get()
            ->map(fn (CcsCourseTodo $t) => [
                'id' => $t->id,
                'title' => $t->title,
                'due_at' => $t->due_at?->toIso8601String(),
                'is_completed' => (bool) $t->is_completed,
                'calendar_kind' => $t->calendar_kind,
            ]);

        $onlineClasses = CcsCourseOnlineSession::query()
            ->where('course_code', $code)
            ->orderBy('starts_at')
            ->get()
            ->map(fn (CcsCourseOnlineSession $s) => [
                'id' => $s->id,
                'title' => $s->title,
                'meeting_url' => $s->meeting_url,
                'platform' => $s->platform,
                'starts_at' => $s->starts_at?->toIso8601String(),
                'ends_at' => $s->ends_at?->toIso8601String(),
            ]);

        $postGrades = CcsCourseScore::query()
            ->where('user_id', $user->id)
            ->where('course_code', $code)
            ->orderByDesc('graded_at')
            ->orderBy('assessment_title')
            ->get()
            ->map(fn (CcsCourseScore $s) => [
                'id' => $s->id,
                'assessment_title' => $s->assessment_title,
                'points_earned' => (float) $s->points_earned,
                'points_max' => (float) $s->points_max,
                'percentage' => (float) $s->percentage,
                'graded_at' => $s->graded_at?->format('Y-m-d'),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'classPosts' => $classPosts,
                'assignments' => $assignments,
                'quizzesActivities' => $quizzesActivities,
                'todos' => $todos,
                'onlineClasses' => $onlineClasses,
                'postGrades' => $postGrades,
            ],
        ]);
    }

    private function mapAssignment(CcsCourseAssignment $a): array
    {
        return [
            'id' => $a->id,
            'kind' => $a->assignment_kind,
            'title' => $a->title,
            'description' => $a->description,
            'due_at' => $a->due_at?->toIso8601String(),
        ];
    }
}
