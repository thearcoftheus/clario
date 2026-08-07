import type { ChatIntent } from '@/stores/feedbackStore';

// Client-side intent classification for chat telemetry — no API call, and the
// message text itself is never stored (see docs/Context_Agent_Phase_A_Event_Schema.md).
//
// Deliberately biased toward PRECISION over recall: a missed clarification
// just loses one telemetry vote, but a curiosity question misread as struggle
// pushes the future suggestion engine toward over-simplifying — the worse
// failure mode for this population (dignity cost). When in doubt, 'other'.
const CLARIFICATION_PATTERNS: RegExp[] = [
    /\bwhat does\b.+\bmean\b/i,
    /\bwhat(?:'s| is| are) (?:a|an)\b/i,
    /\bi (?:don't|do not|dont) understand\b/i,
    /\bi(?:'m| am) confused\b/i,
    /\bthis is confusing\b/i,
    /\bcan you explain\b/i,
    /^explain\b/i,
    /\bhelp me understand\b/i,
    /\bwhat are they talking about\b/i,
    /\bi (?:don't|dont) get it\b/i,
];

export function classifyChatIntent(message: string): ChatIntent {
    const text = message.trim();
    return CLARIFICATION_PATTERNS.some(pattern => pattern.test(text)) ? 'clarification' : 'other';
}
