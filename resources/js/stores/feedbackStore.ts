import { Views, type View } from '@/composables/useNavigation';
import type { SimplificationLevel } from '@/stores/appStateStore';
import { SimplificationLevels } from '@/stores/appStateStore';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// Behavioral telemetry — recorded locally only, NEVER transmitted to a server.
// See CLAUDE.md "Behavioral telemetry (local-only)" for the privacy posture,
// and docs/Context_Agent_Phase_A_Event_Schema.md for what each event type
// means, why it exists, and how the Phase A2 suggestion engine uses it
// (helpers/computeLevelSuggestion.ts + helpers/decideSuggestion.ts, driven
// by stores/suggestionStore.ts).

export const DifficultyChoices = ['too_easy', 'just_right', 'too_hard'] as const;
export type DifficultyChoice = (typeof DifficultyChoices)[number];

export type DifficultyFeedbackEvent = {
    type: 'difficulty_feedback';
    timestamp: number;
    articleUrl: string;
    articleTitle: string;
    simplificationLevel: SimplificationLevel;
    choice: DifficultyChoice;
    // How long the user took to answer, measured from the check first
    // becoming visible in THIS session (so a check re-shown for an article
    // seen in an earlier session measures from the re-show). Collection-only
    // for now; the idea is to down-weight very fast answers later, since this
    // audience may pick the agreeable answer without pausing (Cesar, Aug 7).
    // Optional: events recorded before this field existed don't have it.
    responseMs?: number;
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

// 'settings'      — the user changed the level in SettingsDialog
// 'onboarding'    — the initial choice during onboarding (a baseline, never a
//                   struggle signal)
// 'suggestion'    — the user accepted a nudge (manual mode)
// 'adaptive'      — Clario applied a change on its own (adaptive mode)
// 'adaptive_undo' — the user undid an adaptive change
// How the engine weighs each source: computeLevelSuggestion.ts
// VETO_SOURCES / BOOST_SOURCES.
export const LevelSwitchSources = ['settings', 'onboarding', 'suggestion', 'adaptive', 'adaptive_undo'] as const;
export type LevelSwitchSource = (typeof LevelSwitchSources)[number];

// Any change to settings.simplificationLevel — every change, whoever made
// it, so the log can always answer "why is this user at this level?".
// Direction is derivable from the SimplificationLevels ordering
// (Easy < Moderate < Challenging).
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

// ——— Phase A2: the suggestion engine's own outcomes ———
// These runtime consts live here (not in the helpers) because the validator
// below needs them; computeLevelSuggestion.ts re-exports the direction type.
export const SuggestionDirections = ['simpler', 'more_detailed'] as const;
export type SuggestionDirection = (typeof SuggestionDirections)[number];

// 'nudge'    — manual mode: Clario asked, the user decides
// 'adaptive' — adaptive mode: Clario changed the level and offered Undo
export const SuggestionModes = ['nudge', 'adaptive'] as const;
export type SuggestionMode = (typeof SuggestionModes)[number];

export const SuggestionResponses = ['accepted', 'dismissed', 'undone'] as const;
export type SuggestionResponse = (typeof SuggestionResponses)[number];

// One per time the engine's result reached the user — as a nudge banner or
// as an applied adaptive change. Also the "one suggestion per article" guard.
export type SuggestionShownEvent = {
    type: 'suggestion_shown';
    timestamp: number;
    articleUrl: string;
    articleTitle: string;
    mode: SuggestionMode;
    direction: SuggestionDirection;
    fromLevel: SimplificationLevel;
    toLevel: SimplificationLevel;
    confidence: number;
    scope: 'domain' | 'global';
};

// What the user did with it. 'undone' only occurs with mode 'adaptive'.
// A level change that results from 'accepted' or 'undone' is ALSO recorded
// as a level_switch — this event keeps the funnel (shown → response)
// analyzable in one place; the level_switch is what the engine consumes.
// Dismissals and undos are what decideSuggestion.ts counts to stop asking.
export type SuggestionResponseEvent = {
    type: 'suggestion_response';
    timestamp: number;
    articleUrl: string;
    articleTitle: string;
    mode: SuggestionMode;
    direction: SuggestionDirection;
    response: SuggestionResponse;
    // ms between suggestion_shown and this response.
    responseMs?: number;
};

// The user flipped "I choose it" / "Clario picks for me". Turning adaptive
// off shortly after an adaptive change is the strongest "that was wrong"
// signal there is, and would otherwise be invisible in the log.
export type AdaptiveModeChangedEvent = {
    type: 'adaptive_mode_changed';
    timestamp: number;
    enabled: boolean;
    source: 'settings' | 'onboarding';
};

export type BehaviorEvent =
    | DifficultyFeedbackEvent
    | DifficultyCheckShownEvent
    | LevelSwitchEvent
    | PaneVisitEvent
    | ChatMessageSentEvent
    | SimpleReadSessionEvent
    | SuggestionShownEvent
    | SuggestionResponseEvent
    | AdaptiveModeChangedEvent;

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

function isOptionalNumber(value: unknown): value is number | undefined {
    return value === undefined || typeof value === 'number';
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
                isDifficultyChoice(v.choice) &&
                isOptionalNumber(v.responseMs)
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
        case 'suggestion_shown':
            return (
                typeof v.articleUrl === 'string' &&
                typeof v.articleTitle === 'string' &&
                SuggestionModes.includes(v.mode as SuggestionMode) &&
                SuggestionDirections.includes(v.direction as SuggestionDirection) &&
                isSimplificationLevel(v.fromLevel) &&
                isSimplificationLevel(v.toLevel) &&
                typeof v.confidence === 'number' &&
                (v.scope === 'domain' || v.scope === 'global')
            );
        case 'suggestion_response':
            return (
                typeof v.articleUrl === 'string' &&
                typeof v.articleTitle === 'string' &&
                SuggestionModes.includes(v.mode as SuggestionMode) &&
                SuggestionDirections.includes(v.direction as SuggestionDirection) &&
                SuggestionResponses.includes(v.response as SuggestionResponse) &&
                isOptionalNumber(v.responseMs)
            );
        case 'adaptive_mode_changed':
            return typeof v.enabled === 'boolean' && (v.source === 'settings' || v.source === 'onboarding');
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
