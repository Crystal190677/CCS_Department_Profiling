<?php

namespace Database\Seeders;

use App\Models\CcsCourseAssignment;
use App\Models\CcsCourseOnlineSession;
use App\Models\CcsCoursePost;
use App\Models\CcsCourseScore;
use App\Models\CcsCourseTodo;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;

/**
 * Demo data for CCS course workspace (six tabs: Class Post, Assignment, Quizzes & Activities, To-Do, Online Classes, Post Grades).
 * Dates use Asia/Manila; calendar + To-Do stay aligned.
 */
class CcsCourseWorkspaceDemoSeeder extends Seeder
{
    private const TZ = 'Asia/Manila';

    public function run(): void
    {
        $faculty = User::query()->where('email', 'faculty@ccs.edu')->first();
        $profName = $faculty?->name ?? 'Prof. John Faculty';

        $student = User::query()->where('email', 'student@ccs.edu')->first();
        $officer = User::query()->where('email', 'officer@ccs.edu')->first();

        foreach (['CCS107', 'CCS108'] as $courseCode) {
            $this->seedClassPosts($courseCode, $profName);
            $this->seedAssignmentsAndActivities($courseCode);
            $this->seedOnlineSessions($courseCode);
        }

        if ($student) {
            $this->seedTodosAndScores($student->id, 'CCS107');
            $this->seedTodosAndScores($student->id, 'CCS108');
        }
        if ($officer) {
            $this->seedTodosAndScores($officer->id, 'CCS107');
        }
    }

    private function monthBase(): Carbon
    {
        return Carbon::now(self::TZ)->startOfMonth()->startOfDay();
    }

    /** @return Carbon Safe day-of-month in current Manila month */
    private function atMonthDay(int $day, int $hour = 9, int $minute = 0): Carbon
    {
        $base = $this->monthBase();
        $dim = Carbon::create((int) $base->year, (int) $base->month, 1, 0, 0, 0, self::TZ)->daysInMonth;
        $d = max(1, min($day, $dim));

        return Carbon::create(
            (int) $base->year,
            (int) $base->month,
            $d,
            $hour,
            $minute,
            0,
            self::TZ
        );
    }

    /** Class Post tab: announcements and modules only */
    private function seedClassPosts(string $courseCode, string $profName): void
    {
        $rows = [
            [
                'post_type' => 'announcement',
                'title' => 'Welcome to '.$courseCode,
                'body' => 'Please read the syllabus on the Modules tab and join our discussion group. First synchronous session is Week 2.',
            ],
            [
                'post_type' => 'module',
                'title' => 'Module 1: Orientation & OOP review',
                'body' => 'Slides, readings, and two short screencasts are posted. Complete the entry quiz before Friday.',
            ],
            [
                'post_type' => 'module',
                'title' => 'Module 2: Inheritance and polymorphism',
                'body' => 'Lab environment links and starter code are inside this module. Submit Lab 2 under Assignments when due.',
            ],
        ];

        foreach ($rows as $r) {
            CcsCoursePost::query()->updateOrCreate(
                [
                    'course_code' => $courseCode,
                    'title' => $r['title'],
                ],
                array_merge($r, ['professor_name' => $profName])
            );
        }

        CcsCoursePost::query()
            ->where('course_code', $courseCode)
            ->where('post_type', 'activity')
            ->delete();
    }

    private function seedAssignmentsAndActivities(string $courseCode): void
    {
        $items = [
            ['kind' => 'assignment', 'title' => 'Written assignment — UML class diagram', 'description' => 'Submit a PDF diagram for the week-2 case study. Rubric is on the module page.', 'day' => 7, 'hour' => 23, 'minute' => 59],
            ['kind' => 'assignment', 'title' => 'Lab 1 — Classes and objects', 'description' => 'Implement the `BankAccount` class hierarchy per spec sheet (PDF in Module 1).', 'day' => 10, 'hour' => 16, 'minute' => 0],
            ['kind' => 'quiz', 'title' => 'Quiz 1 — OOP fundamentals', 'description' => '20 items, 30 minutes, one attempt. Covers encapsulation through interfaces.', 'day' => 14, 'hour' => 21, 'minute' => 0],
            ['kind' => 'activity', 'title' => 'Discussion: Design patterns in real projects', 'description' => 'Pick one pattern (e.g. Observer, Factory) and post a short reflection in the forum thread.', 'day' => 18, 'hour' => 11, 'minute' => 59],
            ['kind' => 'activity', 'title' => 'Pair programming milestone', 'description' => 'With your assigned partner, refactor the week-3 starter into layered packages.', 'day' => 22, 'hour' => 17, 'minute' => 30],
            ['kind' => 'quiz', 'title' => 'Quiz 2 — Polymorphism & SOLID intro', 'description' => '15 items, untimed practice mode available until due date.', 'day' => 26, 'hour' => 20, 'minute' => 0],
        ];

        foreach ($items as $item) {
            $due = $this->atMonthDay($item['day'], $item['hour'], $item['minute']);
            CcsCourseAssignment::query()->updateOrCreate(
                [
                    'course_code' => $courseCode,
                    'title' => $item['title'],
                ],
                [
                    'assignment_kind' => $item['kind'],
                    'description' => $item['description'],
                    'due_at' => $due,
                ]
            );
        }
    }

    private function seedOnlineSessions(string $courseCode): void
    {
        $zoomBase = 'https://zoom.us/j/ccs-demo-';

        $sessions = [
            [
                'title' => 'Google Meet — '.$courseCode.' sync lecture',
                'meeting_url' => 'https://meet.google.com/'.substr(md5($courseCode.'-lec'), 0, 3).'-'.substr(md5($courseCode), 0, 4).'-'.substr(md5($courseCode.'x'), 0, 3),
                'platform' => 'Google Meet',
                'day' => 2,
                'sh' => 9,
                'sm' => 0,
                'durMin' => 120,
            ],
            [
                'title' => 'Google Meet — lab walkthrough',
                'meeting_url' => 'https://meet.google.com/abc-mnop-qrz',
                'platform' => 'Google Meet',
                'day' => 9,
                'sh' => 13,
                'sm' => 30,
                'durMin' => 90,
            ],
            [
                'title' => 'Zoom — consultation hours',
                'meeting_url' => $zoomBase.strtolower($courseCode),
                'platform' => 'Zoom',
                'day' => 15,
                'sh' => 10,
                'sm' => 0,
                'durMin' => 60,
            ],
            [
                'title' => 'Google Meet — mid-month review',
                'meeting_url' => 'https://meet.google.com/'.substr(md5($courseCode.'-mid'), 0, 3).'-'.substr(md5($courseCode.'m'), 0, 4).'-'.substr(md5($courseCode.'n'), 0, 3),
                'platform' => 'Google Meet',
                'day' => 16,
                'sh' => 15,
                'sm' => 0,
                'durMin' => 75,
            ],
            [
                'title' => 'Zoom — Saturday catch-up',
                'meeting_url' => $zoomBase.'sat-'.strtolower($courseCode),
                'platform' => 'Zoom',
                'day' => 19,
                'sh' => 9,
                'sm' => 0,
                'durMin' => 90,
            ],
            [
                'title' => 'Google Meet — Q&A before Quiz 2',
                'meeting_url' => 'https://meet.google.com/'.substr(md5($courseCode.'-qa'), 0, 3).'-'.substr(md5($courseCode.'q'), 0, 4).'-'.substr(md5($courseCode.'r'), 0, 3),
                'platform' => 'Google Meet',
                'day' => 25,
                'sh' => 19,
                'sm' => 0,
                'durMin' => 45,
            ],
        ];

        foreach ($sessions as $s) {
            $start = $this->atMonthDay($s['day'], $s['sh'], $s['sm']);
            $end = $start->copy()->addMinutes($s['durMin']);
            CcsCourseOnlineSession::query()->updateOrCreate(
                [
                    'course_code' => $courseCode,
                    'title' => $s['title'],
                ],
                [
                    'meeting_url' => $s['meeting_url'],
                    'platform' => $s['platform'],
                    'starts_at' => $start,
                    'ends_at' => $end,
                ]
            );
        }
    }

    private function seedTodosAndScores(int $userId, string $courseCode): void
    {
        $scoresBase = Carbon::now(self::TZ)->startOfDay();

        /** Todos on days that do NOT duplicate assignment due dates (same course + day) so assignment rows still appear on calendar where intended. */
        $todos = [
            ['title' => 'Read module slides before Meet session', 'day' => 1, 'hour' => 8, 'minute' => 0, 'is_completed' => false, 'calendar_kind' => 'task'],
            ['title' => 'Upload scanned notes to portfolio', 'day' => 5, 'hour' => 18, 'minute' => 0, 'is_completed' => false, 'calendar_kind' => 'activity'],
            ['title' => 'Peer review partner’s UML draft', 'day' => 8, 'hour' => 12, 'minute' => 0, 'is_completed' => false, 'calendar_kind' => 'activity'],
            ['title' => 'Review quiz flashcards (Ch. 3–4)', 'day' => 12, 'hour' => 20, 'minute' => 30, 'is_completed' => false, 'calendar_kind' => 'quiz'],
            ['title' => 'Email instructor re excused absence', 'day' => 11, 'hour' => 9, 'minute' => 0, 'is_completed' => true, 'calendar_kind' => 'task'],
            ['title' => 'Optional: watch async GC lecture', 'day' => null, 'hour' => 0, 'minute' => 0, 'is_completed' => false, 'calendar_kind' => null],
        ];

        foreach ($todos as $t) {
            $due = $t['day'] !== null
                ? $this->atMonthDay($t['day'], $t['hour'], $t['minute'])
                : null;
            CcsCourseTodo::query()->updateOrCreate(
                [
                    'user_id' => $userId,
                    'course_code' => $courseCode,
                    'title' => $t['title'],
                ],
                [
                    'due_at' => $due,
                    'is_completed' => $t['is_completed'],
                    'calendar_kind' => $t['calendar_kind'],
                ]
            );
        }

        $scores = [
            ['assessment_title' => 'Quiz 0 — Diagnostic', 'points_earned' => 18, 'points_max' => 20, 'graded_at' => $scoresBase->copy()->subDays(14)],
            ['assessment_title' => 'Lab 0 — Setup & Git', 'points_max' => 10, 'points_earned' => 10, 'graded_at' => $scoresBase->copy()->subDays(10)],
            ['assessment_title' => 'Attendance / participation W1–2', 'points_max' => 5, 'points_earned' => 4, 'graded_at' => $scoresBase->copy()->subDays(7)],
            ['assessment_title' => 'Homework 1 — CRC cards', 'points_max' => 15, 'points_earned' => 13.5, 'graded_at' => $scoresBase->copy()->subDays(3)],
            ['assessment_title' => 'Midterm practical (Post grade)', 'points_max' => 50, 'points_earned' => 42, 'graded_at' => $scoresBase->copy()->subDays(1)],
        ];

        foreach ($scores as $s) {
            $pct = $s['points_max'] > 0
                ? round(($s['points_earned'] / $s['points_max']) * 100, 2)
                : 0;

            CcsCourseScore::query()->updateOrCreate(
                [
                    'user_id' => $userId,
                    'course_code' => $courseCode,
                    'assessment_title' => $s['assessment_title'],
                ],
                [
                    'points_earned' => $s['points_earned'],
                    'points_max' => $s['points_max'],
                    'percentage' => $pct,
                    'graded_at' => $s['graded_at'],
                ]
            );
        }
    }
}
