<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\AvatarController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function(Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/readability', [AiController::class, 'readability'])->name('readability');
Route::post('/overview', [AiController::class, 'overview'])->name('overview');
Route::post('/translate', [AiController::class, 'translate'])->name('translate');
Route::post('/chat', [AiController::class, 'chat'])->name('chat');
Route::post('/narrate', [AiController::class, 'narrate'])->name('narrate');

// Avatar video generation (D-ID)
Route::post('/avatar/generate', [AvatarController::class, 'generate'])->name('avatar.generate');
Route::get('/avatar/status/{jobId}', [AvatarController::class, 'status'])->name('avatar.status');
