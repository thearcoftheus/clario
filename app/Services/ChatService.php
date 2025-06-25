<?php

namespace App\Services;

use App\Enums\SimplificationLevel;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;
use Prism\Prism\ValueObjects\Messages\AssistantMessage;
use Prism\Prism\ValueObjects\Messages\UserMessage;

class ChatService {

    protected const SYSTEM_PROMPT = <<<PROMPT
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
    protected function chat(string $context, array $messages, SimplificationLevel $level): PendingRequest {
        return Prism::text()
            ->using(Provider::Gemini, 'gemini-2.5-flash')
            ->withMaxTokens(8000)
            ->withProviderOptions(['thinkingBudget' => 0])
            ->withSystemPrompt($level->getPrompt(self::SYSTEM_PROMPT . "\n\n" . $context))
            ->withMessages($messages);
    }

    /**
     * @param string $context
     * @param Array<AssistantMessage|UserMessage> $messages
     * @return \Generator
     */
    public function respondAsStream(string $context, array $messages, SimplificationLevel $level): \Generator {
        return $this->chat($context, $messages, $level)->asStream();
    }

    /**
     * @param string $context
     * @param Array<AssistantMessage|UserMessage> $messages
     * @return string
     */
    public function respondAsText(string $context, array $messages, SimplificationLevel $level): string {
        return $this->chat($context, $messages, $level)->asText()->text;
    }

}
