import type { SimplificationLevel } from '@/stores/appStateStore';
import type {
    BehaviorEvent,
    ChatIntent,
    DifficultyChoice,
    LevelSwitchSource,
    PaneVisitTrigger,
} from '@/stores/feedbackStore';
import { describe, expect, it } from 'vitest';
import { computeLevelSuggestion, MIN_CONFIDENCE, RECENT_WINDOW_MS } from './computeLevelSuggestion';

// A fixed "now" so recency rules are deterministic. Events default to being
// recent (within the window); pass an explicit timestamp to age them out.
const NOW = 1_800_000_000_000;
const RECENT = NOW - 1000;
const STALE = NOW - RECENT_WINDOW_MS - 1000;

const ARC = 'https://thearc.org/article-';
const NEWS = 'https://news.example.com/story-';

function answer(
    choice: DifficultyChoice,
    { level = 'Moderate' as SimplificationLevel, url = `${ARC}${Math.abs(choice.length)}`, timestamp = RECENT } = {},
): BehaviorEvent {
    return {
        type: 'difficulty_feedback',
        timestamp,
        articleUrl: url,
        articleTitle: 'An Article',
        simplificationLevel: level,
        choice,
    };
}

// Distinct timestamps preserve intended ordering for the last-N window.
function answers(choices: DifficultyChoice[], opts: { level?: SimplificationLevel; url?: string } = {}): BehaviorEvent[] {
    return choices.map((choice, i) => answer(choice, { ...opts, url: opts.url ?? `${ARC}${i}`, timestamp: RECENT - (choices.length - i) * 60_000 }));
}

function levelSwitch(
    fromLevel: SimplificationLevel,
    toLevel: SimplificationLevel,
    { source = 'settings' as LevelSwitchSource, timestamp = RECENT } = {},
): BehaviorEvent {
    return { type: 'level_switch', timestamp, fromLevel, toLevel, source, articleUrl: null, articleTitle: null };
}

function chat(url: string, { intent = 'clarification' as ChatIntent, timestamp = RECENT } = {}): BehaviorEvent {
    return { type: 'chat_message_sent', timestamp, articleUrl: url, articleTitle: 'An Article', intent, wordCount: 5, messageIndex: 1 };
}

function escalation(url: string, { trigger = 'learn_another_way' as PaneVisitTrigger, timestamp = RECENT } = {}): BehaviorEvent {
    return { type: 'pane_visit', timestamp, pane: 'summary', trigger, articleUrl: url, articleTitle: 'An Article' };
}

describe('computeLevelSuggestion', () => {
    it('returns null on an empty log', () => {
        expect(computeLevelSuggestion([], 'Moderate', null, NOW)).toBeNull();
    });

    it('returns null below the minimum vote count', () => {
        expect(computeLevelSuggestion(answers(['too_hard', 'too_hard']), 'Moderate', null, NOW)).toBeNull();
    });

    it('suggests more_detailed on 3 too_easy votes (meets its 0.5 bar alone)', () => {
        const result = computeLevelSuggestion(answers(['too_easy', 'too_easy', 'too_easy']), 'Moderate', null, NOW);
        expect(result).toMatchObject({ suggest: 'more_detailed', confidence: 0.5, scope: 'global' });
    });

    it('does NOT suggest simpler on 3 too_hard votes alone (asymmetric bar)', () => {
        expect(computeLevelSuggestion(answers(['too_hard', 'too_hard', 'too_hard']), 'Moderate', null, NOW)).toBeNull();
    });

    it('suggests simpler on 4 too_hard votes (clears the 0.6 bar)', () => {
        const result = computeLevelSuggestion(answers(['too_hard', 'too_hard', 'too_hard', 'too_hard']), 'Moderate', null, NOW);
        expect(result).toMatchObject({ suggest: 'simpler', confidence: 0.6 });
        expect(result?.basedOn).toEqual({ hardVotes: 4, easyVotes: 0, answersConsidered: 4 });
    });

    it('lets chat clarifications on 2 articles push 3 too_hard votes over the bar', () => {
        const events = [...answers(['too_hard', 'too_hard', 'too_hard']), chat(`${ARC}a`), chat(`${ARC}b`)];
        const result = computeLevelSuggestion(events, 'Moderate', null, NOW);
        expect(result).toMatchObject({ suggest: 'simpler', confidence: 0.6 });
    });

    it('ignores clarifications on a single article (needs 2 distinct)', () => {
        const events = [...answers(['too_hard', 'too_hard', 'too_hard']), chat(`${ARC}a`), chat(`${ARC}a`)];
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toBeNull();
    });

    it('ignores curiosity-intent chat as corroboration', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard']),
            chat(`${ARC}a`, { intent: 'other' }),
            chat(`${ARC}b`, { intent: 'other' }),
        ];
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toBeNull();
    });

    it('lets Learn-Another-Way escalations to Read corroborate simpler', () => {
        const events = [...answers(['too_hard', 'too_hard', 'too_hard']), escalation(`${ARC}a`), escalation(`${ARC}b`)];
        const result = computeLevelSuggestion(events, 'Moderate', null, NOW);
        expect(result).toMatchObject({ suggest: 'simpler', confidence: 0.6 });
    });

    it('does not count home_card pane visits as escalation', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard']),
            escalation(`${ARC}a`, { trigger: 'home_card' }),
            escalation(`${ARC}b`, { trigger: 'home_card' }),
        ];
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toBeNull();
    });

    it('returns null on mixed votes', () => {
        expect(
            computeLevelSuggestion(answers(['too_hard', 'too_hard', 'too_hard', 'too_easy']), 'Moderate', null, NOW),
        ).toBeNull();
    });

    it('only considers the last 5 answers at the current level', () => {
        // 3 old too_easy followed by 5 recent too_hard + 1 corroborating pair:
        // the too_easy votes fall outside the 5-answer window.
        const events = [
            ...answers(['too_easy', 'too_easy', 'too_easy']).map(e => ({ ...e, timestamp: RECENT - 10 * 60_000 })),
            ...answers(['too_hard', 'too_hard', 'too_hard', 'too_hard', 'too_hard']),
        ];
        const result = computeLevelSuggestion(events, 'Moderate', null, NOW);
        expect(result).toMatchObject({ suggest: 'simpler', confidence: 0.7 });
    });

    it('ignores answers given at a different level', () => {
        const events = answers(['too_hard', 'too_hard', 'too_hard', 'too_hard'], { level: 'Easy' });
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toBeNull();
    });

    it('never suggests simpler at the Easy floor', () => {
        const events = answers(['too_hard', 'too_hard', 'too_hard', 'too_hard'], { level: 'Easy' });
        expect(computeLevelSuggestion(events, 'Easy', null, NOW)).toBeNull();
    });

    it('never suggests more_detailed at the Challenging ceiling', () => {
        const events = answers(['too_easy', 'too_easy', 'too_easy'], { level: 'Challenging' });
        expect(computeLevelSuggestion(events, 'Challenging', null, NOW)).toBeNull();
    });

    it('vetoes when a recent manual switch went the opposite direction', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard', 'too_hard']),
            levelSwitch('Easy', 'Moderate'), // user deliberately went MORE detailed
        ];
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toBeNull();
    });

    it('boosts confidence when a recent manual switch agrees', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard', 'too_hard']),
            levelSwitch('Challenging', 'Moderate'), // user already moved simpler once
        ];
        const result = computeLevelSuggestion(events, 'Moderate', null, NOW);
        expect(result?.confidence).toBeCloseTo(0.75);
    });

    it('ignores stale switches outside the recency window', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard', 'too_hard']),
            levelSwitch('Easy', 'Moderate', { timestamp: STALE }),
        ];
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toMatchObject({ suggest: 'simpler' });
    });

    it('never treats onboarding level choices as votes or vetoes', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard', 'too_hard']),
            levelSwitch('Easy', 'Challenging', { source: 'onboarding' }),
        ];
        expect(computeLevelSuggestion(events, 'Moderate', null, NOW)).toMatchObject({ suggest: 'simpler' });
    });

    it('scopes to the domain when it has enough answers', () => {
        const events = [
            // 3 too_easy on thearc.org, plus contradicting noise on another domain
            ...answers(['too_easy', 'too_easy', 'too_easy'], {}),
            ...answers(['too_hard', 'too_hard', 'too_hard'], { url: `${NEWS}x` }).map((e, i) => ({
                ...e,
                timestamp: RECENT - i,
            })),
        ];
        const result = computeLevelSuggestion(events, 'Moderate', 'thearc.org', NOW);
        expect(result).toMatchObject({ suggest: 'more_detailed', scope: 'domain' });
    });

    it('falls back to the global log when the domain has too few answers', () => {
        const events = answers(['too_easy', 'too_easy', 'too_easy'], { url: `${NEWS}x` });
        const result = computeLevelSuggestion(events, 'Moderate', 'thearc.org', NOW);
        expect(result).toMatchObject({ suggest: 'more_detailed', scope: 'global' });
    });

    it('caps confidence at 1', () => {
        const events = [
            ...answers(['too_hard', 'too_hard', 'too_hard', 'too_hard', 'too_hard']),
            levelSwitch('Challenging', 'Moderate'),
            chat(`${ARC}a`),
            chat(`${ARC}b`),
            escalation(`${ARC}c`),
            escalation(`${ARC}d`),
        ];
        const result = computeLevelSuggestion(events, 'Moderate', null, NOW);
        expect(result?.confidence).toBeLessThanOrEqual(1);
        expect(result?.confidence).toBeCloseTo(1);
    });

    it('always clears the published minimum bar when it returns a suggestion', () => {
        const cases = [
            answers(['too_easy', 'too_easy', 'too_easy']),
            answers(['too_hard', 'too_hard', 'too_hard', 'too_hard']),
        ];
        for (const events of cases) {
            const result = computeLevelSuggestion(events, 'Moderate', null, NOW);
            if (result) expect(result.confidence).toBeGreaterThanOrEqual(MIN_CONFIDENCE[result.suggest]);
        }
    });
});
