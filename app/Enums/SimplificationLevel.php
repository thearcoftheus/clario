<?php

namespace App\Enums;

enum SimplificationLevel: string {
    case EASY = 'Grade 2-3';
    case MODERATE = 'Grade 5-6';
    case ADVANCED = 'Grade 9-10';

    public function grade(): string {
        return match ($this) {
            self::EASY => "a Grade 2-3 reading level",
            self::MODERATE => "a Grade 5-6 reading level",
            self::ADVANCED => "a Grade 9-10 reading level",
        };
    }
}




