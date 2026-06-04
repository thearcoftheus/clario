<template>
    <Dialog v-model:open="isOpen">
        <DialogContent class="max-h-[85vh] flex flex-col bg-sidebar-bg border-card-border !rounded-xl !p-0 !gap-0">
            <!-- Header -->
            <div class="flex items-center justify-between border-b border-card-border bg-white px-5 py-4 rounded-t-xl">
                <div class="flex items-center gap-2">
                    <img :src="settingsIcon" alt="" class="size-5" />
                    <span class="text-lg font-bold text-purple">Settings</span>
                </div>
            </div>

            <form @submit.prevent="onSubmit" class="flex flex-col overflow-hidden">
                <div class="space-y-6 overflow-y-auto flex-1 px-5 py-5">
                    <!-- Reading Level -->
                    <div class="rounded-xl border border-card-border bg-white p-4">
                        <label class="mb-3 block text-sm font-bold text-purple">Reading Level</label>
                        <Slider v-model="simplificationLevel" :min="0" :max="SimplificationLevels.length - 1" :step="1" />
                        <div class="mt-2 flex justify-between text-xs text-gray-500">
                            <div
                                v-for="(level, i) in SimplificationLevels"
                                :key="level"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == SimplificationLevels.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ level }}
                            </div>
                        </div>
                    </div>

                    <!-- Summary Length -->
                    <div class="rounded-xl border border-card-border bg-white p-4">
                        <label class="mb-3 block text-sm font-bold text-purple">Summary Length</label>
                        <Slider v-model="summaryLength" :min="0" :max="SummaryLengths.length - 1" :step="1" />
                        <div class="mt-2 flex justify-between text-xs text-gray-500">
                            <div
                                v-for="(length, i) in SummaryLengths"
                                :key="length"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == SummaryLengths.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ length }}
                            </div>
                        </div>
                    </div>

                    <!-- Text Size -->
                    <div class="rounded-xl border border-card-border bg-white p-4">
                        <label class="mb-3 block text-sm font-bold text-purple">Text Size</label>
                        <Slider v-model="textSize" :min="0" :max="TextSizes.length - 1" :step="1" />
                        <div class="mt-2 flex justify-between text-xs text-gray-500">
                            <div
                                v-for="(size, i) in TextSizes"
                                :key="size"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == TextSizes.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ size }}
                            </div>
                        </div>
                    </div>

                    <!-- Emoji Toggle -->
                    <div class="flex items-center gap-3 rounded-xl border border-card-border bg-white p-4">
                        <Checkbox id="emoji" v-model="formValues.emoji" />
                        <label for="emoji" class="text-sm font-bold text-purple">Use emoji in summaries</label>
                    </div>
                </div>

                <!-- Footer -->
                <div class="border-t border-card-border bg-white px-5 py-4 rounded-b-xl">
                    <button
                        type="submit"
                        class="w-full cursor-pointer rounded-xl bg-purple py-2.5 text-sm font-bold text-white"
                    >
                        Save Changes
                    </button>
                </div>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { SimplificationLevels, SummaryLengths, TextSizes, useAppStateStore } from '@/stores/appStateStore';
import { CircleCheck } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { h, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

import settingsIcon from '@/../icons/sidebar/settings.svg';

const isOpen = ref(false);

defineExpose({ open: () => { isOpen.value = true; } });

const appState = useAppStateStore();
const { settings } = storeToRefs(appState);

const formValues = ref(settings.value);

const simplificationLevel = ref([0]);

watch(
    () => settings.value.simplificationLevel,
    () => {
        simplificationLevel.value = [SimplificationLevels.indexOf(settings.value.simplificationLevel)];
    },
    { immediate: true },
);

watch(simplificationLevel, () => {
    formValues.value.simplificationLevel = SimplificationLevels[simplificationLevel.value[0]];
});

const summaryLength = ref([0]);

watch(
    () => settings.value.summaryLength,
    () => {
        summaryLength.value = [SummaryLengths.indexOf(settings.value.summaryLength)];
    },
    { immediate: true },
);

watch(summaryLength, () => {
    formValues.value.summaryLength = SummaryLengths[summaryLength.value[0]];
});

const textSize = ref([0]);

watch(
    () => settings.value.textSize,
    () => {
        textSize.value = [TextSizes.indexOf(settings.value.textSize)];
    },
    { immediate: true },
);

watch(textSize, () => {
    formValues.value.textSize = TextSizes[textSize.value[0]];
});

function onSubmit() {
    appState.updateSettings(formValues.value);
    isOpen.value = false;
    toast(h('div', { class: 'flex items-center gap-2 text-purple font-bold' }, [h(CircleCheck, { class: 'size-4' }), 'Settings saved']));
}
</script>
