import { defineStore } from 'pinia';
import { ref } from 'vue';

export const SimplificationLevels = ['Grade 2-3', 'Grade 4-5'] as const;

export type SimplificationLevel = (typeof SimplificationLevels)[number];

export type SettingsState = {
    simplificationLevel: SimplificationLevel;
    emoji: boolean;
};

const defaultSettings: SettingsState = {
    simplificationLevel: 'Grade 2-3',
    emoji: true,
} as const;

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<SettingsState>(defaultSettings);

    chrome.storage.local.get('settings', result => {
        if (result.settings) {
            Object.entries(result.settings).forEach(([key, value]) => {
                const settingKey = key as keyof SettingsState;
                if (settingKey in settings.value && value !== undefined) {
                    // Use type assertion to bypass the type error
                    (settings.value as any)[settingKey] = value;
                }
            });
        }
    });

    function updateSettings(newSettings: Partial<SettingsState>) {
        settings.value = {
            ...settings.value,
            ...newSettings,
        };

        chrome.storage.local.set({ settings: settings.value });
    }

    return {
        settings,
        updateSettings,
    };
});
