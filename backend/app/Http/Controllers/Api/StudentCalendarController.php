<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CcsCourseAssignment;
use App\Models\CcsCourseOnlineSession;
use App\Models\CcsCourseTodo;
use App\Models\StudentClassSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class StudentCalendarController extends Controller
{
    private const TZ = 'Asia/Manila';

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['STUDENT', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $now = Carbon::now(self::TZ);
        $year = (int) $request->query('year', $now->year);
        $month = (int) $request->query('month', $now->month);
        if ($year < 1970 || $year > 2100 || $month < 1 || $month > 12) {
            return response()->json(['success' => false, 'message' => 'Invalid year or month'], 422);
        }

        $startLocal = Carbon::create($year, $month, 1, 0, 0, 0, self::TZ)->startOfDay();
        $endLocal = $startLocal->copy()->endOfMonth()->endOfDay();
        $startUtc = $startLocal->copy()->utc();
        $endUtc = $endLocal->copy()->utc();

        $scheduleCodes = StudentClassSchedule::query()
            ->where('user_id', $user->id)
            ->pluck('course_code');

        $todoCodes = CcsCourseTodo::query()
            ->where('user_id', $user->id)
            ->pluck('course_code');

        $courseCodes = $scheduleCodes->merge($todoCodes)->unique()->values()->all();

        $todos = CcsCourseTodo::query()
            ->where('user_id', $user->id)
            ->whereNotNull('due_at')
            ->whereBetween('due_at', [$startUtc, $endUtc])
            ->orderBy('due_at')
            ->get();

        $todoDayKeys = [];
        foreach ($todos as $t) {
            $d = $t->due_at->copy()->timezone(self::TZ)->format('Y-m-d');
            $todoDayKeys[$t->course_code.'|'.$d] = true;
        }

        $assignments = CcsCourseAssignment::query()
            ->whereIn('course_code', $courseCodes)
            ->whereNotNull('due_at')
            ->whereBetween('due_at', [$startUtc, $endUtc])
            ->orderBy('due_at')
            ->get();

        $events = [];

        foreach ($todos as $t) {
            $kind = $t->calendar_kind ?: 'task';
            $due = $t->due_at->copy()->timezone(self::TZ);
            $events[] = [
                'id' => 'todo-'.$t->id,
                'source' => 'todo',
                'kind' => $kind,
                'title' => $t->title,
                'course_code' => $t->course_code,
                'starts_at' => $due->toIso8601String(),
                'ends_at' => null,
                'due_at' => $due->toIso8601String(),
                'meeting_url' => null,
                'is_completed' => (bool) $t->is_completed,
            ];
        }

        foreach ($assignments as $a) {
            $d = $a->due_at->copy()->timezone(self::TZ)->format('Y-m-d');
            if (isset($todoDayKeys[$a->course_code.'|'.$d])) {
                continue;
            }
            $kind = match ($a->assignment_kind) {
                'quiz' => 'quiz',
                'activity' => 'activity',
                'assignment' => 'assignment',
                default => 'assignment',
            };
            $due = $a->due_at->copy()->timezone(self::TZ);
            $events[] = [
                'id' => 'assignment-'.$a->id,
                'source' => 'assignment',
                'kind' => $kind,
                'title' => $a->title,
                'course_code' => $a->course_code,
                'starts_at' => $due->toIso8601String(),
                'ends_at' => null,
                'due_at' => $due->toIso8601String(),
                'meeting_url' => null,
                'is_completed' => false,
            ];
        }

        if (count($courseCodes) > 0) {
            $sessions = CcsCourseOnlineSession::query()
                ->whereIn('course_code', $courseCodes)
                ->where('starts_at', '<=', $endUtc)
                ->where(function ($q) use ($startUtc) {
                    $q->whereNull('ends_at')->orWhere('ends_at', '>=', $startUtc);
                })
                ->orderBy('starts_at')
                ->get();

            foreach ($sessions as $s) {
                $start = $s->starts_at->copy()->timezone(self::TZ);
                $end = $s->ends_at?->copy()->timezone(self::TZ);
                $events[] = [
                    'id' => 'session-'.$s->id,
                    'source' => 'online_session',
                    'kind' => 'meet',
                    'title' => $s->title,
                    'course_code' => $s->course_code,
                    'starts_at' => $start->toIso8601String(),
                    'ends_at' => $end?->toIso8601String(),
                    'due_at' => null,
                    'meeting_url' => $s->meeting_url,
                    'is_completed' => false,
                ];
            }
        }

        usort($events, function (array $a, array $b) {
            $c = strcmp($a['starts_at'] ?? '', $b['starts_at'] ?? '');
            if ($c !== 0) {
                return $c;
            }

            return strcmp($a['id'] ?? '', $b['id'] ?? '');
        });

        return response()->json([
            'success' => true,
            'data' => [
                'timezone' => self::TZ,
                'year' => $year,
                'month' => $month,
                'events' => $events,
            ],
        ]);
    }
}
