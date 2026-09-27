import { decideSuggestion, type SuggestionDecision } from '@/helpers/decideSuggestion';
import { useAppStateStore, type SimplificationLevel } from '@/stores/appStateStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { useHistoryStore } from '@/stores/historyStore';
import { defineStore, storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

// Adaptive difficulty, the acting half. Runs the Phase A2 engine (via
// decideSuggestion) after every difficulty-check answer and either:
//
//   manual mode   ("I choose it")        — shows a nudge banner: Yes / No thanks
//   adaptive mode ("Clario picks for me") — changes the level right away and
//                                           shows a notice with Undo / OK
//
// Everything it reads and writes is the local-only behavior log in
// feedbackStore — no server is involved (CLAUDE.md, "Behavioral telemetry").
// The decision rules themselves are pure and unit-tested in
// helpers/decideSuggestion.ts + helpers/computeLevelSuggestion.ts; this store
// is only the glue between them, settings, and the banner.
//
// Module graph: this store imports appStateStore, feedbackStore and
// historyStore; nothing imports it back except components. That keeps the
// existing feedbackStore → appStateStore edge acyclic (same shape as
// reportStore).

export type ActiveSuggestion = SuggestionDecision & {
    articleUrl: string;
    articleTitle: string;
    shownAt: number;
};

export const useSuggestionStore = defineStore('suggestion', () => {
    const appState = useAppStateStore();
    const { settings } = storeToRefs(appState);
    const feedbackStore = useFeedbackStore();
    const historyStore = useHistoryStore();
    const { historyItems } = storeToRefs(historyStore);

    // The banner renders while this is set. At most one at a time.
    const active = ref<ActiveSuggestion | null>(null);

    // The level this store is itself about to set, so the settings watcher
    // below can tell its own change apart from one made in SettingsDialog.
    let expectedLevel: SimplificationLevel | null = null;

    // A suggestion belongs to the article it was made on. historyStore.add()
    // re-unshifts a revisited URL, so an equality check in the template alone
    // would let a stale Undo resurface later — clear it here instead.
    watch(
        () => historyItems.value[0]?.url,
        () => {
            active.value = null;
        },
    );

    // The user changed the level in Settings while a banner was up: the
    // banner's from/to no longer describe reality, so drop it.
    watch(
        () => settings.value.simplificationLevel,
        level => {
            if (expectedLevel === level) {
                expectedLevel = null;
                return;
            }
            active.value = null;
        },
    );

    function applyLevel(level: SimplificationLevel): Promise<void> {
        expectedLevel = level;
        // historyStore watches this and regenerates the current article.
        return appState.updateSettings({ simplificationLevel: level });
    }

    /**
     * Run the engine for the article the user just answered on. Called from
     * EasyReadPane after DifficultyFeedback has recorded the answer — the
     * only moment a suggestion can newly arise, since difficulty answers are
     * the engine's only primary votes.
     */
    function evaluateAfterAnswer(article: { url: string; title: string }): void {
        const decision = decideSuggestion({
            events: feedbackStore.events,
            currentLevel: settings.value.simplificationLevel,
            adaptive: settings.value.adaptiveDifficulty,
            articleUrl: article.url,
            now: Date.now(),
        });
        if (!decision) return;

        const now = Date.now();

        if (decision.mode === 'adaptive') {
            // Same ordering as SettingsDialog: the level_switch is recorded
            // before the settings change so the log never shows a level
            // without the switch that produced it.
            void feedbackStore.recordEvent({
                type: 'level_switch',
                timestamp: now,
                fromLevel: decision.fromLevel,
                toLevel: decision.toLevel,
                source: 'adaptive',
                articleUrl: article.url,
                articleTitle: article.title,
            });
            void applyLevel(decision.toLevel);
        }

        void feedbackStore.recordEvent({
            type: 'suggestion_shown',
            timestamp: now,
            articleUrl: article.url,
            articleTitle: article.title,
            mode: decision.mode,
            direction: decision.direction,
            fromLevel: decision.fromLevel,
            toLevel: decision.toLevel,
            confidence: decision.confidence,
            scope: decision.scope,
        });

        active.value = { ...decision, articleUrl: article.url, articleTitle: article.title, shownAt: now };
    }

    function recordResponse(current: ActiveSuggestion, response: 'accepted' | 'dismissed' | 'undone'): void {
        const now = Date.now();
        void feedbackStore.recordEvent({
            type: 'suggestion_response',
            timestamp: now,
            articleUrl: current.articleUrl,
            articleTitle: current.articleTitle,
            mode: current.mode,
            direction: current.direction,
            response,
            responseMs: now - current.shownAt,
        });
    }

    /** Nudge: the user said yes. Change the level; the article regenerates. */
    async function accept(): Promise<void> {
        const current = active.value;
        if (!current || current.mode !== 'nudge') return;

        void feedbackStore.recordEvent({
            type: 'level_switch',
            timestamp: Date.now(),
            fromLevel: current.fromLevel,
            toLevel: current.toLevel,
            source: 'suggestion',
            articleUrl: current.articleUrl,
            articleTitle: current.articleTitle,
        });
        recordResponse(current, 'accepted');
        active.value = null;
        await applyLevel(current.toLevel);
    }

    /** Nudge: the user said no thanks. Recorded so Clario learns to stop asking. */
    function dismiss(): void {
        const current = active.value;
        if (!current || current.mode !== 'nudge') return;

        recordResponse(current, 'dismissed');
        active.value = null;
    }

    /** Adaptive: put the level back. Counts as the user disagreeing (a veto). */
    async function undo(): Promise<void> {
        const current = active.value;
        if (!current || current.mode !== 'adaptive') return;

        void feedbackStore.recordEvent({
            type: 'level_switch',
            timestamp: Date.now(),
            fromLevel: current.toLevel,
            toLevel: current.fromLevel,
            source: 'adaptive_undo',
            articleUrl: current.articleUrl,
            articleTitle: current.articleTitle,
        });
        recordResponse(current, 'undone');
        active.value = null;
        await applyLevel(current.fromLevel);
    }

    /** Adaptive: the user tapped OK. Nothing to record — the change stands. */
    function acknowledge(): void {
        if (active.value?.mode !== 'adaptive') return;
        active.value = null;
    }

    return {
        active,
        evaluateAfterAnswer,
        accept,
        dismiss,
        undo,
        acknowledge,
    };
});
