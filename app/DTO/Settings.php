<?php

namespace App\DTO;

use App\Enums\InternetSpeed;
use App\Enums\SimplificationLevel;
use App\Enums\SummaryLength;
use App\Enums\VoiceOption;

readonly class Settings {

    protected const DEFAULT_SETTINGS = [
        'level' => SimplificationLevel::EASY,
        'summaryLength' => SummaryLength::MEDIUM,
        'internetSpeed' => InternetSpeed::MEDIUM,
        'voiceOption' => VoiceOption::BASIC,
        'emoji' => TRUE,
    ];

    public SimplificationLevel $level;
    public SummaryLength $summaryLength;
    public InternetSpeed $internetSpeed;
    public VoiceOption $voiceOption;
    public bool $emoji;

    public function __construct(array|null $settings = []) {

        $settings ??= [];

        foreach(self::DEFAULT_SETTINGS as $key => $value){
            if(key_exists($key, $settings) && $value instanceof \BackedEnum){
                $settings[$key] = $value::tryFrom($settings[$key]);
            }

            $this->$key = $settings[$key] ?? $value;
        }
    }

    protected function isEmoji(string $prompt): string {
        return $this->emoji ? $prompt : '';
    }

    public function getSystemPrompt(): string {
        return <<<PROMPT
"You are a helpful assistant that explains complex topics in simple terms for children in {$this->level->grade()}."
Use basic words and short sentences while keeping the original meaning.
Avoid abbreviations and acronyms, or explain them clearly when necessary.
{$this->isEmoji('Use emojis to help emphasise headings or important keywords. DO NOT overuse emojis.')}
When referencing a quote from the original text, ensure the original text is preserved. DO NOT simplify or rephrase the text. If the quoted text is difficult to understand, offer a short explanation.

When referencing a mathematical formula, preserve the full original expression exactly as written. Format all formulas using LaTeX syntax.

- Use `$...$` for short inline expressions (e.g., simple variable references or short equations).
- Use `$$...$$` for longer or more complex formulas, especially those with multiple variables, subscripts, or commas — this improves readability and layout.
- Do not paraphrase formulas or split them into text and math fragments.
- Always preserve the structure, variables, and notation exactly as in the original.
PROMPT;
    }
}
