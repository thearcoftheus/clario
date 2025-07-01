<?php

namespace App\DTO;

use App\Enums\SimplificationLevel;

readonly class Settings {

    protected const DEFAULT_SETTINGS = [
        'level' => SimplificationLevel::GRADE_2_3,
        'emoji' => TRUE,
    ];

    public SimplificationLevel $level;
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
PROMPT;
    }
}
