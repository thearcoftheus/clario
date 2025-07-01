<?php

namespace App\Enums;

enum SimplificationLevel: string {
    case GRADE_2_3 = 'Grade 2-3';
    case GRADE_4_5 = 'Grade 4-5';

    public function grade(): string {
        return match ($this) {
            self::GRADE_2_3 => "grades 2-3 (ages 7-9)",
            self::GRADE_4_5 => "grades 4-5 (ages 9-11)",
        };
    }
}




