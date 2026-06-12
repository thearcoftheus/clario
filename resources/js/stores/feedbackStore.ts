import type { SimplificationLevel } from '@/stores/appStateStore';
import { SimplificationLevels } from '@/stores/appStateStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// Behavioral telemetry — recorded locally only, NEVER transmitted to a server.
// See CLAUDE.md "Behavioral telemetry (local-only)" for the privacy posture and
// reasoning. The discriminated union below is designed to accept additional
// event types (article completion, pane usage, settings changes, etc.) without
// schema migration; only difficulty_feedback exists today.

export const DifficultyChoices = ['too_easy', 'just_right', 'too_hard'] as const;
export type DifficultyChoice = (typeof DifficultyChoices)[number];

export type DifficultyFeedbackEvent = {
    type: 'difficulty_feedback';
    timestamp: number;
    articleUrl: string;
    articleTitle: string;
    simplificationLevel: SimplificationLevel;
    choice: DifficultyChoice;
};

export type BehaviorEvent = DifficultyFeedbackEvent;

function isDifficultyChoice(value: unknown): value is DifficultyChoice {
    return DifficultyChoices.includes(value as DifficultyChoice);
}

function isBehaviorEvent(value: unknown): value is BehaviorEvent {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (v.type !== 'difficulty_feedback') return false;
    return (
        typeof v.timestamp === 'number' &&
        typeof v.articleUrl === 'string' &&
        typeof v.articleTitle === 'string' &&
        SimplificationLevels.includes(v.simplificationLevel as SimplificationLevel) &&
        isDifficultyChoice(v.choice)
    );
}

export const useFeedbackStore = defineStore('feedback', () => {
    const events = ref<BehaviorEvent[]>([]);
    const isLoadingEvents = ref(true);

    function loadEventsFromStorage() {
        chrome.storage.local.get<{ behaviorEvents?: { events?: unknown } }>('behaviorEvents', result => {
            if (chrome.runtime.lastError) {
                isLoadingEvents.value = false;
                return;
            }

            const raw = result.behaviorEvents?.events;
            if (Array.isArray(raw)) {
                // Filter out anything that doesn't match the current schema —
                // forward-compatible if future event types are stored by a newer
                // client and read by an older one.
                events.value = raw.filter(isBehaviorEvent);
            }

            isLoadingEvents.value = false;
        });
    }

    loadEventsFromStorage();

    function recordEvent(event: BehaviorEvent): Promise<void> {
        events.value = [...events.value, event];

        // Deep-clone to plain JSON before persisting: Vue 3.5's reactive array
        // Proxies don't always structured-clone cleanly into chrome.storage,
        // which silently drops nested arrays. Same gotcha as appStateStore.
        return chrome.storage.local.set({
            behaviorEvents: JSON.parse(JSON.stringify({ events: events.value })),
        });
    }

    function hasDifficultyFeedbackFor(url: string): boolean {
        return events.value.some(
            e => e.type === 'difficulty_feedback' && e.articleUrl === url,
        );
    }

    function getEventsByType<T extends BehaviorEvent['type']>(
        type: T,
    ): Extract<BehaviorEvent, { type: T }>[] {
        return events.value.filter(e => e.type === type) as Extract<
            BehaviorEvent,
            { type: T }
        >[];
    }

    return {
        events,
        isLoadingEvents,
        recordEvent,
        hasDifficultyFeedbackFor,
        getEventsByType,
        loadEventsFromStorage,
    };
});
