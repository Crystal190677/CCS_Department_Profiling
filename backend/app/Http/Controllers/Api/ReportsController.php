<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\AuditLog;
use App\Models\StudentConductEntry;
use App\Models\StudentSkillEntry;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportsController extends Controller
{
    public function masterlist(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $query = User::query()
            ->where('role', 'STUDENT')
            ->with('studentProfile');

        if ($request->filled('program') && $request->program !== 'All Programs') {
            $query->whereHas('studentProfile', function ($q) use ($request) {
                $q->where('course', $request->program);
            });
        }

        if ($request->filled('year_level') && $request->year_level !== 'All Years') {
            $query->whereHas('studentProfile', function ($q) use ($request) {
                $q->where('year_level', $request->year_level);
            });
        }

        if ($request->filled('status') && $request->status !== 'All Status') {
            $query->whereHas('studentProfile', function ($q) use ($request) {
                $q->where('academic_standing', $request->status);
            });
        }

        if ($request->filled('school_year') && $request->school_year !== 'All School Years') {
            // Note: school year is not explicitly tracked in studentProfile in current DB schema. 
            // Skipping or adapting logic if necessary.
        }

        if ($request->filled('semester') && $request->semester !== 'All Semesters') {
            $query->whereHas('studentProfile', function ($q) use ($request) {
                $q->where('academic_semester', $request->semester);
            });
        }

        $paginator = $query->paginate($limit);

        $data = collect($paginator->items())->map(function ($user) {
            return [
                'student_id' => $user->student_number ?? '—',
                'full_name' => $user->name,
                'program' => $user->studentProfile?->course ?? '—',
                'year_level' => $user->studentProfile?->year_level ?? '—',
                'section' => $user->studentProfile?->section ?? '—',
                'email' => $user->email,
                'status' => $user->studentProfile?->academic_standing ?? '—',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $paginator->total(),
            'meta' => [
                'current_page' => $paginator->currentPage(),
                'last_page' => $paginator->lastPage(),
                'per_page' => $paginator->perPage(),
            ],
        ]);
    }

    public function talentDirectory(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $query = StudentSkillEntry::query()
            ->with(['user.studentProfile']);

        if ($request->filled('category') && $request->category !== 'All Categories') {
            // "Skill category" logic. Assuming we filter by `skill` name or something?
            // The frontend dropdown might send specific values, we'll match broadly.
            $query->where('skill', 'LIKE', '%' . $request->category . '%');
        }

        if ($request->filled('program') && $request->program !== 'All Programs') {
            $query->whereHas('user.studentProfile', function ($q) use ($request) {
                $q->where('course', $request->program);
            });
        }

        $paginator = $query->paginate($limit);

        $data = collect($paginator->items())->map(function ($entry) {
            return [
                'student_id' => $entry->user?->student_number ?? '—',
                'full_name' => $entry->user?->name ?? '—',
                'program' => $entry->user?->studentProfile?->course ?? '—',
                'skill' => $entry->skill,
                'proficiency' => $entry->proficiency_level,
                'portfolio' => $entry->portfolio_url ?? '—',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $paginator->total(),
        ]);
    }

    public function violations(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $query = StudentConductEntry::query()
            ->with(['user.studentProfile'])
            ->where('type', StudentConductEntry::TYPE_VIOLATION);

        if ($request->filled('month') && $request->month !== 'All Months') {
            $month = date('m', strtotime($request->month));
            $query->whereMonth('recorded_at', $month);
        }

        if ($request->filled('semester') && $request->semester !== 'All Semesters') {
            // Custom logic, skipped or handled if `academic_semester` applies to the entry.
        }

        if ($request->filled('violation_type') && $request->violation_type !== 'All Types') {
            $query->where('severity', $request->violation_type); // Assuming type is severity like Minor/Major
        }

        if ($request->filled('status') && $request->status !== 'All Status') {
            $statusMapping = [
                'Pending' => StudentConductEntry::DISPUTE_STATUS_PENDING,
                'Resolved' => StudentConductEntry::DISPUTE_STATUS_UPHELD, // simplify
            ];
            $mapped = $statusMapping[$request->status] ?? null;
            if ($mapped) {
                $query->where('dispute_status', $mapped);
            }
        }

        $paginator = $query->paginate($limit);

        $data = collect($paginator->items())->map(function ($entry) {
            return [
                'student_id' => $entry->user?->student_number ?? '—',
                'full_name' => $entry->user?->name ?? '—',
                'violation' => $entry->title,
                'severity' => $entry->severity,
                'date' => $entry->recorded_at?->format('Y-m-d') ?? '—',
                'status' => $entry->dispute_status === StudentConductEntry::DISPUTE_STATUS_PENDING ? 'Pending' : 'Resolved',
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $paginator->total(),
        ]);
    }

    public function auditLogs(Request $request): JsonResponse
    {
        $limit = $request->get('limit', 10);
        $query = AuditLog::query()
            ->with('performer:id,name')
            ->orderByDesc('created_at');

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->filled('action') && $request->action !== 'All Actions') {
            $query->where('action', strtolower($request->action));
        }

        if ($request->filled('module') && $request->module !== 'All Modules') {
            $query->where('target', 'LIKE', '%' . $request->module . '%');
        }

        $paginator = $query->paginate($limit);

        $data = collect($paginator->items())->map(function ($log) {
            return [
                'id' => $log->id,
                'date' => $log->created_at?->format('Y-m-d H:i:s'),
                'action' => ucfirst($log->action),
                'module' => $log->target,
                'performed_by' => $log->performer?->name ?? 'System',
                'details' => "Action performed on {$log->target}",
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $data,
            'total' => $paginator->total(),
        ]);
    }
}
