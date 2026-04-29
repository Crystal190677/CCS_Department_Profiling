<?php

use App\Http\Controllers\Api\ActivitiesController;
use App\Http\Controllers\Api\AdminAuditLogController;
use App\Http\Controllers\Api\AdminStatsController;
use App\Http\Controllers\Api\AnnouncementsController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\CcsCourseWorkspaceController;
use App\Http\Controllers\Api\ConductEntriesController;
use App\Http\Controllers\Api\EnrollmentsController;
use App\Http\Controllers\Api\InterestDeclarationsController;
use App\Http\Controllers\Api\MerchandiseController;
use App\Http\Controllers\Api\MerchandiseOrdersController;
use App\Http\Controllers\Api\NonAcademicEntriesController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\QualificationRankOverridesController;
use App\Http\Controllers\Api\OfficerPositionsController;
use App\Http\Controllers\Api\ReportsController;
use App\Http\Controllers\Api\SkillEntriesController;
use App\Http\Controllers\Api\StudentProfileController;
use App\Http\Controllers\Api\StudentCalendarController;
use App\Http\Controllers\Api\StudentScheduleController;
use App\Http\Controllers\Api\StudentsController;
use App\Http\Controllers\Api\UsersController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('signup', [AuthController::class, 'signUp']);
    Route::post('claim/lookup', [AuthController::class, 'claimLookup']);
    Route::post('claim', [AuthController::class, 'claimAccount']);
});

Route::get('merchandise/{id}/image', [MerchandiseController::class, 'image']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('announcements', [AnnouncementsController::class, 'index']);

    Route::get('profile', [ProfileController::class, 'show']);
    Route::put('profile/update', [ProfileController::class, 'update']);
    Route::post('profile/upload-avatar', [ProfileController::class, 'uploadAvatar']);
    Route::put('profile/change-password', [ProfileController::class, 'changePassword']);

    Route::get('notifications', [NotificationsController::class, 'index']);
    Route::post('notifications/{id}/read', [NotificationsController::class, 'markRead']);
    Route::get('student-profile', [StudentProfileController::class, 'show']);
    Route::post('student-profile', [StudentProfileController::class, 'store']);

    Route::get('ccs-courses/{courseCode}/workspace', [CcsCourseWorkspaceController::class, 'show']);
    Route::get('student-schedule', [StudentScheduleController::class, 'index']);
    Route::get('student-calendar', [StudentCalendarController::class, 'index']);
    Route::post('student-calendar/events', [StudentCalendarController::class, 'storeEvent']);
    Route::put('student-calendar/events/{id}', [StudentCalendarController::class, 'updateEvent']);
    Route::delete('student-calendar/events/{id}', [StudentCalendarController::class, 'destroyEvent']);

    Route::get('non-academic-entries', [NonAcademicEntriesController::class, 'index']);
    Route::post('non-academic-entries', [NonAcademicEntriesController::class, 'store']);
    Route::put('non-academic-entries/{id}', [NonAcademicEntriesController::class, 'update']);
    Route::delete('non-academic-entries/{id}', [NonAcademicEntriesController::class, 'destroy']);
    Route::patch('non-academic-entries/{id}/approve', [NonAcademicEntriesController::class, 'approve']);
    Route::patch('non-academic-entries/{id}/reject', [NonAcademicEntriesController::class, 'reject']);
    Route::patch('non-academic-entries/{id}/flag', [NonAcademicEntriesController::class, 'flag']);
    Route::patch('non-academic-entries/{id}/endorse', [NonAcademicEntriesController::class, 'endorse']);

    Route::get('skill-entries', [SkillEntriesController::class, 'index']);
    Route::post('skill-entries', [SkillEntriesController::class, 'store']);
    Route::put('skill-entries/{id}', [SkillEntriesController::class, 'update']);
    Route::delete('skill-entries/{id}', [SkillEntriesController::class, 'destroy']);
    Route::patch('skill-entries/{id}/endorse', [SkillEntriesController::class, 'endorse']);
    Route::patch('skill-entries/{id}/dispute', [SkillEntriesController::class, 'dispute']);

    Route::get('conduct-entries', [ConductEntriesController::class, 'index']);
    Route::post('conduct-entries', [ConductEntriesController::class, 'store']);
    Route::put('conduct-entries/{id}', [ConductEntriesController::class, 'update']);
    Route::delete('conduct-entries/{id}', [ConductEntriesController::class, 'destroy']);
    Route::patch('conduct-entries/{id}/dispute', [ConductEntriesController::class, 'dispute']);
    Route::patch('conduct-entries/{id}/resolve-dispute', [ConductEntriesController::class, 'resolveDispute']);

    Route::get('enrollments/mine', [EnrollmentsController::class, 'mine']);
    Route::post('enrollments/{id}/confirm', [EnrollmentsController::class, 'confirm']);

    Route::get('interest-declarations', [InterestDeclarationsController::class, 'index']);
    Route::post('interest-declarations', [InterestDeclarationsController::class, 'store']);
    Route::put('interest-declarations/{id}', [InterestDeclarationsController::class, 'update']);
    Route::delete('interest-declarations/{id}', [InterestDeclarationsController::class, 'destroy']);

    Route::get('activities/available', [ActivitiesController::class, 'available']);

    Route::get('merchandise', [MerchandiseController::class, 'index']);
    Route::get('merchandise-orders', [MerchandiseOrdersController::class, 'index']);
    Route::post('merchandise-orders', [MerchandiseOrdersController::class, 'store']);

    Route::get('activities/list-for-admin', [ActivitiesController::class, 'listForAdmin']);
    Route::post('activities', [ActivitiesController::class, 'store']);
    Route::put('activities/{id}', [ActivitiesController::class, 'update']);
    Route::delete('activities/{id}', [ActivitiesController::class, 'destroy']);

    Route::middleware('admin.faculty')->group(function () {
        Route::get('admin/stats', [AdminStatsController::class, 'stats']);

        Route::get('activities', [ActivitiesController::class, 'index']);
        Route::get('students/class-list', [StudentsController::class, 'classListRoster']);
        Route::get('students', [StudentsController::class, 'index']);
        Route::post('students', [StudentsController::class, 'store']);
        Route::patch('students/{id}/role', [StudentsController::class, 'updateRole']);
        Route::delete('students/{id}', [StudentsController::class, 'destroy']);
        Route::get('students/{id}/full-profile', [StudentsController::class, 'showFullProfile']);
        Route::patch('students/{id}/account', [StudentsController::class, 'updateAccount']);
        Route::post('students/enroll', [StudentsController::class, 'enroll']);
        Route::get('activities/{activityId}/rank-overrides', [QualificationRankOverridesController::class, 'index']);
        Route::post('activities/{activityId}/rank-overrides', [QualificationRankOverridesController::class, 'store']);
        Route::delete('activities/{activityId}/rank-overrides/{userId}', [QualificationRankOverridesController::class, 'destroy']);
        Route::get('officer-positions', [OfficerPositionsController::class, 'index']);
        Route::post('officer-positions', [OfficerPositionsController::class, 'store']);
        Route::delete('officer-positions/{id}', [OfficerPositionsController::class, 'destroy']);
    });

    Route::put('students/{id}/profile', [StudentProfileController::class, 'updateForStudent'])->middleware('admin.faculty');
    Route::patch('users/{id}', [UsersController::class, 'update']);

    Route::middleware('admin.only')->group(function () {
        Route::get('admin/audit-log', [AdminAuditLogController::class, 'index']);
        
        Route::get('reports/masterlist', [ReportsController::class, 'masterlist']);
        Route::get('reports/talent-directory', [ReportsController::class, 'talentDirectory']);
        Route::get('reports/violations', [ReportsController::class, 'violations']);
        Route::get('reports/audit-logs', [ReportsController::class, 'auditLogs']);
    });

    Route::middleware('officer.or.admin.faculty')->group(function () {
        Route::post('announcements', [AnnouncementsController::class, 'store']);
        Route::post('announcements/{id}', [AnnouncementsController::class, 'update']);
        Route::delete('announcements/{id}', [AnnouncementsController::class, 'destroy']);

        Route::get('students/list-for-officers', [StudentsController::class, 'listForOfficers']);
        Route::patch('students/{id}/membership-card-availed', [StudentsController::class, 'patchMembershipCardAvailed']);
        Route::post('merchandise', [MerchandiseController::class, 'store']);
        Route::put('merchandise/{id}', [MerchandiseController::class, 'update']);
        Route::delete('merchandise/{id}', [MerchandiseController::class, 'destroy']);
        Route::patch('merchandise-orders/{id}/payment-status', [MerchandiseOrdersController::class, 'updatePaymentStatus']);
    });
});
