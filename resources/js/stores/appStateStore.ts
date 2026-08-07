import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const SimplificationLevels = ['Easy', 'Moderate', 'Challenging'] as const;
export type SimplificationLevel = (typeof SimplificationLevels)[number];

// User-facing labels for each simplification level. The enum values stay
// `Easy / Moderate / Challenging` in storage and on the backend; only the UI
// surfaces these friendlier names. Centralised here so the SettingsDialog
// and the Read pane heading stay in sync.
export const SimplificationLevelDisplayLabels: Record<SimplificationLevel, string> = {
    Easy: 'Easy',
    Moderate: 'Simplified',
    Challenging: 'Detailed',
};

function isSimplficiationLevel(value: unknown): value is SimplificationLevel {
    return SimplificationLevels.includes(value as SimplificationLevel);
}

export const FormFactors = ['summary', 'narrate', 'avatar', 'chat'] as const;
export type FormFactor = (typeof FormFactors)[number];

function isFormFactor(value: unknown): value is FormFactor {
    return FormFactors.includes(value as FormFactor);
}

function isFormFactorArray(value: unknown): value is FormFactor[] {
    return Array.isArray(value) && value.every(isFormFactor);
}

export const SummaryLengths = ['Short', 'Medium', 'Long'] as const;
export type SummaryLength = (typeof SummaryLengths)[number];

function isSummaryLength(value: unknown): value is SummaryLength {
    return SummaryLengths.includes(value as SummaryLength);
}

export const TextSizes = ['Small', 'Medium', 'Large'] as const;
export type TextSize = (typeof TextSizes)[number];

function isTextSize(value: unknown): value is TextSize {
    return TextSizes.includes(value as TextSize);
}

export type SettingsState = {
    simplificationLevel: SimplificationLevel;
    // UX-only for now: when true, Clario will eventually set
    // simplificationLevel automatically from the local behavior log (the
    // Phase A2 suggestion engine — see docs/Context_Agent_Phase_A_Event_Schema.md).
    // Nothing reads this flag yet; simplificationLevel remains authoritative.
    adaptiveDifficulty: boolean;
    summaryLength: SummaryLength;
    textSize: TextSize;
    emoji: boolean;
    hasCompletedOnboarding: boolean;
    preferredFormFactors: FormFactor[];
    playbackSpeed: number;
};

function isPlaybackSpeed(value: unknown): value is number {
    return typeof value === 'number' && value >= 0.5 && value <= 2;
}

const defaultSettings: SettingsState = {
    simplificationLevel: 'Easy',
    adaptiveDifficulty: false,
    summaryLength: 'Medium',
    textSize: 'Medium',
    emoji: false,
    hasCompletedOnboarding: false,
    preferredFormFactors: [],
    playbackSpeed: 1,
};

export const useAppStateStore = defineStore('app', () => {
    const settings = ref<SettingsState>(defaultSettings);
    const isExtractingContent = ref(true);
    const isLoadingSettings = ref(true);

    function loadSettingsFromStorage() {
        chrome.storage.local.get<{ settings?: Partial<SettingsState> }>('settings', result => {
            if (chrome.runtime.lastError) {
                isLoadingSettings.value = false;
                return;
            }

            if (!result.settings) {
                isLoadingSettings.value = false;
                return;
            }

            if (isSimplficiationLevel(result.settings?.simplificationLevel)) {
                settings.value.simplificationLevel = result.settings.simplificationLevel;
            }

            if (typeof result.settings.adaptiveDifficulty === 'boolean') {
                settings.value.adaptiveDifficulty = result.settings.adaptiveDifficulty;
            }

            if (isSummaryLength(result.settings?.summaryLength)) {
                settings.value.summaryLength = result.settings.summaryLength;
            }

            if (isTextSize(result.settings?.textSize)) {
                settings.value.textSize = result.settings.textSize;
            }

            if (typeof result.settings.emoji === 'boolean') {
                settings.value.emoji = result.settings.emoji;
            }

            if (typeof result.settings.hasCompletedOnboarding === 'boolean') {
                settings.value.hasCompletedOnboarding = result.settings.hasCompletedOnboarding;
            }

            if (isFormFactorArray(result.settings.preferredFormFactors)) {
                settings.value.preferredFormFactors = result.settings.preferredFormFactors;
            }

            if (isPlaybackSpeed(result.settings.playbackSpeed)) {
                settings.value.playbackSpeed = result.settings.playbackSpeed;
            }

            isLoadingSettings.value = false;
        });
    }

    loadSettingsFromStorage();

    function updateSettings(newSettings: Partial<SettingsState> = {}): Promise<void> {
        settings.value = {
            ...settings.value,
            ...newSettings,
        };

        // Deep-clone to plain JSON before persisting: Vue 3.5's reactive array
        // Proxies don't always structured-clone cleanly into chrome.storage,
        // which silently drops nested arrays like preferredFormFactors.
        return chrome.storage.local.set({ settings: JSON.parse(JSON.stringify(settings.value)) });
    }

    // Drives "Recommended for you" badges on the home screen. If the user
    // skipped Q2 of onboarding, this is empty and no card shows a badge.
    const recommendedFormFactors = computed<FormFactor[]>(() => settings.value.preferredFormFactors);

    return {
        settings,
        isExtractingContent,
        isLoadingSettings,
        recommendedFormFactors,
        updateSettings,
        loadSettingsFromStorage,
    };
});
