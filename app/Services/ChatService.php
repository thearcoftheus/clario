<?php

namespace App\Services;

use App\DTO\Settings;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

class ChatService {

    protected const SYSTEM_PROMPT = <<<PROMPT
[BASE_PROMPT]

--

Your task is to answer questions about the provided content.

When answering questions about the provided content:
- Use basic vocabulary and short sentences
- Break down complex ideas into simple concepts
- Avoid technical terms, or explain them clearly when necessary
- Be friendly and encouraging
- Keep responses clear and direct

--

Here is the provided content:
[CONTENT]
PROMPT;

    public function getSystemPrompt(string $content, Settings $settings): string {
        $systemPrompt = str_replace('[BASE_PROMPT]', $settings->getSystemPrompt(), self::SYSTEM_PROMPT);
        $systemPrompt = str_replace('[CONTENT]', $content, $systemPrompt);
        return $systemPrompt;
    }


    /**
     * @param string $content
     * @param Array<AssistantMessage|UserMessage> $messages
     * @return PendingRequest
     */
    public function chat(string $content, array $messages, Settings $settings): PendingRequest {
        return Prism::text()
            ->using(Provider::Gemini, 'gemini-2.5-flash')
            ->withMaxTokens(8000)
            ->withProviderOptions(['thinkingBudget' => 0])
            ->withSystemPrompt($this->getSystemPrompt($content, $settings))
            ->withMessages($messages);
    }

}
