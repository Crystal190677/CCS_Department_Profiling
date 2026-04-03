<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\StudentClassSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StudentScheduleController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$user || !in_array($user->role, ['STUDENT', 'OFFICER'], true)) {
            return response()->json(['success' => false, 'message' => 'Forbidden'], 403);
        }

        $profile = $user->studentProfile;
        $termParts = [];
        if ($profile) {
            if ($profile->year_level) {
                $termParts[] = $profile->year_level;
            }
            $sn = (int) ($profile->academic_semester ?? 1);
            $termParts[] = $sn === 2 ? '2nd semester' : '1st semester';
        }
        $termLabel = count($termParts) ? implode(' · ', $termParts) : null;

        $entries = StudentClassSchedule::query()
            ->where('user_id', $user->id)
            ->orderBy('day_of_week')
            ->orderBy('start_time')
            ->get()
            ->map(function (StudentClassSchedule $row) {
                $st = $row->start_time;
                $et = $row->end_time;
                if ($st instanceof \DateTimeInterface) {
                    $st = $st->format('H:i');
                } else {
                    $st = substr((string) $st, 0, 5);
                }
                if ($et instanceof \DateTimeInterface) {
                    $et = $et->format('H:i');
                } else {
                    $et = substr((string) $et, 0, 5);
                }

                return [
                    'course_code' => $row->course_code,
                    'day_of_week' => (int) $row->day_of_week,
                    'start_time' => $st,
                    'end_time' => $et,
                ];
            });

        return response()->json([
            'success' => true,
            'data' => [
                'entries' => $entries,
                'term_label' => $termLabel,
            ],
        ]);
    }
}
