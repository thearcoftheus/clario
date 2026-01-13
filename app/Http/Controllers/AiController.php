<?php

namespace App\Http\Controllers;

use App\DTO\Settings;
use App\Http\Requests\ChatRequest;
use App\Http\Requests\NarrationRequest;
use App\Http\Requests\TranslateRequest;
use App\Services\ChatAgent;
use App\Services\NarrationService;
use App\Services\OverviewAgent;
use App\Services\Readability;
use App\Services\SummaryAgent;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

class AiController extends Controller {

    protected function streamResponse(\Generator $generator) {
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

    public function readability(TranslateRequest $request, Readability $readability) {
        $score = $readability->getReadability(
            $request->validated('content')
        );
        return response()->json($score);
    }

    public function overview(TranslateRequest $request, OverviewAgent $overviewAgent) {
        return $this->streamResponse(
            $overviewAgent->getOverview(
                $request->validated('content')
            )->asStream()
        );
    }

    public function translate(TranslateRequest $request, SummaryAgent $textSimplifier) {
        return $this->streamResponse(
            $textSimplifier->simplify(
                $request->validated('content'),
                new Settings($request->validated('settings'))
            )->asStream()
        );
    }

    public function chat(ChatRequest $request, ChatAgent $chatService) {

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

    public function narrate(NarrationRequest $request, NarrationService $narrationService) {
        $text = $request->validated('content');

        // Strip markdown formatting from text
        $plainText = $text;
        // Remove headings (## Heading)
        $plainText = preg_replace('/^#{1,6}\s*/m', '', $plainText);
        // Remove bold (**text** or __text__)
        $plainText = preg_replace('/\*\*(.+?)\*\*/s', '$1', $plainText);
        $plainText = preg_replace('/__(.+?)__/s', '$1', $plainText);
        // Remove italic (*text* or _text_)
        $plainText = preg_replace('/\*(.+?)\*/s', '$1', $plainText);
        $plainText = preg_replace('/_(.+?)_/s', '$1', $plainText);
        // Remove inline code (`code`)
        $plainText = preg_replace('/`(.+?)`/', '$1', $plainText);
        // Remove links [text](url) -> text
        $plainText = preg_replace('/\[(.+?)\]\(.+?\)/', '$1', $plainText);
        // Remove bullet points
        $plainText = preg_replace('/^[\*\-\+]\s+/m', '', $plainText);
        // Remove numbered lists (1. item)
        $plainText = preg_replace('/^\d+\.\s+/m', '', $plainText);
        // Strip any remaining HTML and decode entities
        $plainText = html_entity_decode(strip_tags($plainText));

        $options = [
            'voice' => $request->validated('voice'),
            'language' => $request->validated('language', 'en-US'),
            'speed' => $request->validated('speed', 1.0),
            'pitch' => $request->validated('pitch'),
            'gender' => $request->validated('gender'),
        ];

        // Remove null values
        $options = array_filter($options, fn($value) => $value !== null);

        try {
            $audioContent = $narrationService->generateAudio($plainText, $options);

            return response($audioContent, 200, [
                'Content-Type' => 'audio/mpeg',
                'Content-Length' => strlen($audioContent),
                'Cache-Control' => 'public, max-age=604800', // Cache for 7 days
            ]);

        } catch (\Exception $e) {
            $errorMessage = $e->getMessage();

            // Check if this is an API key or permission issue
            if (
                str_contains($errorMessage, 'PERMISSION_DENIED') ||
                str_contains($errorMessage, '403') ||
                str_contains($errorMessage, 'API key not valid') ||
                str_contains($errorMessage, 'API has not been used') ||
                str_contains($errorMessage, 'disabled')
            ) {
                return response()->json([
                    'error' => 'API Configuration Error',
                    'message' => 'There is an issue with your Google Cloud API key or the Text-to-Speech API is not enabled. Please check your API key configuration and ensure the Cloud Text-to-Speech API is enabled in your Google Cloud project.',
                ], 500);
            }

            // Generic error for other issues
            return response()->json([
                'error' => 'Failed to generate audio',
                'message' => $errorMessage,
            ], 500);
        }
    }

}
