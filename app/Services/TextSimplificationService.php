<?php

namespace App\Services;

use App\Enums\SimplificationLevel;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;

class TextSimplificationService {

    protected const SYSTEM_PROMPT = <<<PROMPT
Please rewrite the following text in simple language.
Use basic words and short sentences while keeping the original meaning.
Avoid abbreviations and acronyms, or explain them clearly when necessary.
Format the output using markdown for better readability.
Provide only the simplified text without any additional comments.
DO NOT include text at the start saying anything like 'Here's a simplified version:'.
PROMPT;

    protected function simplifyText(string $text, SimplificationLevel $level): PendingRequest {
        return Prism::text()
            ->using(Provider::Gemini, 'gemini-2.5-flash')
            ->withMaxTokens(8000)
            ->withProviderOptions(['thinkingBudget' => 0])
            ->withSystemPrompt($level->getPrompt(self::SYSTEM_PROMPT))
            ->withPrompt($text);
    }

    public function simplifyAsStream(string $text, SimplificationLevel $level): \Generator {
        return $this->simplifyText($text, $level)->asStream();
    }

    public function simplifyAsText(string $text, SimplificationLevel $level): string {
        return $this->simplifyText($text, $level)->asText()->text;
    }
}
