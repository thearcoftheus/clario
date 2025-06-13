<?php

use App\Services\TextSimplificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/user', function(Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/translate', function(Request $request, TextSimplificationService $textSimplifier) {

    $inputText = $request->input('content', '');

    if(empty($inputText)){
        return response()->json(['error' => 'No text provided'], 400);
    }

    $response = $textSimplifier->simplifyAsStream($inputText);

    return response()->stream(function() use ($response) {
        foreach($response as $chunk){
            if($chunk->finishReason) break;
            yield $chunk->text;
        }
    }, 200, [
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
        'Connection' => 'keep-alive',
    ]);
});
