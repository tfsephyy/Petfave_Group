<?php

use App\Http\Controllers\AnimalController;
use App\Http\Controllers\ArchiveBatchController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\BookingController;
use App\Http\Controllers\ClinicalController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\GuardianController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\MediaController;
use App\Http\Controllers\SettingsController;
use App\Http\Middleware\ActiveAccount;
use Illuminate\Support\Facades\Route;

Route::prefix('api')->group(function () {
    Route::get('/session', [AuthController::class, 'session']);
    Route::middleware('guest')->group(function () {
        Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');
        Route::post('/register', [AuthController::class, 'register'])->middleware('throttle:public-auth');
        Route::post('/forgot-password', [AuthController::class, 'forgotPassword'])->middleware('throttle:public-auth');
        Route::post('/reset-password', [AuthController::class, 'resetPassword'])->middleware('throttle:public-auth');
    });
    Route::middleware(['auth', ActiveAccount::class, 'throttle:clinic'])->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/dashboard', [DashboardController::class, 'index']);
        Route::get('/options', [AnimalController::class, 'options']);
        Route::get('/animals', [AnimalController::class, 'index']);
        Route::post('/animals', [AnimalController::class, 'store']);
        Route::get('/animals/{animal}', [AnimalController::class, 'show']);
        Route::put('/animals/{animal}', [AnimalController::class, 'update']);
        Route::patch('/animals/{animal}/archive', [AnimalController::class, 'archive']);
        Route::get('/animals/{animal}/photo', [MediaController::class, 'photo']);
        Route::post('/animals/{animal}/photo', [MediaController::class, 'updatePhoto']);
        Route::post('/animals/{animal}/media', [MediaController::class, 'store']);
        Route::get('/animals/{animal}/media/{media}/file', [MediaController::class, 'file']);
        Route::delete('/animals/{animal}/media/{media}', [MediaController::class, 'destroy']);
        Route::post('/animals/{animal}/entries', [ClinicalController::class, 'store']);
        Route::put('/animals/{animal}/entries/{entry}', [ClinicalController::class, 'update']);
        Route::patch('/animals/{animal}/entries/{entry}/void', [ClinicalController::class, 'void']);
        Route::post('/animals/{animal}/encounters', [ClinicalController::class, 'encounter']);
        Route::get('/bookings', [BookingController::class, 'index']);
        Route::get('/availability', [BookingController::class, 'availability']);
        Route::post('/bookings', [BookingController::class, 'store']);
        Route::put('/bookings/{booking}', [BookingController::class, 'update']);
        Route::patch('/bookings/{booking}/status', [BookingController::class, 'status']);
        Route::put('/settings/profile', [SettingsController::class, 'profile']);
        Route::put('/settings/password', [SettingsController::class, 'password']);
        Route::delete('/settings/account', [SettingsController::class, 'closeAccount']);
        Route::middleware('can:staff')->group(function () {
            Route::post('/archive-batch', ArchiveBatchController::class);
            Route::get('/guardians', [GuardianController::class, 'index']);
            Route::post('/guardians', [GuardianController::class, 'store']);
            Route::get('/guardians/{guardian}', [GuardianController::class, 'show']);
            Route::put('/guardians/{guardian}', [GuardianController::class, 'update']);
            Route::patch('/guardians/{guardian}/archive', [GuardianController::class, 'archive']);
            Route::get('/inventory', [InventoryController::class, 'index']);
            Route::post('/inventory', [InventoryController::class, 'store']);
            Route::put('/inventory/{product}', [InventoryController::class, 'update']);
            Route::patch('/inventory/{product}/archive', [InventoryController::class, 'archive']);
            Route::post('/inventory/{product}/movements', [InventoryController::class, 'movement']);
            Route::get('/stock-movements', [InventoryController::class, 'history']);
        });
        Route::get('/audit', [DashboardController::class, 'audit'])->middleware('can:admin');
    });
});

Route::get('/{path?}', function () {
    $path = public_path('app-assets/index.html');
    if (! is_file($path)) {
        return response('PetFave frontend is not built yet. Run npm run build in the Front directory, or start its Vite development server.', 503)->header('Content-Type', 'text/plain');
    }

    return response()->file($path, ['Cache-Control' => 'no-cache']);
})->where('path', '(?!api(?:/|$)).*')->name('login');
