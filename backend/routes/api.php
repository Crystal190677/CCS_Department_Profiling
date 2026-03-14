<?php

use App\Http\Controllers\Api\ActivitiesController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\StudentProfileController;
use App\Http\Controllers\Api\StudentsController;
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

    Route::middleware('admin.faculty')->group(function () {
        Route::get('activities', [ActivitiesController::class, 'index']);
        Route::get('students', [StudentsController::class, 'index']);
        Route::post('students/enroll', [StudentsController::class, 'enroll']);
    });
});
