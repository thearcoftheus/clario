<?php

namespace App\Services;

use App\DTO\Settings;
use Prism\Prism\Text\PendingRequest;

class HeadlineAgent extends BaseAgent {

    protected const SYSTEM_PROMPT = <<<'PROMPT'
You are given the HTML content of a web page. Return a JSON object with exactly two fields:

1. "title": The actual article or page headline, cleaned up. Remove any site name suffix (e.g. " - BBC News", " | The New York Times"). If the page is not an article, use the most descriptive title you can find. Do NOT simplify or rephrase the title — preserve the original wording.

2. "summary": A single sentence summarizing what the article or page is about. Write it for an adult reader whose comfortable reading level is around [GRADE]. The audience is adults — including adults with intellectual or developmental disabilities — so use simple words and short sentence structure, but address the reader as an adult and do NOT use childlike phrasing such as "grown-ups," "boys and girls," or "kiddos." Keep it under 25 words.

Return ONLY valid JSON. No markdown, no code fences, no explanation.
PROMPT;

    public function getHeadline(string $html, Settings $settings): PendingRequest {
        $prompt = str_replace('[GRADE]', $settings->simplificationLevel->grade(), self::SYSTEM_PROMPT);

        return $this->getPrismRequest()
            ->withMaxTokens(200)
            ->withSystemPrompt($prompt)
            ->withPrompt($html);
    }
}
