<template>
    <div class="flex h-full flex-col">
        <!-- Compact article card -->
        <div class="px-4 pt-4 pb-5">
            <h2 class="mb-2 text-lg font-bold leading-tight tracking-tight text-purple">
                What You're Learning About
            </h2>
            <CompactArticleCard
                v-if="currentItem"
                :image="currentItem.image"
                :title="currentItem.aiTitle || currentItem.name"
            />
        </div>

        <!-- Listen heading row -->
        <div class="flex items-center justify-between px-4 pb-3">
            <div class="flex items-center gap-1.5">
                <img :src="earSoundIcon" alt="" class="size-5" />
                <span class="text-lg font-bold leading-tight tracking-tight text-purple">Listen</span>
            </div>
        </div>

        <!-- Content card -->
        <div class="mx-4 mb-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-[0.5px] border-card-border bg-white">
            <!-- Audio player bar (only visible once audio is generated/cached) -->
            <div v-if="hasAudio" class="shrink-0 rounded-t-xl bg-purple px-4 py-3">
                <div class="flex items-center gap-3">
                    <!-- Play/Pause button -->
                    <button
                        class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white"
                        @click="togglePlayPause"
                    >
                        <Pause v-if="isPlaying" class="size-5 text-purple" />
                        <Play v-else class="size-5 text-purple" />
                    </button>

                    <!-- Progress bar -->
                    <div class="flex-1">
                        <div
                            class="relative h-1.5 cursor-pointer rounded-full bg-white/30"
                            @click="onProgressClick"
                        >
                            <div
                                class="h-full rounded-full bg-white transition-[width] duration-100"
                                :style="{ width: progress + '%' }"
                            />
                            <div
                                class="absolute top-1/2 size-3 -translate-y-1/2 rounded-full bg-white shadow"
                                :style="{ left: progress + '%' }"
                            />
                        </div>
                    </div>

                    <!-- Time -->
                    <span class="shrink-0 text-xs text-white/70">{{ formatTime(currentTime) }} / {{ formatTime(duration) }}</span>

                    <!-- Speed -->
                    <button
                        class="shrink-0 cursor-pointer rounded-full bg-white/20 px-2 py-1 text-xs font-bold text-white"
                        @click="cycleSpeed"
                        :aria-label="`Playback speed ${speed} times. Tap to change.`"
                    >
                        {{ speed }}×
                    </button>
                </div>
            </div>

            <!-- Scrollable body -->
            <div ref="scrollContainer" class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <!-- Generating -->
                <div v-if="isGenerating" class="flex flex-col items-center justify-center gap-3 p-8 text-center">
                    <Loader2 class="size-8 animate-spin text-purple" />
                    <p class="text-sm font-medium text-purple">Generating audio...</p>
                    <p class="text-sm text-gray-400">This may take up to 30 seconds</p>
                </div>

                <!-- Word-highlighted text (audio ready) -->
                <div v-else-if="words.length > 0">
                    <p
                        v-for="(para, pIdx) in paragraphs"
                        :key="pIdx"
                        class="mb-4 flex flex-wrap rounded-md px-2 py-1 leading-relaxed transition-colors duration-200"
                        :class="currentParagraphIndex === pIdx ? 'bg-purple-light/40' : ''"
                    >
                        <span
                            v-for="word in para"
                            :key="word.index"
                            :ref="el => { if (el) wordRefs[word.index] = el as HTMLElement }"
                            class="mr-[0.3em] rounded px-0.5 text-xl transition-colors duration-100"
                            :class="word.index === currentWordIndex ? 'bg-purple-light' : ''"
                        >{{ word.text }}</span>
                    </p>
                </div>

                <!-- Ready to listen (summary done, no cached audio, no generation in flight) -->
                <div v-else-if="summaryReady" class="flex flex-col items-center justify-center gap-4 p-6 text-center">
                    <div class="flex size-16 items-center justify-center rounded-full bg-purple-light">
                        <img :src="earSoundIcon" alt="" class="size-10" />
                    </div>
                    <div>
                        <p class="text-base font-bold text-black">Ready to generate audio</p>
                        <p class="mt-1 text-sm text-gray-500">Audio generation can take up to 30 seconds</p>
                    </div>
                    <p v-if="error" class="text-sm text-red-600">{{ error }}</p>
                    <button
                        class="cursor-pointer rounded-lg bg-purple px-6 py-2.5 text-sm font-bold text-white"
                        @click="startListening"
                    >
                        {{ error ? 'Try Again' : 'Generate Audio' }}
                    </button>
                </div>

                <!-- Waiting for summary -->
                <div v-else class="flex h-full flex-col items-center justify-center gap-3 p-8">
                    <Loader2 class="size-6 animate-spin text-purple" />
                    <span class="text-sm text-gray-500">Waiting for summary...</span>
                </div>
            </div>
        </div>

        <!-- Learn Another Way -->
        <div class="shrink-0 px-4 pb-3 pt-3">
            <LearnAnotherWay exclude="narrate" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import CompactArticleCard from '@/components/CompactArticleCard.vue';
import LearnAnotherWay from '@/components/LearnAnotherWay.vue';
import { useListenPlayer } from '@/composables/useListenPlayer';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { Loader2, Pause, Play } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, reactive, ref, watch } from 'vue';

import earSoundIcon from '@/../icons/sidebar/ear-sound.svg';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const appState = useAppStateStore();

const currentItem = computed(() => historyItems.value[0] ?? null);

const {
    isGenerating,
    isPlaying,
    isPaused,
    hasAudio,
    error,
    currentTime,
    duration,
    progress,
    currentWordIndex,
    words,
    speed,
    generate,
    tryRestore,
    play,
    pause,
    seekTo,
    setSpeed,
    formatTime,
} = useListenPlayer();

const SPEED_OPTIONS = [0.75, 1, 1.25, 1.5, 2];

function cycleSpeed() {
    const currentIdx = SPEED_OPTIONS.indexOf(speed.value);
    const nextIdx = currentIdx === -1 ? 1 : (currentIdx + 1) % SPEED_OPTIONS.length;
    setSpeed(SPEED_OPTIONS[nextIdx]);
}

const currentParagraphIndex = computed(() => {
    if (currentWordIndex.value < 0) return -1;
    for (let i = 0; i < paragraphs.value.length; i++) {
        const para = paragraphs.value[i];
        if (para.length === 0) continue;
        const firstIdx = para[0].index;
        const lastIdx = para[para.length - 1].index;
        if (currentWordIndex.value >= firstIdx && currentWordIndex.value <= lastIdx) {
            return i;
        }
    }
    return -1;
});

const scrollContainer = ref<HTMLElement | null>(null);
const wordRefs = reactive<Record<number, HTMLElement>>({});

// Parse words into paragraphs for display
const paragraphs = computed(() => {
    if (words.value.length === 0) return [];

    const text = currentItem.value?.simplifiedContent ?? '';
    const stripped = stripMarkdownForDisplay(text);
    const paras = stripped.split(/\n\s*\n/).filter(p => p.trim());

    const result: { text: string; index: number }[][] = [];
    let globalIndex = 0;

    for (const para of paras) {
        const paraWords = para.split(/\s+/).filter(w => w.length > 0);
        const paraResult: { text: string; index: number }[] = [];
        for (const w of paraWords) {
            if (globalIndex < words.value.length) {
                paraResult.push({ text: words.value[globalIndex], index: globalIndex });
                globalIndex++;
            }
        }
        if (paraResult.length > 0) {
            result.push(paraResult);
        }
    }

    // If there are remaining words (paragraph split mismatch), add them as a final paragraph
    if (globalIndex < words.value.length) {
        const remaining: { text: string; index: number }[] = [];
        while (globalIndex < words.value.length) {
            remaining.push({ text: words.value[globalIndex], index: globalIndex });
            globalIndex++;
        }
        result.push(remaining);
    }

    return result;
});

function stripMarkdownForDisplay(text: string): string {
    let t = text;
    t = t.replace(/^#{1,6}\s*/gm, '');
    t = t.replace(/\*\*(.+?)\*\*/gs, '$1');
    t = t.replace(/__(.+?)__/gs, '$1');
    t = t.replace(/\*(.+?)\*/gs, '$1');
    t = t.replace(/_(.+?)_/gs, '$1');
    t = t.replace(/`(.+?)`/g, '$1');
    t = t.replace(/\[(.+?)\]\(.+?\)/g, '$1');
    t = t.replace(/^[\*\-\+]\s+/gm, '');
    t = t.replace(/^\d+\.\s+/gm, '');
    // Mirror the backend's emoji strip in stripMarkdown() so the on-screen
    // Listen words align with the words the TTS actually spoke.
    t = t.replace(/\p{Extended_Pictographic}/gu, '');
    return t;
}

function togglePlayPause() {
    if (isPlaying.value) {
        pause();
    } else {
        play();
    }
}

function onProgressClick(e: MouseEvent) {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const fraction = (e.clientX - rect.left) / rect.width;
    seekTo(Math.max(0, Math.min(1, fraction)));
}

const summaryReady = computed(() =>
    !!currentItem.value?.simplifiedContent &&
    !currentItem.value?.isFetching &&
    !currentItem.value?.isStreaming
);

function startListening() {
    if (summaryReady.value) {
        generate(currentItem.value!.simplifiedContent, currentItem.value!.url);
    }
}

// Auto-scroll to keep highlighted word visible
watch(currentWordIndex, (idx) => {
    if (idx < 0 || !wordRefs[idx] || !scrollContainer.value) return;

    const wordEl = wordRefs[idx];
    const container = scrollContainer.value;
    const wordRect = wordEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    if (wordRect.bottom > containerRect.bottom - 20 || wordRect.top < containerRect.top + 20) {
        wordEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
});

// On mount, try to restore cached audio (instant if available, no API call).
// If no cache, the user lands on the "Ready to listen" state and clicks
// Generate Audio to start TTS. This matches the Watch pane's click-to-generate
// pattern (Round 1 testing feedback #1: audio should mirror video's explicit
// generate flow + wait-time messaging).
onMounted(() => {
    const url = currentItem.value?.url;
    if (url) {
        tryRestore(url);
    }
});
</script>
