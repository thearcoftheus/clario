<?php

namespace App\Http\Controllers;

use App\DTO\Settings;
use App\Http\Requests\ChatRequest;
use App\Http\Requests\TranslateRequest;
use App\Services\ChatService;
use App\Services\TextSimplificationService;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

class AiController extends Controller {

    protected function streamResponse(\Generator $generator){
        return response()->stream(function() use ($generator) {
            foreach($generator as $chunk){
//                if($chunk->finishReason) break;
                yield $chunk->text;
            }
        }, 200, [
            'Cache-Control' => 'no-cache',
            'X-Accel-Buffering' => 'no',
            'Connection' => 'keep-alive',
        ]);
    }

    public function translate(TranslateRequest $request, TextSimplificationService $textSimplifier){
        return $this->streamResponse(
            $textSimplifier->simplify(
                $request->validated('content'),
                new Settings($request->validated('settings'))
            )->asStream()
        );
    }

    public function chat(ChatRequest $request, ChatService $chatService){

        $messages = $request->validated('messages', []);

        $prismMessages = array_map(function($message) {
            return $message['sender'] === 'user'
                ? new UserMessage($message['text'])
                : new AssistantMessage($message['text']);
        }, $messages);

        return $this->streamResponse(
            $chatService->chat(
                $request->validated('content'),
                $prismMessages,
                new Settings($request->validated('settings')),
            )->asStream()
        );
    }

}
