import type { SimplificationLevel } from '@/stores/appStateStore';
import type { BehaviorEvent, DifficultyChoice, LevelSwitchSource, SuggestionDirection, SuggestionResponse } from '@/stores/feedbackStore';
import { describe, expect, it } from 'vitest';
import { decideSuggestion, SINGLE_NEGATIVE_COOLDOWN_MS, stepLevel, SUPPRESSION_WINDOW_MS } from './decideSuggestion';

const NOW = 1_800_000_000_000;
const RECENT = NOW - 1000;
const DAY = 24 * 60 * 60 * 1000;

const ARC = 'https://thearc.org/article-';
// The article the user just answered on. Always the newest answer in the
// fixtures below unless a test says otherwise.
const HERE = `${ARC}here`;

function answer(choice: DifficultyChoice, { level = 'Moderate' as SimplificationLevel, url = HERE, timestamp = RECENT } = {}): BehaviorEvent {
    return {
        type: 'difficulty_feedback',
        timestamp,
        articleUrl: url,
        articleTitle: 'An Article',
        simplificationLevel: level,
        choice,
    };
}

// Older answers on other articles, then the newest one on HERE. Four
// too_hard clears the 0.6 'simpler' bar on its own; three too_easy clears
// 'more_detailed'.
function history(choices: DifficultyChoice[], { level = 'Moderate' as SimplificationLevel } = {}): BehaviorEvent[] {
    return choices.map((choice, i) =>
        answer(choice, {
            level,
            url: i === choices.length - 1 ? HERE : `${ARC}${i}`,
            timestamp: RECENT - (choices.length - 1 - i) * 60_000,
        }),
    );
}

const FOUR_HARD: DifficultyChoice[] = ['too_hard', 'too_hard', 'too_hard', 'too_hard'];
const THREE_EASY: DifficultyChoice[] = ['too_easy', 'too_easy', 'too_easy'];

function response(direction: SuggestionDirection, resp: SuggestionResponse, { timestamp = RECENT - DAY, url = `${ARC}old` } = {}): BehaviorEvent {
    return {
        type: 'suggestion_response',
        timestamp,
        articleUrl: url,
        articleTitle: 'An Article',
        mode: resp === 'undone' ? 'adaptive' : 'nudge',
        direction,
        response: resp,
    };
}

function shown(url: string, { timestamp = RECENT - DAY } = {}): BehaviorEvent {
    return {
        type: 'suggestion_shown',
        timestamp,
        articleUrl: url,
        articleTitle: 'An Article',
        mode: 'nudge',
        direction: 'simpler',
        fromLevel: 'Moderate',
        toLevel: 'Easy',
        confidence: 0.6,
        scope: 'global',
    };
}

function levelSwitch(
    fromLevel: SimplificationLevel,
    toLevel: SimplificationLevel,
    { source = 'adaptive' as LevelSwitchSource, timestamp = RECENT - DAY } = {},
): BehaviorEvent {
    return { type: 'level_switch', timestamp, fromLevel, toLevel, source, articleUrl: null, articleTitle: null };
}

function decide(events: BehaviorEvent[], { adaptive = false, level = 'Moderate' as SimplificationLevel, url = HERE } = {}) {
    return decideSuggestion({ events, currentLevel: level, adaptive, articleUrl: url, now: NOW });
}

describe('stepLevel', () => {
    it('steps one level in each direction', () => {
        expect(stepLevel('Moderate', 'simpler')).toBe('Easy');
        expect(stepLevel('Moderate', 'more_detailed')).toBe('Challenging');
    });

    it('returns null at the ends of the scale', () => {
        expect(stepLevel('Easy', 'simpler')).toBeNull();
        expect(stepLevel('Challenging', 'more_detailed')).toBeNull();
    });
});

describe('decideSuggestion', () => {
    it('returns null on an empty log', () => {
        expect(decide([])).toBeNull();
    });

    it('returns null when the engine has too little evidence', () => {
        expect(decide(history(['too_hard', 'too_hard']))).toBeNull();
    });

    it('maps a simpler suggestion to one level down', () => {
        expect(decide(history(FOUR_HARD))).toMatchObject({
            mode: 'nudge',
            direction: 'simpler',
            fromLevel: 'Moderate',
            toLevel: 'Easy',
            // every fixture is on thearc.org, so the engine scopes to it
            scope: 'domain',
        });
    });

    it('maps a more_detailed suggestion to one level up', () => {
        expect(decide(history(THREE_EASY))).toMatchObject({ direction: 'more_detailed', toLevel: 'Challenging' });
    });

    it('reports mode from the adaptive flag', () => {
        expect(decide(history(FOUR_HARD), { adaptive: false })?.mode).toBe('nudge');
        expect(decide(history(FOUR_HARD), { adaptive: true })?.mode).toBe('adaptive');
    });

    describe('trigger guard', () => {
        it('returns null when the newest answer is on a different article', () => {
            expect(decide(history(FOUR_HARD), { url: `${ARC}elsewhere` })).toBeNull();
        });

        it('returns null when the newest answer does not point in the suggested direction', () => {
            // Four too_hard still clear the bar, but the user just said "just right".
            const events = [...history(FOUR_HARD).map(e => ({ ...e, articleUrl: `${ARC}older` })), answer('just_right')];
            expect(decide(events)).toBeNull();
        });

        it('returns null when the newest answer was given at a different level', () => {
            const events = [...history(FOUR_HARD).slice(0, -1), answer('too_hard', { level: 'Challenging' })];
            expect(decide(events)).toBeNull();
        });
    });

    describe('one per article', () => {
        it('returns null when this article already had a suggestion', () => {
            expect(decide([...history(FOUR_HARD), shown(HERE)])).toBeNull();
        });

        it('still suggests when the earlier suggestion was on another article', () => {
            expect(decide([...history(FOUR_HARD), shown(`${ARC}other`)])).not.toBeNull();
        });
    });

    describe('suppression after negative responses', () => {
        it('suppresses after two dismissals of the same direction within the window', () => {
            const events = [
                ...history(FOUR_HARD),
                response('simpler', 'dismissed', { timestamp: NOW - 10 * DAY }),
                response('simpler', 'dismissed', { timestamp: NOW - 20 * DAY }),
            ];
            expect(decide(events)).toBeNull();
        });

        it('ignores dismissals of the other direction', () => {
            const events = [
                ...history(FOUR_HARD),
                response('more_detailed', 'dismissed', { timestamp: NOW - 10 * DAY }),
                response('more_detailed', 'dismissed', { timestamp: NOW - 20 * DAY }),
            ];
            expect(decide(events)).not.toBeNull();
        });

        it('ignores dismissals older than the suppression window', () => {
            const events = [
                ...history(FOUR_HARD),
                response('simpler', 'dismissed', { timestamp: NOW - SUPPRESSION_WINDOW_MS - DAY }),
                response('simpler', 'dismissed', { timestamp: NOW - SUPPRESSION_WINDOW_MS - 2 * DAY }),
            ];
            expect(decide(events)).not.toBeNull();
        });

        it('counts an undo as a negative response', () => {
            const events = [
                ...history(FOUR_HARD),
                response('simpler', 'undone', { timestamp: NOW - 10 * DAY }),
                response('simpler', 'dismissed', { timestamp: NOW - 20 * DAY }),
            ];
            expect(decide(events)).toBeNull();
        });

        it('waits out the single-negative cool-down after one dismissal', () => {
            const inside = [...history(FOUR_HARD), response('simpler', 'dismissed', { timestamp: NOW - SINGLE_NEGATIVE_COOLDOWN_MS + DAY })];
            expect(decide(inside)).toBeNull();

            const outside = [...history(FOUR_HARD), response('simpler', 'dismissed', { timestamp: NOW - SINGLE_NEGATIVE_COOLDOWN_MS - DAY })];
            expect(decide(outside)).not.toBeNull();
        });

        it('never suppresses on accepted responses', () => {
            const events = [
                ...history(FOUR_HARD),
                response('simpler', 'accepted', { timestamp: NOW - DAY }),
                response('simpler', 'accepted', { timestamp: NOW - 2 * DAY }),
            ];
            expect(decide(events)).not.toBeNull();
        });
    });

    describe('adaptive mode', () => {
        it('moves again as soon as the engine has fresh evidence at the new level', () => {
            // Clario went Easy → Moderate yesterday; three consistent "too easy"
            // answers at Moderate are enough to move again. No time-based wall.
            const events = [...history(THREE_EASY), levelSwitch('Easy', 'Moderate', { source: 'adaptive', timestamp: NOW - DAY })];
            expect(decide(events, { adaptive: true })).toMatchObject({ mode: 'adaptive', toLevel: 'Challenging' });
        });

        it('still holds after a recent undo, via the engine veto', () => {
            const events = [...history(FOUR_HARD), levelSwitch('Easy', 'Moderate', { source: 'adaptive_undo', timestamp: NOW - DAY })];
            expect(decide(events, { adaptive: true })).toBeNull();
        });
    });
});
