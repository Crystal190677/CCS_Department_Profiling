<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentPersonalCalendarEvent;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Validation\ValidationException;

class StudentCalendarController extends Controller
{
    private const TZ = 'Asia/Manila';

    private function forbiddenUnlessStudentOrOfficer(?User $user): ?JsonResponse
    {
        if (!$user || !in_array($user->role, ['STUDENT', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        return null;
    }

    private function eventToPayload(StudentPersonalCalendarEvent $e): array
    {
        $start = $e->starts_at->copy()->timezone(self::TZ);
        $end = $e->ends_at->copy()->timezone(self::TZ);

        return [
            'id' => $e->id,
            'source' => 'personal',
            'kind' => 'personal',
            'title' => $e->title,
            'description' => $e->description,
            'course_code' => null,
            'starts_at' => $start->toIso8601String(),
            'ends_at' => $end->toIso8601String(),
            'due_at' => null,
            'meeting_url' => null,
            'is_completed' => false,
        ];
    }

    /**
     * @param  array{event_date: string, start_time: string, end_time: string}  $input
     * @return array{startUtc: Carbon, endUtc: Carbon}
     */
    private function parseManilaRange(array $input): array
    {
        $date = $input['event_date'];
        $startT = $this->normalizeTimeString($input['start_time']);
        $endT = $this->normalizeTimeString($input['end_time']);

        if ($startT === '' || $endT === '') {
            throw ValidationException::withMessages([
                'start_time' => ['Use a valid time (HH:MM).'],
            ]);
        }

        try {
            $startLocal = Carbon::createFromFormat('Y-m-d H:i:s', $date.' '.$startT, self::TZ);
            $endLocal = Carbon::createFromFormat('Y-m-d H:i:s', $date.' '.$endT, self::TZ);
        } catch (\Throwable) {
            throw ValidationException::withMessages([
                'event_date' => ['Invalid date or time.'],
            ]);
        }

        if ($endLocal->lte($startLocal)) {
            throw ValidationException::withMessages([
                'end_time' => ['End time must be after start time.'],
            ]);
        }

        return [
            'startUtc' => $startLocal->copy()->utc(),
            'endUtc' => $endLocal->copy()->utc(),
        ];
    }

    private function normalizeTimeString(string $raw): string
    {
        $t = trim($raw);
        if (preg_match('/^\d{2}:\d{2}$/', $t)) {
            return $t.':00';
        }
        if (preg_match('/^\d{2}:\d{2}:\d{2}$/', $t)) {
            return $t;
        }

        return '';
    }

    public function index(Request $request): JsonResponse
    {
        if ($deny = $this->forbiddenUnlessStudentOrOfficer($request->user())) {
            return $deny;
        }
        $user = $request->user();

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

        $rows = StudentPersonalCalendarEvent::query()
            ->where('user_id', $user->id)
            ->where('starts_at', '<=', $endUtc)
            ->where('ends_at', '>=', $startUtc)
            ->orderBy('starts_at')
            ->orderBy('id')
            ->get();

        $events = $rows->map(fn (StudentPersonalCalendarEvent $e) => $this->eventToPayload($e))->all();

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

    public function storeEvent(Request $request): JsonResponse
    {
        if ($deny = $this->forbiddenUnlessStudentOrOfficer($request->user())) {
            return $deny;
        }
        $user = $request->user();

        $validated = $request->validate([
            'title' => 'required|string|max:255',
            'event_date' => 'required|date_format:Y-m-d',
            'start_time' => ['required', 'string', 'max:8', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'end_time' => ['required', 'string', 'max:8', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'description' => 'nullable|string|max:5000',
        ]);

        $range = $this->parseManilaRange([
            'event_date' => $validated['event_date'],
            'start_time' => $validated['start_time'],
            'end_time' => $validated['end_time'],
        ]);

        $event = StudentPersonalCalendarEvent::create([
            'user_id' => $user->id,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'starts_at' => $range['startUtc'],
            'ends_at' => $range['endUtc'],
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Event created',
            'data' => $this->eventToPayload($event),
        ], 201);
    }

    public function updateEvent(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->forbiddenUnlessStudentOrOfficer($request->user())) {
            return $deny;
        }
        $user = $request->user();

        $event = StudentPersonalCalendarEvent::where('user_id', $user->id)->find($id);
        if (!$event) {
            return response()->json(['success' => false, 'message' => 'Event not found'], 404);
        }

        $validated = $request->validate([
            'title' => 'sometimes|required|string|max:255',
            'event_date' => 'sometimes|required|date_format:Y-m-d',
            'start_time' => ['sometimes', 'required', 'string', 'max:8', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'end_time' => ['sometimes', 'required', 'string', 'max:8', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'description' => 'nullable|string|max:5000',
        ]);

        $hasDate = array_key_exists('event_date', $validated);
        $hasStart = array_key_exists('start_time', $validated);
        $hasEnd = array_key_exists('end_time', $validated);
        if ($hasDate || $hasStart || $hasEnd) {
            if (!($hasDate && $hasStart && $hasEnd)) {
                return response()->json([
                    'success' => false,
                    'message' => 'event_date, start_time, and end_time must be sent together when updating schedule.',
                ], 422);
            }
            $range = $this->parseManilaRange([
                'event_date' => $validated['event_date'],
                'start_time' => $validated['start_time'],
                'end_time' => $validated['end_time'],
            ]);
            $event->starts_at = $range['startUtc'];
            $event->ends_at = $range['endUtc'];
        }

        if (array_key_exists('title', $validated)) {
            $event->title = $validated['title'];
        }
        if (array_key_exists('description', $validated)) {
            $event->description = $validated['description'];
        }

        $event->save();

        return response()->json([
            'success' => true,
            'message' => 'Event updated',
            'data' => $this->eventToPayload($event->fresh()),
        ]);
    }

    public function destroyEvent(Request $request, int $id): JsonResponse
    {
        if ($deny = $this->forbiddenUnlessStudentOrOfficer($request->user())) {
            return $deny;
        }
        $user = $request->user();

        $event = StudentPersonalCalendarEvent::where('user_id', $user->id)->find($id);
        if (!$event) {
            return response()->json(['success' => false, 'message' => 'Event not found'], 404);
        }
        $event->delete();

        return response()->json([
            'success' => true,
            'message' => 'Event deleted',
        ]);
    }
}
