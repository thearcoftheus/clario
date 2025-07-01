<?php

namespace App\Enums;

enum SimplificationLevel: string {
    case GRADE_2_3 = 'Grade 2-3';
    case GRADE_7_8 = 'Grade 7-8';

    public function grade(): string {
        return match ($this) {
            self::GRADE_2_3 => "grades 2-3 (ages 7-9)",
            self::GRADE_7_8 => "grades 7-8 (ages 12-14)",
        };
    }
}




