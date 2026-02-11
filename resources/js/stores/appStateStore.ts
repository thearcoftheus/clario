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

export const InternetSpeeds = ['Slow', 'Medium', 'Fast'] as const;
export type InternetSpeed = (typeof InternetSpeeds)[number];

function isInternetSpeed(value: unknown): value is InternetSpeed {
    return InternetSpeeds.includes(value as InternetSpeed);
}

export const VoiceOptions = ['Basic', 'Advanced'] as const;
export type VoiceOption = (typeof VoiceOptions)[number];

function isVoiceOption(value: unknown): value is VoiceOption {
    return VoiceOptions.includes(value as VoiceOption);
}

function detectInternetSpeed(): InternetSpeed {
    const connection = (navigator as any).connection;
    if (!connection || typeof connection.downlink !== 'number') {
        return 'Medium'; // Default if API unavailable
    }

    const downlink = connection.downlink;
    if (downlink < 2) {
        return 'Slow';
    } else if (downlink <= 6) {
        return 'Medium';
    } else {
        return 'Fast';
    }
}

function detectVoiceOption(internetSpeed: InternetSpeed): VoiceOption {
    return internetSpeed === 'Fast' ? 'Advanced' : 'Basic';
}

export type SettingsState = {
    simplificationLevel: SimplificationLevel;
    summaryLength: SummaryLength;
    internetSpeed: InternetSpeed;
    voiceOption: VoiceOption;
    emoji: boolean;
};

const detectedInternetSpeed = detectInternetSpeed();

const defaultSettings: SettingsState = {
    simplificationLevel: 'Easy',
    summaryLength: 'Medium',
    internetSpeed: detectedInternetSpeed,
    voiceOption: detectVoiceOption(detectedInternetSpeed),
    emoji: true,
};

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

            if (isInternetSpeed(result.settings?.internetSpeed)) {
                settings.value.internetSpeed = result.settings.internetSpeed;
            }

            if (isVoiceOption(result.settings?.voiceOption)) {
                settings.value.voiceOption = result.settings.voiceOption;
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
