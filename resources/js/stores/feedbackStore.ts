import { Views, type View } from '@/composables/useNavigation';
import type { SimplificationLevel } from '@/stores/appStateStore';
import { SimplificationLevels } from '@/stores/appStateStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// Behavioral telemetry — recorded locally only, NEVER transmitted to a server.
// See CLAUDE.md "Behavioral telemetry (local-only)" for the privacy posture,
// and docs/Context_Agent_Phase_A_Event_Schema.md for what each event type
// means, why it exists, and how the Phase A2 suggestion engine will use it.

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

// Fired once per article when the difficulty check first becomes visible.
// The denominator for the check's completion rate — without it, an
// unanswered check is indistinguishable from a never-seen one. Doubles as a
// coarse "user reached the end of Simple Read" completion signal.
export type DifficultyCheckShownEvent = {
    type: 'difficulty_check_shown';
    timestamp: number;
    articleUrl: string;
    articleTitle: string;
    simplificationLevel: SimplificationLevel;
};

export const LevelSwitchSources = ['settings', 'onboarding'] as const;
export type LevelSwitchSource = (typeof LevelSwitchSources)[number];

// Any change to settings.simplificationLevel. Direction is derivable from
// the SimplificationLevels ordering (Easy < Moderate < Challenging).
// Onboarding's initial choice is recorded as a baseline (source:
// 'onboarding'), not as a struggle signal — the analysis layer must treat
// the two sources differently.
export type LevelSwitchEvent = {
    type: 'level_switch';
    timestamp: number;
    fromLevel: SimplificationLevel;
    toLevel: SimplificationLevel;
    source: LevelSwitchSource;
    articleUrl: string | null;
    articleTitle: string | null;
};

export const PaneVisitTriggers = ['home_card', 'learn_another_way', 'nav'] as const;
export type PaneVisitTrigger = (typeof PaneVisitTriggers)[number];

// One event per user-initiated view change in the sidebar.
// 'learn_another_way' is the strongest escalation trigger: the user finished
// one modality and deliberately chose another.
export type PaneVisitEvent = {
    type: 'pane_visit';
    timestamp: number;
    pane: View;
    trigger: PaneVisitTrigger;
    articleUrl: string | null;
    articleTitle: string | null;
};

export const ChatIntents = ['clarification', 'other'] as const;
export type ChatIntent = (typeof ChatIntents)[number];

// One event per user chat message. Stores the client-side intent
// classification and coarse size — never the message text. Only
// 'clarification' indicates difficulty; curiosity ("tell me more") is a good
// sign and must not count against the reading level.
export type ChatMessageSentEvent = {
    type: 'chat_message_sent';
    timestamp: number;
    articleUrl: string;
    articleTitle: string;
    intent: ChatIntent;
    wordCount: number;
    // 1 = first user message about this article. Clarification as the first
    // message is a stronger difficulty signal than clarification deep into
    // an exploratory conversation.
    messageIndex: number;
};

// Phase B (Tier 2 proxies): one summary per Simple Read reading session,
// ended by article change, level change, or leaving the pane. Raw ingredients
// only — effective WPM (wordCount/activeMs) and revisit rates are derived at
// analysis time. Measured on the Simple Read pane, NOT the raw web page:
// it's the surface whose difficulty Clario controls, and it keeps scroll
// tracking off pages Clario isn't simplifying. Collection-only until the
// Phase B validation (correlate against difficulty answers) says otherwise.
export type SimpleReadSessionEvent = {
    type: 'simple_read_session';
    timestamp: number; // session end
    articleUrl: string;
    articleTitle: string;
    simplificationLevel: SimplificationLevel;
    wordCount: number; // of the simplified content (approximate; markdown included)
    activeMs: number; // time on the pane while the panel was visible
    slideCount: number;
    furthestSlide: number; // 1-based; highest slide reached
    backwardPageTurns: number; // user-initiated Back turns — the regression analog
    reachedEnd: boolean;
};

export type BehaviorEvent =
    | DifficultyFeedbackEvent
    | DifficultyCheckShownEvent
    | LevelSwitchEvent
    | PaneVisitEvent
    | ChatMessageSentEvent
    | SimpleReadSessionEvent;

// Retention: at ~200 bytes/event these caps keep the log under ~1 MB, well
// inside the 5 MB chrome.storage.local quota shared with settings/history.
const MAX_EVENT_AGE_DAYS = 180;
const MAX_EVENTS = 5000;

function isDifficultyChoice(value: unknown): value is DifficultyChoice {
    return DifficultyChoices.includes(value as DifficultyChoice);
}

function isSimplificationLevel(value: unknown): value is SimplificationLevel {
    return SimplificationLevels.includes(value as SimplificationLevel);
}

function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === 'string';
}

function isBehaviorEvent(value: unknown): value is BehaviorEvent {
    if (!value || typeof value !== 'object') return false;
    const v = value as Record<string, unknown>;
    if (typeof v.timestamp !== 'number') return false;

    switch (v.type) {
        case 'difficulty_feedback':
            return (
                typeof v.articleUrl === 'string' &&
                typeof v.articleTitle === 'string' &&
                isSimplificationLevel(v.simplificationLevel) &&
                isDifficultyChoice(v.choice)
            );
        case 'difficulty_check_shown':
            return (
                typeof v.articleUrl === 'string' &&
                typeof v.articleTitle === 'string' &&
                isSimplificationLevel(v.simplificationLevel)
            );
        case 'level_switch':
            return (
                isSimplificationLevel(v.fromLevel) &&
                isSimplificationLevel(v.toLevel) &&
                LevelSwitchSources.includes(v.source as LevelSwitchSource) &&
                isNullableString(v.articleUrl) &&
                isNullableString(v.articleTitle)
            );
        case 'pane_visit':
            return (
                Views.includes(v.pane as View) &&
                PaneVisitTriggers.includes(v.trigger as PaneVisitTrigger) &&
                isNullableString(v.articleUrl) &&
                isNullableString(v.articleTitle)
            );
        case 'chat_message_sent':
            return (
                typeof v.articleUrl === 'string' &&
                typeof v.articleTitle === 'string' &&
                ChatIntents.includes(v.intent as ChatIntent) &&
                typeof v.wordCount === 'number' &&
                typeof v.messageIndex === 'number'
            );
        case 'simple_read_session':
            return (
                typeof v.articleUrl === 'string' &&
                typeof v.articleTitle === 'string' &&
                isSimplificationLevel(v.simplificationLevel) &&
                typeof v.wordCount === 'number' &&
                typeof v.activeMs === 'number' &&
                typeof v.slideCount === 'number' &&
                typeof v.furthestSlide === 'number' &&
                typeof v.backwardPageTurns === 'number' &&
                typeof v.reachedEnd === 'boolean'
            );
        default:
            return false;
    }
}

// Drop events past the age cap, then trim to the count cap (newest kept).
// Runs in memory on load; the pruned array persists on the next recordEvent,
// which always writes the full array.
function prune(events: BehaviorEvent[]): BehaviorEvent[] {
    const cutoff = Date.now() - MAX_EVENT_AGE_DAYS * 24 * 60 * 60 * 1000;
    const fresh = events.filter(e => e.timestamp >= cutoff);
    return fresh.length > MAX_EVENTS ? fresh.slice(fresh.length - MAX_EVENTS) : fresh;
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
                events.value = prune(raw.filter(isBehaviorEvent));
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

    function clearAllEvents(): Promise<void> {
        events.value = [];
        return chrome.storage.local.remove('behaviorEvents');
    }

    function hasDifficultyFeedbackFor(url: string): boolean {
        return events.value.some(
            e => e.type === 'difficulty_feedback' && e.articleUrl === url,
        );
    }

    function hasCheckShownFor(url: string): boolean {
        return events.value.some(
            e => e.type === 'difficulty_check_shown' && e.articleUrl === url,
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
        clearAllEvents,
        hasDifficultyFeedbackFor,
        hasCheckShownFor,
        getEventsByType,
        loadEventsFromStorage,
    };
});
