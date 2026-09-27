import { SimplificationLevels, type SimplificationLevel } from '@/stores/appStateStore';
import type {
    BehaviorEvent,
    DifficultyChoice,
    DifficultyFeedbackEvent,
    SuggestionDirection,
    SuggestionMode,
    SuggestionResponseEvent,
} from '@/stores/feedbackStore';
import { computeLevelSuggestion, hostnameOf } from './computeLevelSuggestion';

// Delivery policy for the Phase A2 engine — a pure function over the local
// behavior log, like computeLevelSuggestion itself. The engine answers "does
// the evidence point somewhere?"; this answers "should Clario act on that
// RIGHT NOW, for THIS article, in THIS mode?". Keeping it pure means every
// rule that decides whether a user sees a nudge is unit-tested, and the
// store that calls it (stores/suggestionStore.ts) stays a thin glue layer.
//
// Cesar's UX brief (Aug 7): nudges must be rare — one that appears too often
// "risks feeling naggy or patronizing". Every gate below exists to enforce
// that, and all of them are derived from the event log, so there is no
// separate "suppressed until" state to keep in sync or to migrate.

export type SuggestionDecision = {
    mode: SuggestionMode;
    direction: SuggestionDirection;
    fromLevel: SimplificationLevel;
    toLevel: SimplificationLevel;
    confidence: number;
    scope: 'domain' | 'global';
};

export type DecideSuggestionInput = {
    events: BehaviorEvent[];
    currentLevel: SimplificationLevel;
    adaptive: boolean;
    articleUrl: string;
    now: number;
};

// ——— Tuning constants ———
// Placeholders until Round 2 testing data calibrates them, same as the
// engine's. Exported so tests reference them instead of hardcoding.
export const SUPPRESSION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
// This many dismissals/undos of the same direction inside the window and
// Clario stops suggesting that direction until the window rolls over.
export const NEGATIVE_RESPONSES_TO_SUPPRESS = 2;
// After ONE "No thanks" / Undo, wait this long before asking again. Without
// it, a dismissal is followed by a fresh nudge on the very next article: the
// level didn't change, so the engine's vote window still qualifies.
export const SINGLE_NEGATIVE_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

// There is deliberately NO time-based cool-down between adaptive changes.
// The engine only counts answers given at the CURRENT level, so after any
// change a person must read at least three more articles and rate each one
// the same way before the level can move again — three consistent votes at
// the new level is the floor. A 7-day wall on top of that was tried during
// 0.6.0 testing and only stalled eager readers, which is exactly who adaptive
// mode is for. An Undo still vetoes that direction for 30 days (engine rule).

// The difficulty answer that "points" in each direction.
const CHOICE_FOR_DIRECTION: Record<SuggestionDirection, DifficultyChoice> = {
    simpler: 'too_hard',
    more_detailed: 'too_easy',
};

/** One step in `direction`, or null when already at that end of the scale. */
export function stepLevel(level: SimplificationLevel, direction: SuggestionDirection): SimplificationLevel | null {
    const index = SimplificationLevels.indexOf(level) + (direction === 'simpler' ? -1 : 1);
    return SimplificationLevels[index] ?? null;
}

function newestAnswer(events: BehaviorEvent[]): DifficultyFeedbackEvent | null {
    let newest: DifficultyFeedbackEvent | null = null;
    for (const e of events) {
        if (e.type === 'difficulty_feedback' && (!newest || e.timestamp >= newest.timestamp)) newest = e;
    }
    return newest;
}

export function decideSuggestion(input: DecideSuggestionInput): SuggestionDecision | null {
    const { events, currentLevel, adaptive, articleUrl, now } = input;

    // ——— 1. Trigger guard: only ever act right after an answer on THIS article ———
    // Makes the function safe to call at any time, and keeps the moment of
    // the nudge tied to something the user just did rather than appearing
    // mid-read.
    const answer = newestAnswer(events);
    if (!answer || answer.articleUrl !== articleUrl || answer.simplificationLevel !== currentLevel) return null;

    // ——— 2. The engine ———
    const suggestion = computeLevelSuggestion(events, currentLevel, hostnameOf(articleUrl), now);
    if (!suggestion) return null;
    const direction = suggestion.suggest;

    // The answer that tipped the balance must agree with the suggestion.
    // A window of [hard, hard, hard, hard, just_right] still clears the bar,
    // but "You said this was just right — want simpler words?" is absurd.
    if (answer.choice !== CHOICE_FOR_DIRECTION[direction]) return null;

    // ——— 3. Somewhere to go ———
    // (The engine already returns null at the scale ends; this makes the
    // target explicit and keeps the type honest.)
    const toLevel = stepLevel(currentLevel, direction);
    if (!toLevel) return null;

    // ——— 4. One suggestion per article, in either mode ———
    if (events.some(e => e.type === 'suggestion_shown' && e.articleUrl === articleUrl)) return null;

    // ——— 5. The user has already said no to this direction ———
    const negatives = events.filter(
        (e): e is SuggestionResponseEvent =>
            e.type === 'suggestion_response' && e.direction === direction && (e.response === 'dismissed' || e.response === 'undone'),
    );
    const recentNegatives = negatives.filter(e => now - e.timestamp <= SUPPRESSION_WINDOW_MS);
    if (recentNegatives.length >= NEGATIVE_RESPONSES_TO_SUPPRESS) return null;
    if (negatives.some(e => now - e.timestamp <= SINGLE_NEGATIVE_COOLDOWN_MS)) return null;

    return {
        mode: adaptive ? 'adaptive' : 'nudge',
        direction,
        fromLevel: currentLevel,
        toLevel,
        confidence: suggestion.confidence,
        scope: suggestion.scope,
    };
}
