import type { SimplificationLevel } from '@/stores/appStateStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue';

// Tracks one Simple Read "reading session" and records it as a
// simple_read_session behavior event (local-only — see feedbackStore).
//
// A session spans one article at one simplification level on the Simple Read
// pane. It ends — and flushes an event — when the article changes, the level
// changes (the regenerated content is a different reading experience, so WPM
// across the boundary would be meaningless), the pane unmounts, or the panel
// window goes away (pagehide, best-effort: the storage write may not complete
// if Chrome tears the window down first).
//
// Sessions shorter than MIN_SESSION_ACTIVE_MS are discarded as noise (opening
// the pane and immediately leaving says nothing about reading behavior —
// abandonment signals live in pane_visit patterns instead).

export const MIN_SESSION_ACTIVE_MS = 3000;

type SessionInputs = {
    articleUrl: Ref<string | null>;
    articleTitle: Ref<string>;
    simplifiedContent: Ref<string>;
    simplificationLevel: Ref<SimplificationLevel>;
    currentPage: Ref<number>;
    totalPages: Ref<number>;
};

type Session = {
    articleUrl: string;
    articleTitle: string;
    simplificationLevel: SimplificationLevel;
    wordCount: number;
    slideCount: number;
    furthestSlide: number;
    backwardPageTurns: number;
    accumulatedMs: number;
    visibleSince: number | null; // null while the panel is hidden
};

export function useSimpleReadSession(inputs: SessionInputs) {
    const feedbackStore = useFeedbackStore();

    let session: Session | null = null;

    function wordCountOf(content: string): number {
        const trimmed = content.trim();
        return trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    }

    function begin() {
        if (!inputs.articleUrl.value) {
            session = null;
            return;
        }
        session = {
            articleUrl: inputs.articleUrl.value,
            articleTitle: inputs.articleTitle.value,
            simplificationLevel: inputs.simplificationLevel.value,
            wordCount: wordCountOf(inputs.simplifiedContent.value),
            slideCount: inputs.totalPages.value,
            furthestSlide: inputs.currentPage.value,
            backwardPageTurns: 0,
            accumulatedMs: 0,
            visibleSince: document.visibilityState === 'visible' ? Date.now() : null,
        };
    }

    function flush() {
        if (!session) return;
        const ended = session;
        session = null;

        const activeMs = ended.accumulatedMs + (ended.visibleSince !== null ? Date.now() - ended.visibleSince : 0);
        if (activeMs < MIN_SESSION_ACTIVE_MS || ended.wordCount === 0) return;

        feedbackStore.recordEvent({
            type: 'simple_read_session',
            timestamp: Date.now(),
            articleUrl: ended.articleUrl,
            articleTitle: ended.articleTitle,
            simplificationLevel: ended.simplificationLevel,
            wordCount: ended.wordCount,
            activeMs,
            slideCount: ended.slideCount,
            furthestSlide: Math.min(ended.furthestSlide, ended.slideCount),
            backwardPageTurns: ended.backwardPageTurns,
            reachedEnd: ended.slideCount > 0 && ended.furthestSlide >= ended.slideCount,
        });
    }

    // The pane calls this from its Back handlers. An explicit signal rather
    // than watching currentPage decrease, because the pagination composable
    // also clamps currentPage down when a resize shrinks the page count —
    // which is not a re-read.
    function noteBackwardPageTurn() {
        if (session) session.backwardPageTurns++;
    }

    // New article or new level → new reading experience → new session.
    watch([inputs.articleUrl, inputs.simplificationLevel], () => {
        flush();
        begin();
    });

    // Keep the snapshot current while the session's article is still the one
    // on screen (content streams in, the AI title arrives late, and column
    // counts settle after reflow).
    watch([inputs.simplifiedContent, inputs.articleTitle, inputs.totalPages, inputs.currentPage], () => {
        if (!session || session.articleUrl !== inputs.articleUrl.value) return;
        session.wordCount = wordCountOf(inputs.simplifiedContent.value);
        session.articleTitle = inputs.articleTitle.value;
        session.slideCount = inputs.totalPages.value;
        session.furthestSlide = Math.max(session.furthestSlide, inputs.currentPage.value);
    });

    function onVisibilityChange() {
        if (!session) return;
        if (document.visibilityState === 'visible') {
            session.visibleSince ??= Date.now();
        } else if (session.visibleSince !== null) {
            session.accumulatedMs += Date.now() - session.visibleSince;
            session.visibleSince = null;
        }
    }

    function onPageHide() {
        flush();
    }

    onMounted(() => {
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('pagehide', onPageHide);
        begin();
    });

    onBeforeUnmount(() => {
        flush();
        document.removeEventListener('visibilitychange', onVisibilityChange);
        window.removeEventListener('pagehide', onPageHide);
    });

    return { noteBackwardPageTurn };
}
