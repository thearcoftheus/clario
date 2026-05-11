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
            <!-- Audio player bar -->
            <div class="shrink-0 rounded-t-xl bg-purple px-4 py-3">
                <div class="flex items-center gap-3">
                    <!-- Play/Pause button -->
                    <button
                        class="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-white"
                        :disabled="isGenerating || !hasAudio"
                        @click="togglePlayPause"
                    >
                        <Loader2 v-if="isGenerating && !hasAudio" class="size-5 animate-spin text-purple" />
                        <Pause v-else-if="isPlaying" class="size-5 text-purple" />
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
                    <span class="shrink-0 text-xs text-white/70">{{ formatTime(currentTime) }}</span>
                </div>
            </div>

            <!-- Scrollable text with word highlighting -->
            <div ref="scrollContainer" class="min-h-0 flex-1 overflow-y-auto px-4 py-4">
                <!-- Loading state -->
                <div v-if="isGenerating && words.length === 0" class="flex items-center justify-center py-8">
                    <Loader2 class="size-6 animate-spin text-purple" />
                    <span class="ml-2 text-sm text-gray-500">Generating audio...</span>
                </div>

                <!-- Word-highlighted text -->
                <div v-else-if="words.length > 0">
                    <p v-for="(para, pIdx) in paragraphs" :key="pIdx" class="mb-4 flex flex-wrap leading-relaxed">
                        <span
                            v-for="word in para"
                            :key="word.index"
                            :ref="el => { if (el) wordRefs[word.index] = el as HTMLElement }"
                            class="mr-[0.3em] rounded px-0.5 text-xl transition-colors duration-100"
                            :class="word.index === currentWordIndex ? 'bg-purple-light' : ''"
                        >{{ word.text }}</span>
                    </p>
                </div>

                <!-- Waiting for content -->
                <div v-else class="flex items-center justify-center py-8">
                    <Loader2 class="size-6 animate-spin text-purple" />
                    <span class="ml-2 text-sm text-gray-500">Waiting for summary...</span>
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
    generate,
    play,
    pause,
    seekTo,
    formatTime,
} = useListenPlayer();

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

function isSummaryReady() {
    return currentItem.value?.simplifiedContent &&
        !currentItem.value?.isFetching &&
        !currentItem.value?.isStreaming;
}

function startListening() {
    if (isSummaryReady()) {
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

// Auto-generate on mount (but don't auto-play — user must click play).
// If summary isn't ready yet, watch for it and generate when it arrives.
onMounted(() => {
    if (isSummaryReady()) {
        startListening();
    }
});

watch(
    () => currentItem.value?.isStreaming,
    (streaming, wasStreaming) => {
        if (wasStreaming && !streaming && !hasAudio.value && isSummaryReady()) {
            startListening();
        }
    },
);
</script>
