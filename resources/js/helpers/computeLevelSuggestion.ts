import { SimplificationLevels, type SimplificationLevel } from '@/stores/appStateStore';
import type { BehaviorEvent, DifficultyFeedbackEvent, LevelSwitchEvent, LevelSwitchSource, SuggestionDirection } from '@/stores/feedbackStore';

// Phase A2 suggestion engine — a pure function over the local behavior log.
// Design and rule rationale: docs/Context_Agent_Phase_A_Event_Schema.md
// ("Phase A2: the suggestion engine"). Called by decideSuggestion.ts, which
// adds the delivery policy (one per article, suppression after dismissals);
// stores/suggestionStore.ts runs both after every difficulty answer.
//
// The tier rules, in one paragraph: difficulty answers are the only signals
// that can CREATE a suggestion; a recent user-made level switch in the
// opposite direction VETOES it outright (revealed preference wins); manual
// switches in the same direction and Tier-1 corroborators (chat
// clarifications, Learn-Another-Way escalations to Read) only raise
// confidence. The confidence bar is deliberately higher for 'simpler' than
// for 'more_detailed' — serving needlessly simple text is a dignity cost, so
// uncertainty never resolves downward.

// The runtime const lives in feedbackStore (its validator needs it); the
// type is re-exported here so engine callers have one import site.
export type { SuggestionDirection } from '@/stores/feedbackStore';

export type LevelSuggestion = {
    suggest: SuggestionDirection;
    // 0..1. Already gated: if this object is returned at all, confidence has
    // cleared MIN_CONFIDENCE for its direction.
    confidence: number;
    // Whether the primary votes came from this domain's articles or, when the
    // domain had too few signals, from the whole log.
    scope: 'domain' | 'global';
    basedOn: { hardVotes: number; easyVotes: number; answersConsidered: number };
};

// ——— Tuning constants ———
// All placeholders until Round 2 testing data calibrates them (design doc,
// "Open decisions"). Exported so tests and future dev tooling can reference
// them instead of hardcoding.
export const PRIMARY_VOTE_WINDOW = 5; // look at the user's last N difficulty answers
export const MIN_PRIMARY_VOTES = 3; // votes needed (with zero opposing) to form a suggestion
export const MIN_DOMAIN_SIGNALS = 3; // fewer answers than this on the domain → fall back to global
export const RECENT_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // "recent" for switches + corroborators
export const MIN_CONFIDENCE: Record<SuggestionDirection, number> = {
    simpler: 0.6, // 3-of-5 alone (0.5) is NOT enough — needs a 4th vote or corroboration
    more_detailed: 0.5, // 3-of-5 alone suffices
};

const BASE_CONFIDENCE = 0.5;
const EXTRA_VOTE_BONUS = 0.1; // per primary vote beyond MIN_PRIMARY_VOTES
const SWITCH_BOOST = 0.15; // recent manual switch in the suggested direction
const CORROBORATION_BOOST = 0.1; // per corroborating Tier-1 pattern (chat, escalation)

// How each level_switch source counts (see LevelSwitchSources in feedbackStore):
//
//   source          opposite direction   same direction
//   settings        veto                 boost
//   adaptive_undo   veto                 —        (the user disagreed with Clario)
//   suggestion      veto                 —        (a user action, so it stops
//                                                  ping-pong; but never a boost —
//                                                  Clario's own prompt must not
//                                                  ratchet Challenging→Moderate→Easy)
//   adaptive        —                    —        (Clario's change is not a
//                                                  preference; oscillation is
//                                                  bounded by needing ≥3 fresh
//                                                  answers at the new level)
//   onboarding      —                    —        (baseline, not a vote)
export const VETO_SOURCES: readonly LevelSwitchSource[] = ['settings', 'suggestion', 'adaptive_undo'];
export const BOOST_SOURCES: readonly LevelSwitchSource[] = ['settings'];

export function hostnameOf(url: string | null): string | null {
    if (!url) return null;
    try {
        return new URL(url).hostname;
    } catch {
        return null;
    }
}

function rank(level: SimplificationLevel): number {
    return SimplificationLevels.indexOf(level);
}

function switchDirection(s: LevelSwitchEvent): SuggestionDirection | null {
    const delta = rank(s.toLevel) - rank(s.fromLevel);
    if (delta < 0) return 'simpler';
    if (delta > 0) return 'more_detailed';
    return null;
}

export function computeLevelSuggestion(
    events: BehaviorEvent[],
    currentLevel: SimplificationLevel,
    currentDomain: string | null,
    // Injected rather than read from Date.now() so the function stays pure
    // and recency rules are testable.
    now: number,
): LevelSuggestion | null {
    // ——— 1. Scope: this domain's answers if there are enough, else global ———
    const answersAtLevel = events.filter(
        (e): e is DifficultyFeedbackEvent => e.type === 'difficulty_feedback' && e.simplificationLevel === currentLevel,
    );
    const domainAnswers = currentDomain ? answersAtLevel.filter(a => hostnameOf(a.articleUrl) === currentDomain) : [];
    const useDomain = domainAnswers.length >= MIN_DOMAIN_SIGNALS;
    const scope: LevelSuggestion['scope'] = useDomain ? 'domain' : 'global';

    // ——— 2. Primary votes: the last N difficulty answers at the current level ———
    const window = (useDomain ? domainAnswers : answersAtLevel)
        .slice()
        .sort((a, b) => a.timestamp - b.timestamp)
        .slice(-PRIMARY_VOTE_WINDOW);
    const hardVotes = window.filter(a => a.choice === 'too_hard').length;
    const easyVotes = window.filter(a => a.choice === 'too_easy').length;

    let suggest: SuggestionDirection;
    if (hardVotes >= MIN_PRIMARY_VOTES && easyVotes === 0) {
        suggest = 'simpler';
    } else if (easyVotes >= MIN_PRIMARY_VOTES && hardVotes === 0) {
        suggest = 'more_detailed';
    } else {
        return null; // mixed or insufficient evidence
    }

    // Nowhere to go in the suggested direction.
    if (suggest === 'simpler' && rank(currentLevel) === 0) return null;
    if (suggest === 'more_detailed' && rank(currentLevel) === SimplificationLevels.length - 1) return null;

    const primaryVotes = suggest === 'simpler' ? hardVotes : easyVotes;
    let confidence = BASE_CONFIDENCE + EXTRA_VOTE_BONUS * (primaryVotes - MIN_PRIMARY_VOTES);

    // ——— 3. User-made switches: strongest revealed preference ———
    // Considered globally (not domain-scoped): a level change is a statement
    // about the user, not about one site. Which sources veto and which boost
    // is the VETO_SOURCES / BOOST_SOURCES table above.
    const recentSwitches = events.filter((e): e is LevelSwitchEvent => e.type === 'level_switch' && now - e.timestamp <= RECENT_WINDOW_MS);
    const opposite: SuggestionDirection = suggest === 'simpler' ? 'more_detailed' : 'simpler';
    if (recentSwitches.some(s => VETO_SOURCES.includes(s.source) && switchDirection(s) === opposite)) {
        return null; // the user has spoken — veto
    }
    if (recentSwitches.some(s => BOOST_SOURCES.includes(s.source) && switchDirection(s) === suggest)) {
        confidence += SWITCH_BOOST;
    }

    // ——— 4. Corroborators: can only strengthen a 'simpler' suggestion ———
    if (suggest === 'simpler') {
        const cutoff = now - RECENT_WINDOW_MS;
        const inScope = (url: string | null) => !useDomain || hostnameOf(url) === currentDomain;

        const clarificationArticles = new Set(
            events
                .filter(e => e.type === 'chat_message_sent' && e.intent === 'clarification' && e.timestamp >= cutoff && inScope(e.articleUrl))
                .map(e => (e as Extract<BehaviorEvent, { type: 'chat_message_sent' }>).articleUrl),
        );
        if (clarificationArticles.size >= 2) confidence += CORROBORATION_BOOST;

        const escalationArticles = new Set(
            events
                .filter(
                    e =>
                        e.type === 'pane_visit' &&
                        e.pane === 'summary' &&
                        e.trigger === 'learn_another_way' &&
                        e.timestamp >= cutoff &&
                        e.articleUrl !== null &&
                        inScope(e.articleUrl),
                )
                .map(e => (e as Extract<BehaviorEvent, { type: 'pane_visit' }>).articleUrl),
        );
        if (escalationArticles.size >= 2) confidence += CORROBORATION_BOOST;
    }

    confidence = Math.min(1, confidence);
    if (confidence < MIN_CONFIDENCE[suggest]) return null;

    return { suggest, confidence, scope, basedOn: { hardVotes, easyVotes, answersConsidered: window.length } };
}
