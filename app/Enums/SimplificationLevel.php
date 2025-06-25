<?php

namespace App\Enums;

enum SimplificationLevel: string {
    case GRADE_2_3 = 'Grade 2-3';
    case GRADE_4_5 = 'Grade 4-5';

    protected function initialSystemPrompt(): string {

        $grade = match ($this) {
            self::GRADE_2_3 => "grades 2-3 (ages 7-9).",
            self::GRADE_4_5 => "grades 4-5 (ages 9-11).",
        };

        return "You are a helpful assistant that explains complex topics in simple terms for children in $grade.";
    }

    public function getPrompt(string $prompt): string {
        return $this->initialSystemPrompt() . "\n" . $prompt;
    }

    static public function fromFallback(string $value): self {
        return self::tryFrom($value) ?? self::GRADE_2_3;
    }
}




