<?php

namespace App\DTO;

readonly class FleschKincaidReadability {
    public function __construct(
        public float $score,
        public int $grade,
    ) {}
}
