<?php

use App\Http\Controllers\Api\ActivitiesController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\MerchandiseController;
use App\Http\Controllers\Api\MerchandiseOrdersController;
use App\Http\Controllers\Api\NotificationsController;
use App\Http\Controllers\Api\OfficerPositionsController;
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

    Route::get('merchandise', [MerchandiseController::class, 'index']);
    Route::get('merchandise-orders', [MerchandiseOrdersController::class, 'index']);
    Route::post('merchandise-orders', [MerchandiseOrdersController::class, 'store']);

    Route::middleware('admin.faculty')->group(function () {
        Route::get('activities', [ActivitiesController::class, 'index']);
        Route::get('students', [StudentsController::class, 'index']);
        Route::post('students/enroll', [StudentsController::class, 'enroll']);
        Route::get('officer-positions', [OfficerPositionsController::class, 'index']);
        Route::post('officer-positions', [OfficerPositionsController::class, 'store']);
        Route::delete('officer-positions/{id}', [OfficerPositionsController::class, 'destroy']);
    });

    Route::middleware('officer.or.admin.faculty')->group(function () {
        Route::post('merchandise', [MerchandiseController::class, 'store']);
        Route::put('merchandise/{id}', [MerchandiseController::class, 'update']);
        Route::delete('merchandise/{id}', [MerchandiseController::class, 'destroy']);
        Route::patch('merchandise-orders/{id}/payment-status', [MerchandiseOrdersController::class, 'updatePaymentStatus']);
    });
});
