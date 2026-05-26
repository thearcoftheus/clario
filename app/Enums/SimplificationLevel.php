<?php

namespace App\Enums;

enum SimplificationLevel: string {
    case EASY = 'Easy';
    case MODERATE = 'Moderate';
    case CHALLENGING = 'Challenging';

    public function grade(): string {
        return match ($this) {
            self::EASY => "a Grade 2-3 reading level",
            self::MODERATE => "a Grade 5-6 reading level",
            self::CHALLENGING => "a Grade 9-10 reading level",
        };
    }
}
