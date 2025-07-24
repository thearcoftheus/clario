<?php

namespace App\Enums;

enum SimplificationLevel: string {
    case EASY = 'Grade 2-3';
    case MODERATE = 'Grade 5-6';
    case ADVANCED = 'Grade 9-10';

    public function grade(): string {
        return match ($this) {
            self::EASY => "grades 2-3 (ages 7-9)",
            self::MODERATE => "grades 5-6 (ages 10-12)",
            self::ADVANCED => "grades 9-10 (ages 14-16)",
        };
    }
}




