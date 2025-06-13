<?php

namespace App\Services;

use Prism\Prism\Enums\Provider;
use Prism\Prism\Prism;
use Prism\Prism\Text\PendingRequest;

class TextSimplificationService {

    protected function simplifyText(string $text): PendingRequest {
        $prompt = "Rewrite the following text in simple language that a 2nd or 3rd grader (7-9 years old) would understand. Keep the meaning intact but use simple words and short sentences. Here's the text to simplify:\n\n$text";
        return Prism::text()
            ->using(Provider::Anthropic, 'claude-3-5-sonnet-20241022')
            ->withPrompt($prompt);
    }

    public function simplifyAsStream(string $text): \Generator {
        return $this->simplifyText($text)->asStream();
    }

    public function simplifyAsText(string $text): string {
        return $this->simplifyText($text)->asText()->text;
    }
}
