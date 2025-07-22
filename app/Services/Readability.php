<?php

namespace App\Services;

use App\DTO\FleschKincaidReadability;

class Readability {

    protected function getText(string $raw) {
        return html_entity_decode(strip_tags($raw));
    }

    protected function getSentences(string $text): array {
        return preg_split('/[.!?]+/', $text, -1, PREG_SPLIT_NO_EMPTY) ?? [];
    }

    protected function getWords(string $text): array {
        return preg_split('/\W+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?? [];
    }

    protected function getSyllables(array $words): int {
        $syllables = 0;
        foreach($words as $w){
            $w = strtolower($w);
            // Remove trailing e's that are usually silent
            $w = preg_replace('/e\b/', '', $w);
            // Count vowel groups as syllables
            preg_match_all('/[aeiouy]+/', $w, $m);
            $count = max(1, count($m[0]));
            $syllables += $count;
        }
        return $syllables;
    }

    protected function getReadingEase(float $averageSentenceLength, float $averageWordLength): float {
        $readingEase = 206.835 - 1.015 * $averageSentenceLength - 84.6 * $averageWordLength;
        return round($readingEase, 1);
    }

    protected function getGrade(float $averageSentenceLength, float $averageWordLength): int {
        $fkGrade = 0.39 * $averageSentenceLength + 11.8 * $averageWordLength - 15.59;
        $fkGrade = (int)round($fkGrade);
        $fkGrade = max(1, min(12, $fkGrade));
        return $fkGrade;
    }

    public function getReadability(string $raw) {

        $text = $this->getText($raw);

        $sentences = $this->getSentences($text);
        $sentenceCount = max(1, count($sentences));

        $words = $this->getWords($text);
        $wordCount = max(1, count($words));

        $syllables = $this->getSyllables($words);

        $averageSentenceLength = $wordCount / $sentenceCount;
        $averageWordLength = $syllables / $wordCount;

        return new FleschKincaidReadability(
            $this->getReadingEase($averageSentenceLength, $averageWordLength),
            $this->getGrade($averageSentenceLength, $averageWordLength),
        );
    }
}
