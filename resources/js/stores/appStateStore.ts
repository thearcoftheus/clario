import { defineStore } from 'pinia';
import { ref } from 'vue';

export const SimplificationLevels = ['Easy', 'Moderate', 'Challenging'] as const;
export type SimplificationLevel = (typeof SimplificationLevels)[number];

function isSimplficiationLevel(value: unknown): value is SimplificationLevel {
    return SimplificationLevels.includes(value as SimplificationLevel);
}

export const SummaryLengths = ['Short', 'Medium', 'Long'] as const;
export type SummaryLength = (typeof SummaryLengths)[number];

function isSummaryLength(value: unknown): value is SummaryLength {
    return SummaryLengths.includes(value as SummaryLength);
}

export type SettingsState = {
    simplificationLevel: SimplificationLevel;
    summaryLength: SummaryLength;
    emoji: boolean;
};

const defaultSettings: SettingsState = {
    simplificationLevel: 'Easy',
    summaryLength: 'Medium',
    emoji: true,
} as const;

export const useAppStateStore = defineStore('app', () => {
    const settings = ref<SettingsState>(defaultSettings);
    const isExtractingContent = ref(true);

    function loadSettingsFromStorage() {
        chrome.storage.local.get<{ settings?: Partial<SettingsState> }>('settings', result => {
            if (!result.settings) return;

            if (isSimplficiationLevel(result.settings?.simplificationLevel)) {
                settings.value.simplificationLevel = result.settings.simplificationLevel;
            }

            if (isSummaryLength(result.settings?.summaryLength)) {
                settings.value.summaryLength = result.settings.summaryLength;
            }

            if (typeof result.settings.emoji === 'boolean') {
                settings.value.emoji = result.settings.emoji;
            }
        });
    }

    loadSettingsFromStorage();

    function updateSettings(newSettings: Partial<SettingsState> = {}) {
        settings.value = {
            ...settings.value,
            ...newSettings,
        };

        chrome.storage.local.set({ settings: settings.value });
    }

    return {
        settings,
        isExtractingContent,
        updateSettings,
        loadSettingsFromStorage,
    };
});
