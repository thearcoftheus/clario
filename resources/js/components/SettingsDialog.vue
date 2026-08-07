<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-h-[85vh] flex flex-col bg-white border-card-border !rounded-xl !p-0 !gap-0">
            <!-- Header: title (left) + Save and Close button (right) -->
            <div class="flex items-center justify-between px-5 pt-4 pb-2">
                <div class="flex items-center gap-2">
                    <img :src="settingsIcon" alt="" class="size-5" />
                    <span class="text-lg font-bold text-purple">Reading Settings</span>
                </div>
                <button
                    type="button"
                    class="cursor-pointer rounded-lg bg-purple px-4 py-2 text-sm font-bold text-white"
                    @click="onSave"
                >
                    Save and Close
                </button>
            </div>

            <!-- Body -->
            <div class="space-y-6 overflow-y-auto px-5 py-5">
                <!-- Your Preferred Reading Style -->
                <section>
                    <div class="mb-3 flex items-center gap-3">
                        <h3 class="shrink-0 text-base font-bold text-black">Your Preferred Reading Style</h3>
                        <div class="flex-1 border-t border-purple" />
                    </div>

                    <!-- Who chooses: manual (default) vs adaptive. Discrete tiles,
                         not a switch, to match the pane's control pattern. -->
                    <div class="mb-3 flex gap-2">
                        <button
                            v-for="mode in adaptiveModeOrder"
                            :key="String(mode.value)"
                            type="button"
                            class="flex-1 cursor-pointer rounded-md px-3 py-3 text-sm font-bold text-black transition-colors"
                            :class="formValues.adaptiveDifficulty === mode.value
                                ? 'border-[3px] border-purple bg-purple-light'
                                : 'border border-purple bg-sidebar-bg'"
                            @click="formValues.adaptiveDifficulty = mode.value"
                        >
                            {{ mode.label }}
                        </button>
                    </div>

                    <!-- Grouped panel: everything below is governed by the mode
                         chosen above. Unselected tiles go bg-white in here (not
                         bg-sidebar-bg) so they read against the tinted panel. -->
                    <div class="rounded-lg bg-sidebar-bg p-3">
                        <p v-if="formValues.adaptiveDifficulty" class="mb-3 text-sm leading-snug text-black">
                            Clario will pick the reading style that fits you best, using the private notes on this
                            device about how you read. You can switch back to choosing it yourself at any time.
                        </p>
                        <p v-else class="mb-3 text-sm leading-snug text-black">
                            Pick the reading style you like best:
                        </p>

                        <div class="flex flex-col gap-3" :class="formValues.adaptiveDifficulty ? 'pointer-events-none opacity-40' : ''" :aria-disabled="formValues.adaptiveDifficulty">
                            <button
                                v-for="level in simplificationLevelOrder"
                                :key="level.value"
                                type="button"
                                class="flex w-full cursor-pointer items-center gap-3 text-left"
                                :disabled="formValues.adaptiveDifficulty"
                                @click="formValues.simplificationLevel = level.value"
                            >
                                <div
                                    class="flex w-32 shrink-0 items-center justify-center rounded-md px-3 py-3 text-sm font-bold text-black transition-colors"
                                    :class="formValues.simplificationLevel === level.value
                                        ? 'border-[3px] border-purple bg-purple-light'
                                        : 'border border-purple bg-white'"
                                >
                                    {{ SimplificationLevelDisplayLabels[level.value] }}
                                </div>
                                <p class="flex-1 text-sm leading-snug text-black">{{ level.description }}</p>
                            </button>
                        </div>
                    </div>
                </section>

                <!-- Article Length -->
                <section>
                    <div class="mb-3 flex items-center gap-3">
                        <h3 class="shrink-0 text-base font-bold text-black">Article Length</h3>
                        <div class="flex-1 border-t border-purple" />
                    </div>
                    <div class="flex gap-2">
                        <button
                            v-for="length in summaryLengthOrder"
                            :key="length.value"
                            type="button"
                            class="flex-1 cursor-pointer rounded-md px-3 py-3 text-sm font-bold text-black transition-colors"
                            :class="formValues.summaryLength === length.value
                                ? 'border-[3px] border-purple bg-purple-light'
                                : 'border border-purple bg-sidebar-bg'"
                            @click="formValues.summaryLength = length.value"
                        >
                            {{ length.label }}
                        </button>
                    </div>
                </section>

                <!-- Text Size -->
                <section>
                    <div class="mb-3 flex items-center gap-3">
                        <h3 class="shrink-0 text-base font-bold text-black">Text Size</h3>
                        <div class="flex-1 border-t border-purple" />
                    </div>
                    <div class="flex gap-2">
                        <button
                            v-for="size in textSizeOrder"
                            :key="size.value"
                            type="button"
                            class="flex flex-1 cursor-pointer items-center justify-center rounded-md py-3 font-bold text-black transition-colors"
                            :class="[
                                formValues.textSize === size.value
                                    ? 'border-[3px] border-purple bg-purple-light'
                                    : 'border border-purple bg-sidebar-bg',
                                size.aaClass,
                            ]"
                            @click="formValues.textSize = size.value"
                        >
                            Aa
                        </button>
                    </div>
                </section>

                <!-- Privacy -->
                <section>
                    <div class="mb-3 flex items-center gap-3">
                        <h3 class="shrink-0 text-base font-bold text-black">Privacy</h3>
                        <div class="flex-1 border-t border-purple" />
                    </div>
                    <p class="mb-3 text-sm leading-snug text-black">
                        Clario keeps private notes on this device about how you use it, to make Clario work better
                        for you. These notes stay on your device and are never shared with anyone else.
                    </p>
                    <button
                        type="button"
                        class="cursor-pointer rounded-md border border-purple bg-sidebar-bg px-3 py-3 text-sm font-bold text-black transition-colors hover:bg-purple-light"
                        @click="onClearBehaviorHistory"
                    >
                        Clear behavior history
                    </button>
                </section>
            </div>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { Dialog, DialogContent } from '@/components/ui/dialog';
import {
    SimplificationLevelDisplayLabels,
    useAppStateStore,
    type SettingsState,
    type SimplificationLevel,
    type SummaryLength,
    type TextSize,
} from '@/stores/appStateStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { useHistoryStore } from '@/stores/historyStore';
import { CircleCheck } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { h, ref } from 'vue';
import { toast } from 'vue-sonner';

import settingsIcon from '@/../icons/sidebar/settings.svg';

const isOpen = ref(false);

const appState = useAppStateStore();
const { settings } = storeToRefs(appState);

const feedbackStore = useFeedbackStore();
const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

// Working copy used by the form. Refreshed from the canonical settings each
// time the dialog opens so any external updates (e.g. from onboarding) are
// reflected. Direct user edits to the toggle buttons mutate this copy only;
// nothing persists until Save and Close.
const formValues = ref<SettingsState>({ ...settings.value });

defineExpose({
    open: () => {
        formValues.value = { ...settings.value };
        isOpen.value = true;
    },
});

// Reading-level options. The label-mapping (Easy → 'Easy Read', etc.) lives
// in appStateStore so it's shared with the Read pane heading; descriptions
// stay local since they're only shown here. Order is the display order
// (top to bottom).
const simplificationLevelOrder: { value: SimplificationLevel; description: string }[] = [
    {
        value: 'Easy',
        description: 'A simplified format, using one idea per sentence and short familiar words.',
    },
    {
        value: 'Moderate',
        description: 'Clear, well-structured writing that puts key information first and avoids jargon.',
    },
    {
        value: 'Challenging',
        description: 'Ordinary text written at a typical adult reading level.',
    },
];

// "Adaptive Difficulty" internally; the user-facing labels avoid that jargon
// and describe the outcome, per the discrete-tile convention above. UX-only
// for now — nothing consumes the flag yet (see appStateStore.SettingsState).
const adaptiveModeOrder: { value: boolean; label: string }[] = [
    { value: false, label: 'I choose it' },
    { value: true, label: 'Clario picks for me' },
];

const summaryLengthOrder: { value: SummaryLength; label: string }[] = [
    { value: 'Short', label: 'Short' },
    { value: 'Medium', label: 'Standard' },
    { value: 'Long', label: 'Detailed' },
];

// Text size uses an "Aa" glyph at increasing sizes per the Figma; the visual
// size of the glyph itself doubles as the preview of what the setting does.
const textSizeOrder: { value: TextSize; aaClass: string }[] = [
    { value: 'Small', aaClass: 'text-base' },
    { value: 'Medium', aaClass: 'text-2xl' },
    { value: 'Large', aaClass: 'text-3xl' },
];

function onSave() {
    // Telemetry (level_switch, local-only): recorded at the call site rather
    // than inside updateSettings() because feedbackStore imports from
    // appStateStore — recording there would create a module cycle.
    if (formValues.value.simplificationLevel !== settings.value.simplificationLevel) {
        const currentArticle = historyItems.value[0] ?? null;
        feedbackStore.recordEvent({
            type: 'level_switch',
            timestamp: Date.now(),
            fromLevel: settings.value.simplificationLevel,
            toLevel: formValues.value.simplificationLevel,
            source: 'settings',
            articleUrl: currentArticle?.url ?? null,
            articleTitle: currentArticle ? currentArticle.aiTitle || currentArticle.name : null,
        });
    }

    appState.updateSettings(formValues.value);
    isOpen.value = false;
    toast(
        h('div', { class: 'flex items-center gap-2 text-purple font-bold' }, [
            h(CircleCheck, { class: 'size-4' }),
            'Settings saved',
        ]),
    );
}

async function onClearBehaviorHistory() {
    await feedbackStore.clearAllEvents();
    toast(
        h('div', { class: 'flex items-center gap-2 text-purple font-bold' }, [
            h(CircleCheck, { class: 'size-4' }),
            'Behavior history cleared',
        ]),
    );
}
</script>
