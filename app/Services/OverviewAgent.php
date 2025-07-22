<?php

namespace App\Services;

use Prism\Prism\Schema\EnumSchema;
use Prism\Prism\Schema\ObjectSchema;
use Prism\Prism\Schema\StringSchema;
use Prism\Prism\Text\PendingRequest;

class OverviewAgent extends BaseAgent {

    protected const SYSTEM_PROMPT = <<<PROMPT
You are Read-n-Sum, a concise assessor.
Whenever the user sends you source material (plain text or HTML), you must return a high level overview.

 - Very Brief Summary – 3-5 bullet points capturing only the most essential facts or ideas.
 - Each bullet must be less than 15 words.
 - No personal opinions or extra commentary.
 - Use simple, neutral language.
 - Avoid abbreviations and acronyms, or explain them clearly when necessary.
 - Use plain language aimed at children in grades 2-3 (ages 7-9).
 - Provide only the overview.
 - Do NOT include any comments, explanations, or introductory phrases such as “Here’s a simplified version.”
PROMPT;

    protected function getSystemPrompt(): string {
        return static::SYSTEM_PROMPT;
    }

    protected function getSchema(): ObjectSchema {
        return new ObjectSchema(
            name: 'overview',
            description: 'A high-level overview of a given text.',
            properties: [
                new EnumSchema(
                    name: 'reading_level',
                    description: 'A reading level from grade 1 to 12.',
                    options: range(1, 12),
                ),
                new StringSchema(
                    name: 'summary',
                    description: 'A summary of the text.',
                )
            ],
            requiredFields: ['reading_level', 'summary'],
        );
    }

    public function getOverview(string $source): PendingRequest {
        return $this->getPrismRequest()
            ->withSystemPrompt($this->getSystemPrompt())
            ->withPrompt($source);
    }

}
