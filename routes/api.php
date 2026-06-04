<?php

use App\Http\Controllers\AiController;
use App\Http\Controllers\AvatarController;
use App\Http\Middleware\TrackApiMetrics;
use App\Http\Middleware\ValidateApiKey;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function(Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

// All Clario API routes require API key authentication
Route::middleware([ValidateApiKey::class, TrackApiMetrics::class])->group(function () {
    Route::post('/readability', [AiController::class, 'readability'])->name('readability');
    Route::post('/overview', [AiController::class, 'overview'])->name('overview');
    Route::post('/headline', [AiController::class, 'headline'])->name('headline');
    Route::post('/translate', [AiController::class, 'translate'])->name('translate');
    Route::post('/chat', [AiController::class, 'chat'])->name('chat');
    Route::post('/narrate', [AiController::class, 'narrate'])->name('narrate');
    Route::post('/narrate-sync', [AiController::class, 'narrateSync'])->name('narrate-sync');

    // Avatar video generation (Simli + Cartesia)
    Route::post('/avatar/script', [AvatarController::class, 'prepareScript'])->name('avatar.script');
    Route::post('/avatar/simli/generate', [AvatarController::class, 'simliGenerate'])->name('avatar.simli.generate');
    Route::post('/avatar/cartesia/tts', [AvatarController::class, 'cartesiaTTS'])->name('avatar.cartesia.tts');
});
