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

    /**
     * Concrete, followable writing rules for each level. The numeric grade in grade()
     * is a weak lever on its own — models calibrate poorly to reading-grade numbers —
     * so these explicit rules are what actually separate the three levels.
     *
     * The rules are drawn from established plain-language and Easy Read standards for
     * adults (including adults with intellectual/developmental disabilities):
     *   - The Easy Read Standard (easyreadstandard.org): one idea per sentence,
     *     a 25-word ceiling, common words, define hard terms, active voice, address
     *     the reader as "you", and "simple ≠ childish / clarity over cleverness".
     *   - Federal Plain Language Guidelines (plainlanguage.gov): average sentence
     *     length of ~15-20 words, active voice, avoid jargon.
     * The EASY tier deliberately targets shorter sentences than the 25-word ceiling,
     * since it serves the readers who need the most support.
     */
    public function styleGuidance(): string {
        return match ($this) {
            self::EASY =>
                "- Use only short, common, everyday words. Avoid words the reader might need to look up; if you must use one, explain it in a few plain words right after.\n" .
                "- Keep sentences well under 25 words — often around 10 to 15 — and put just one idea in each sentence.\n" .
                "- Use the active voice, and address the reader as \"you\" where it fits naturally.",
            self::MODERATE =>
                "- Prefer common, everyday words. You may use a more specific term when it makes things clearer, but explain any term the reader is unlikely to know.\n" .
                "- Keep sentences fairly short — aim for about 15 words, and avoid packing several ideas into one sentence.\n" .
                "- Prefer the active voice.",
            self::CHALLENGING =>
                "- Use clear, plain wording, but you may keep precise or technical terms where they matter. Briefly explain any specialised term the first time it appears.\n" .
                "- Use ordinary sentence lengths; just break up any sentence that becomes long or tangled.\n" .
                "- Keep the overall structure straightforward and easy to follow.",
        };
    }
}
