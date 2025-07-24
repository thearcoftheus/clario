<?php

namespace App\Services;

use App\DTO\Settings;
use Illuminate\Support\Facades\Log;
use Prism\Prism\Text\PendingRequest;

class SummaryAgent extends BaseAgent {

    protected const SYSTEM_PROMPT = <<<PROMPT
[BASE_PROMPT]
Please rewrite the following text in simple language.
Format the output using markdown for better readability.
Use headings to organise the content.
[LENGTH_PROMPT]
Provide only the simplified text.
Do NOT include any comments, explanations, or introductory phrases such as “Here’s a simplified version.”
PROMPT;

    protected function getSystemPrompt(string $html, Settings $settings): string {

        $text = html_entity_decode(strip_tags($html));

        $originalWordCount = count_words($text);
        $wordCount = ceil($originalWordCount * $settings->summaryLength->length());

        Log::debug("Original length: $originalWordCount");
        Log::debug("Target length $wordCount");

        // NOTE: The prompt says 'exactly', but it's likely the returned summary won't be exactly X words long
        // This wording has been chosen to get pretty close to that word length
        // Other wording like 'around' results in too much variance
        $lengthPrompt = "The simplified text should be exactly $wordCount words long.";

        $prompt = self::SYSTEM_PROMPT;
        $prompt = str_replace('[BASE_PROMPT]', $settings->getSystemPrompt(), $prompt);
        $prompt = str_replace('[LENGTH_PROMPT]', $lengthPrompt, $prompt);
        return $prompt;
    }

    public function simplify(string $html, Settings $settings): PendingRequest {
        return $this->getPrismRequest()
            ->withSystemPrompt($this->getSystemPrompt($html, $settings))
            ->withPrompt($html);
    }
}
