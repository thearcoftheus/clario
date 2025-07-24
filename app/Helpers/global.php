<?php

function count_words(string $text): int {
    $words = preg_split('/\W+/u', $text, -1, PREG_SPLIT_NO_EMPTY) ?? [];
    return count($words);
}
