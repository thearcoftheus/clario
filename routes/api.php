<?php

use App\Http\Controllers\AiController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function(Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/readability', [AiController::class, 'readability'])->name('readability');
Route::post('/overview', [AiController::class, 'overview'])->name('overview');
Route::post('/translate', [AiController::class, 'translate'])->name('translate');
Route::post('/chat', [AiController::class, 'chat'])->name('chat');
