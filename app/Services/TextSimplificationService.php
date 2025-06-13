<?php

namespace App\Services;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;

class TextSimplificationService {

    protected const SYSTEM_PROMPT = <<<PROMPT
Please rewrite the following text in simple language suitable for children aged 7-9 years (2nd or 3rd grade level).
Use basic words and short sentences while keeping the original meaning.
Avoid abbreviations and acronyms, or explain them clearly when necessary.
Format the output using markdown for better readability.
Provide only the simplified text without any additional comments.
DO NOT include text at the start saying anything like 'Here's a simplified version suitable for children aged 7-9:'.
PROMPT;

    protected function simplifyText(string $text): PendingRequest {
        return Prism::text()
            ->using(Provider::Anthropic, 'claude-3-5-sonnet-20241022')
            ->withSystemPrompt(self::SYSTEM_PROMPT)
            ->withPrompt($text);
    }

    public function simplifyAsStream(string $text): \Generator {
        return $this->simplifyText($text)->asStream();
    }

    public function simplifyAsText(string $text): string {
        return $this->simplifyText($text)->asText()->text;
    }
}
