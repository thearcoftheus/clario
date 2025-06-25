import { defineStore } from 'pinia';
import { ref } from 'vue';

export const SimplificationLevels = ['Grade 2-3', 'Grade 4-5'] as const;

export type SimplificationLevel = (typeof SimplificationLevels)[number];

export type SettingsState = {
    simplificationLevel: SimplificationLevel;
};

const defaultSettings: SettingsState = {
    simplificationLevel: 'Grade 2-3',
} as const;

export const useSettingsStore = defineStore('settings', () => {
    const settings = ref<SettingsState>(defaultSettings);

    chrome.storage.local.get('settings', result => {
        Object.keys(result.settings).forEach(key => {
            if (!(key in settings.value)) return;
            if (!result.settings[key]) return;
            settings.value[key as keyof SettingsState] = result.settings[key];
        });
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
