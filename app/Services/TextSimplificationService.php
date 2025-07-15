<?php

namespace App\Services;

use App\DTO\Settings;
use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;

class TextSimplificationService {

    protected const SYSTEM_PROMPT = <<<PROMPT
[BASE_PROMPT]
Please rewrite the following text in simple language.
Format the output using markdown for better readability.
Provide only the simplified text.
Do NOT include any comments, explanations, or introductory phrases such as “Here’s a simplified version.”
PROMPT;

    public function getSystemPrompt(Settings $settings): string {
        return str_replace('[BASE_PROMPT]', $settings->getSystemPrompt(), self::SYSTEM_PROMPT);
    }

    public function simplify(string $text, Settings $settings): PendingRequest {
        return Prism::text()
            ->using(Provider::Gemini, 'gemini-2.5-flash')
            ->withMaxTokens(8000)
            ->withProviderOptions(['thinkingBudget' => 0])
            ->withSystemPrompt($this->getSystemPrompt($settings))
            ->withPrompt($text);
    }
}
