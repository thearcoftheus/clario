<?php

use App\Services\ChatService;
use App\Services\TextSimplificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

Route::get('/user', function(Request $request) {
    return $request->user();
})->middleware('auth:sanctum');

Route::post('/translate', function(Request $request, TextSimplificationService $textSimplifier) {

    $content = $request->input('content', '');

    if(empty($content)){
        return response()->json(['error' => 'No text provided'], 400);
    }

    $response = $textSimplifier->simplifyAsStream($content);

    return response()->stream(function() use ($response) {
        foreach($response as $chunk){
//            if($chunk->finishReason) break;
            yield $chunk->text;
        }
    }, 200, [
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
        'Connection' => 'keep-alive',
    ]);
})->name('translate');

Route::post('/chat', function(Request $request, ChatService $chatService) {

    $content = $request->input('content', '');
    $messages = $request->input('messages', []);

    if(empty($content)){
        return response()->json(['error' => 'No content provided'], 400);
    }

    if(!is_array($messages)){
        return response()->json(['error' => 'Messages must be an array'], 400);
    }

    foreach($messages as $message){
        if(!isset($message['sender']) || !in_array($message['sender'], ['user', 'assistant'])){
            return response()->json(['error' => 'Invalid message sender'], 400);
        }

        if(!isset($message['text']) || empty($message['text'])){
            return response()->json(['error' => 'Message text is required'], 400);
        }
    }

    $prismMessages = array_map(function($message) {
        return $message['sender'] === 'user'
            ? new UserMessage($message['text'])
            : new AssistantMessage($message['text']);
    }, $messages);

    $response = $chatService->respondAsStream($content, $prismMessages);

    return response()->stream(function() use ($response) {
        foreach($response as $chunk){
//            if($chunk->finishReason) break;
            yield $chunk->text;
        }
    }, 200, [
        'Cache-Control' => 'no-cache',
        'X-Accel-Buffering' => 'no',
        'Connection' => 'keep-alive',
    ]);
})->name('chat');
