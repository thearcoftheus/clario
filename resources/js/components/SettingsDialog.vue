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

                    <!-- Internet Speed -->
                    <div class="rounded-xl border border-card-border bg-white p-4">
                        <label class="mb-3 block text-sm font-bold text-purple">Internet Speed</label>
                        <Slider v-model="internetSpeed" :min="0" :max="InternetSpeeds.length - 1" :step="1" />
                        <div class="mt-2 flex justify-between text-xs text-gray-500">
                            <div
                                v-for="(speed, i) in InternetSpeeds"
                                :key="speed"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == InternetSpeeds.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ speed }}
                            </div>
                        </div>
                        <p class="mt-2 text-xs text-gray-400">
                            <template v-if="networkInfo">
                                Detected: {{ networkInfo.downlink }} Mbps / {{ networkInfo.effectiveType }}
                            </template>
                            <template v-else>
                                Network info unavailable
                            </template>
                        </p>
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
import { InternetSpeeds, SimplificationLevels, SummaryLengths, TextSizes, VideoProviders, VoiceOptions, useAppStateStore } from '@/stores/appStateStore';
import { CircleCheck } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { h, onMounted, onUnmounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

import settingsIcon from '@/../icons/sidebar/settings.svg';

interface NetworkInfo {
    downlink: number;
    effectiveType: string;
    type: string;
}

const isOpen = ref(false);

defineExpose({ open: () => { isOpen.value = true; } });

const networkInfo = ref<NetworkInfo | null>(null);

function updateNetworkInfo() {
    const connection = (navigator as any).connection;
    if (connection) {
        networkInfo.value = {
            downlink: connection.downlink,
            effectiveType: connection.effectiveType,
            type: connection.type ?? 'unknown',
        };
    }
}

onMounted(() => {
    updateNetworkInfo();
    const connection = (navigator as any).connection;
    if (connection) {
        connection.addEventListener('change', updateNetworkInfo);
    }
});

onUnmounted(() => {
    const connection = (navigator as any).connection;
    if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
    }
});

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

const internetSpeed = ref([0]);

watch(
    () => settings.value.internetSpeed,
    () => {
        internetSpeed.value = [InternetSpeeds.indexOf(settings.value.internetSpeed)];
    },
    { immediate: true },
);

watch(internetSpeed, () => {
    formValues.value.internetSpeed = InternetSpeeds[internetSpeed.value[0]];
});

const voiceOption = ref([0]);

watch(
    () => settings.value.voiceOption,
    () => {
        voiceOption.value = [VoiceOptions.indexOf(settings.value.voiceOption)];
    },
    { immediate: true },
);

watch(voiceOption, () => {
    formValues.value.voiceOption = VoiceOptions[voiceOption.value[0]];
});

const videoProvider = ref([0]);

watch(
    () => settings.value.videoProvider,
    () => {
        videoProvider.value = [VideoProviders.indexOf(settings.value.videoProvider)];
    },
    { immediate: true },
);

watch(videoProvider, () => {
    formValues.value.videoProvider = VideoProviders[videoProvider.value[0]];
});

function onSubmit() {
    appState.updateSettings(formValues.value);
    isOpen.value = false;
    toast(h('div', { class: 'flex items-center gap-2 text-purple font-bold' }, [h(CircleCheck, { class: 'size-4' }), 'Settings saved']));
}
</script>
