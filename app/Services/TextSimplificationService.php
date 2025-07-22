<?php

namespace App\Services;

use App\DTO\Settings;
use Prism\Prism\Text\PendingRequest;

class TextSimplificationService extends BaseAgent {

    protected const SYSTEM_PROMPT = <<<PROMPT
[BASE_PROMPT]
Please rewrite the following text in simple language.
Format the output using markdown for better readability.
Use headings to organise the content.
Provide only the simplified text.
Do NOT include any comments, explanations, or introductory phrases such as “Here’s a simplified version.”
PROMPT;

    protected function getSystemPrompt(Settings $settings): string {
        return str_replace('[BASE_PROMPT]', $settings->getSystemPrompt(), self::SYSTEM_PROMPT);
    }

    public function simplify(string $text, Settings $settings): PendingRequest {
        return $this->getPrismRequest()
            ->withSystemPrompt($this->getSystemPrompt($settings))
            ->withPrompt($text);
    }
}
