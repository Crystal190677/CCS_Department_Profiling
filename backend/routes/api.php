<?php

use App\Http\Controllers\Api\ActivitiesController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ConductEntriesController;
use App\Http\Controllers\Api\EnrollmentsController;
use App\Http\Controllers\Api\InterestDeclarationsController;
use App\Http\Controllers\Api\MerchandiseController;
use App\Http\Controllers\Api\MerchandiseOrdersController;
use App\Http\Controllers\Api\NonAcademicEntriesController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\QualificationRankOverridesController;
use App\Http\Controllers\Api\OfficerPositionsController;
use App\Http\Controllers\Api\SkillEntriesController;
use App\Http\Controllers\Api\StudentProfileController;
use App\Http\Controllers\Api\StudentsController;
use App\Http\Controllers\Api\UsersController;
use Illuminate\Support\Facades\Route;

Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::post('signup', [AuthController::class, 'signUp']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('notifications', [NotificationsController::class, 'index']);
    Route::post('notifications/{id}/read', [NotificationsController::class, 'markRead']);
    Route::get('student-profile', [StudentProfileController::class, 'show']);
    Route::post('student-profile', [StudentProfileController::class, 'store']);

    Route::get('non-academic-entries', [NonAcademicEntriesController::class, 'index']);
    Route::post('non-academic-entries', [NonAcademicEntriesController::class, 'store']);
    Route::put('non-academic-entries/{id}', [NonAcademicEntriesController::class, 'update']);
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
        Route::get('activities', [ActivitiesController::class, 'index']);
        Route::get('students', [StudentsController::class, 'index']);
        Route::get('students/{id}/full-profile', [StudentsController::class, 'showFullProfile']);
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

    Route::middleware('officer.or.admin.faculty')->group(function () {
        Route::get('students/list-for-officers', [StudentsController::class, 'listForOfficers']);
        Route::post('merchandise', [MerchandiseController::class, 'store']);
        Route::put('merchandise/{id}', [MerchandiseController::class, 'update']);
        Route::delete('merchandise/{id}', [MerchandiseController::class, 'destroy']);
        Route::patch('merchandise-orders/{id}/payment-status', [MerchandiseOrdersController::class, 'updatePaymentStatus']);
    });
});
