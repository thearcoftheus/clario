<template>
    <Dialog v-model:open="isOpen">
        <DialogTrigger as-child>
            <Button variant="ghost" size="icon" class="h-8 w-8">
                <Settings class="h-5 w-5" />
            </Button>
        </DialogTrigger>
        <DialogContent class="max-h-[85vh] flex flex-col">
            <DialogHeader>
                <DialogTitle>Settings</DialogTitle>
            </DialogHeader>

            <form @submit.prevent="onSubmit" class="flex flex-col overflow-hidden">
                <div class="space-y-10 py-4 overflow-y-auto flex-1 pr-2">
                    <div class="grid gap-3">
                        <Label for="simplificationLevel">Reading level</Label>
                        <Slider v-model="simplificationLevel" :min="0" :max="SimplificationLevels.length - 1" :step="1" id="simplificationLevel" />
                        <div class="text-muted-foreground flex justify-between">
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

                    <div class="grid gap-3">
                        <Label for="summaryLength">Summary length</Label>
                        <Slider v-model="summaryLength" :min="0" :max="SummaryLengths.length - 1" :step="1" id="summaryLength" />
                        <div class="text-muted-foreground flex justify-between">
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

                    <div class="grid gap-3">
                        <Label for="internetSpeed">Internet speed</Label>
                        <Slider v-model="internetSpeed" :min="0" :max="InternetSpeeds.length - 1" :step="1" id="internetSpeed" />
                        <div class="text-muted-foreground flex justify-between">
                            <div
                                v-for="(speed, i) in InternetSpeeds"
                                :key="speed"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : i == InternetSpeeds.length - 1 ? 'text-right' : 'text-center'"
                            >
                                {{ speed }}
                            </div>
                        </div>
                        <div v-if="networkInfo" class="text-muted-foreground text-sm">
                            Detected: {{ networkInfo.downlink }} Mbps / {{ networkInfo.effectiveType }} effective type / {{ networkInfo.type }} connection type
                        </div>
                        <div v-else class="text-muted-foreground text-sm">
                            Detected: Network info unavailable
                        </div>
                    </div>

                    <div class="grid gap-3">
                        <Label for="voiceOption">Voice option</Label>
                        <Slider v-model="voiceOption" :min="0" :max="VoiceOptions.length - 1" :step="1" id="voiceOption" />
                        <div class="text-muted-foreground flex justify-between">
                            <div
                                v-for="(option, i) in VoiceOptions"
                                :key="option"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : 'text-right'"
                            >
                                {{ option }}
                            </div>
                        </div>
                    </div>

                    <div class="grid gap-3">
                        <Label for="videoProvider">Video avatar provider</Label>
                        <Slider v-model="videoProvider" :min="0" :max="VideoProviders.length - 1" :step="1" id="videoProvider" />
                        <div class="text-muted-foreground flex justify-between">
                            <div
                                v-for="(provider, i) in VideoProviders"
                                :key="provider"
                                class="flex-1"
                                :class="i == 0 ? 'text-left' : 'text-right'"
                            >
                                {{ provider }}
                            </div>
                        </div>
                    </div>

                    <div class="flex items-center space-x-2">
                        <Checkbox id="emoji" v-model="formValues.emoji" />
                        <Label for="emoji">Use emoji?</Label>
                    </div>
                </div>

                <DialogFooter class="mt-4">
                    <Button type="submit">Save changes</Button>
                </DialogFooter>
            </form>
        </DialogContent>
    </Dialog>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { InternetSpeeds, SimplificationLevels, SummaryLengths, VideoProviders, VoiceOptions, useAppStateStore } from '@/stores/appStateStore';
import { CircleCheck, Settings } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { h, onMounted, onUnmounted, ref, watch } from 'vue';
import { toast } from 'vue-sonner';

interface NetworkInfo {
    downlink: number;
    effectiveType: string;
    type: string;
}

const isOpen = ref(false);

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
    toast(h('div', { class: 'flex items-center gap-2' }, [h(CircleCheck), 'Settings saved successfully.']));
}
</script>
