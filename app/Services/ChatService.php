<?php

namespace App\Services;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

class ChatService {

    protected const SYSTEM_PROMPT = <<<PROMPT
You are a helpful assistant that explains complex topics in simple terms for children in grades 2-3 (ages 7-9).
When answering questions about the provided content:
- Use basic vocabulary and short sentences
- Break down complex ideas into simple concepts
- Avoid technical terms, or explain them clearly when necessary
- Be friendly and encouraging
- Keep responses clear and direct

--

Here is the provided content:
PROMPT;


    /**
     * @param string $context
     * @param Array<AssistantMessage|UserMessage> $messages
     * @return PendingRequest
     */
    protected function chat(string $context, array $messages): PendingRequest {
        return Prism::text()
            ->using(Provider::Gemini, 'gemini-2.5-flash')
            ->withMaxTokens(8000)
            ->withSystemPrompt(self::SYSTEM_PROMPT . "\n\n" . $context)
            ->withMessages($messages);
    }

    /**
     * @param string $context
     * @param Array<AssistantMessage|UserMessage> $messages
     * @return \Generator
     */
    public function respondAsStream(string $context, array $messages): \Generator {
        return $this->chat($context, $messages)->asStream();
    }

    /**
     * @param string $context
     * @param Array<AssistantMessage|UserMessage> $messages
     * @return string
     */
    public function respondAsText(string $context, array $messages): string {
        return $this->chat($context, $messages)->asText()->text;
    }

}
