import { defineStore } from 'pinia';
import { computed, ref } from 'vue';

export const SimplificationLevels = ['Easy', 'Moderate', 'Challenging'] as const;
export type SimplificationLevel = (typeof SimplificationLevels)[number];

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

export const VideoProviders = ['D-ID', 'Simli'] as const;
export type VideoProvider = (typeof VideoProviders)[number];

function isVideoProvider(value: unknown): value is VideoProvider {
    return VideoProviders.includes(value as VideoProvider);
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
    textSize: TextSize;
    internetSpeed: InternetSpeed;
    voiceOption: VoiceOption;
    videoProvider: VideoProvider;
    emoji: boolean;
    hasCompletedOnboarding: boolean;
    preferredFormFactors: FormFactor[];
};

const detectedInternetSpeed = detectInternetSpeed();

const defaultSettings: SettingsState = {
    simplificationLevel: 'Easy',
    summaryLength: 'Medium',
    textSize: 'Medium',
    internetSpeed: detectedInternetSpeed,
    voiceOption: detectVoiceOption(detectedInternetSpeed),
    videoProvider: 'D-ID',
    emoji: true,
    hasCompletedOnboarding: false,
    preferredFormFactors: [],
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

            if (isSummaryLength(result.settings?.summaryLength)) {
                settings.value.summaryLength = result.settings.summaryLength;
            }

            if (isTextSize(result.settings?.textSize)) {
                settings.value.textSize = result.settings.textSize;
            }

            if (isInternetSpeed(result.settings?.internetSpeed)) {
                settings.value.internetSpeed = result.settings.internetSpeed;
            }

            if (isVoiceOption(result.settings?.voiceOption)) {
                settings.value.voiceOption = result.settings.voiceOption;
            }

            if (isVideoProvider(result.settings?.videoProvider)) {
                settings.value.videoProvider = result.settings.videoProvider;
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
