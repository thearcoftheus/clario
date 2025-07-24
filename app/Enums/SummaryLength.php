<?php

namespace App\Enums;

enum SummaryLength: string {
    case SHORT = 'Short';
    case MEDIUM = 'Medium';
    case LONG = 'Long';

    public function length(): float {
        return match ($this) {
            self::SHORT => 0.25,
            self::MEDIUM => 0.5,
            self::LONG => 1,
        };
    }
}
