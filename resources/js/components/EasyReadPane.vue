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

        <!-- Simple Read heading row -->
        <div class="flex items-center justify-between px-4 pb-3">
            <div class="flex items-center gap-1.5">
                <img :src="bookIcon" alt="" class="size-5" />
                <span class="text-lg font-bold leading-tight tracking-tight text-purple">Simple Read</span>
            </div>
        </div>

        <!-- Content card with pagination -->
        <div class="mx-4 mb-5 flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border-[0.5px] border-card-border bg-white">
            <!-- Loading state -->
            <div v-if="isLoading" class="flex flex-1 items-center justify-center">
                <Loader2 class="size-6 animate-spin text-purple" />
            </div>

            <!-- Paginated content -->
            <template v-else>
                <div class="min-h-0 flex-1 overflow-hidden px-4 pt-4 pb-1">
                    <div
                        ref="contentContainer"
                        class="h-full overflow-hidden"
                        style="column-fill: auto; column-gap: 2rem"
                    >
                        <div :style="{ transform: `translateX(${translateX})`, transition: 'transform 0.3s ease' }">
                            <Markdown :content="currentItem?.simplifiedContent ?? ''" :class="textSizeClass" />
                        </div>
                    </div>
                </div>

                <!-- Pagination bar -->
                <div class="flex shrink-0 items-center justify-between border-t border-gray-200 px-3 py-2">
                    <button
                        class="flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-300"
                        :class="{ 'opacity-30': currentPage <= 1 }"
                        :disabled="currentPage <= 1"
                        @click="prevPage"
                    >
                        <ChevronLeft class="size-3.5 text-purple" />
                    </button>
                    <button
                        v-if="currentPage > 1"
                        class="cursor-pointer text-sm font-bold text-purple hover:underline"
                        @click="prevPage"
                    >
                        Back
                    </button>
                    <span v-else class="text-sm font-bold text-gray-300">Back</span>
                    <button
                        v-if="currentPage < totalPages"
                        class="cursor-pointer text-sm font-bold text-purple hover:underline"
                        @click="nextPage"
                    >
                        Continue Reading
                    </button>
                    <span v-else class="text-sm font-bold text-gray-300">Continue Reading</span>
                    <button
                        class="flex size-6 cursor-pointer items-center justify-center rounded-full border border-gray-300"
                        :class="{ 'opacity-30': currentPage >= totalPages }"
                        :disabled="currentPage >= totalPages"
                        @click="nextPage"
                    >
                        <ChevronRight class="size-3.5 text-purple" />
                    </button>
                </div>

                <!-- Progress bar (no numbers — just a felt sense of progress) -->
                <div class="h-1 shrink-0 bg-gray-100">
                    <div
                        class="h-full bg-purple transition-[width] duration-300 ease-out"
                        :style="{ width: progressPercent + '%' }"
                    />
                </div>
            </template>
        </div>

        <!-- Learn Another Way -->
        <div class="shrink-0 px-4 pb-3 pt-3">
            <LearnAnotherWay exclude="summary" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import CompactArticleCard from '@/components/CompactArticleCard.vue';
import LearnAnotherWay from '@/components/LearnAnotherWay.vue';
import Markdown from '@/components/Markdown.vue';
import { useContentPagination } from '@/composables/useContentPagination';
import { useNavigation } from '@/composables/useNavigation';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

import bookIcon from '@/../icons/sidebar/book.svg';

const nav = useNavigation();

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const appState = useAppStateStore();
const { isExtractingContent, settings } = storeToRefs(appState);

const textSizeClass = computed(() => `size-${settings.value.textSize.toLowerCase()}`);

const currentItem = computed(() => historyItems.value[0] ?? null);

const isLoading = computed(() => {
    return isExtractingContent.value || (currentItem.value?.isFetching && !currentItem.value?.simplifiedContent);
});

const contentContainer = ref<HTMLElement | null>(null);

const simplifiedContentRef = computed(() => currentItem.value?.simplifiedContent ?? '');

const { currentPage, totalPages, nextPage, prevPage, translateX } = useContentPagination(
    contentContainer,
    simplifiedContentRef,
);

const progressPercent = computed(() => {
    if (totalPages.value === 0) return 0;
    // While the summary is still streaming, totalPages keeps growing as new
    // pages are appended — which makes the fill width oscillate alarmingly.
    // Hold the fill at 0 until streaming completes; the gray track stays
    // visible for visual consistency, and the fill animates in smoothly
    // once the denominator stabilizes.
    if (currentItem.value?.isStreaming || currentItem.value?.isFetching) return 0;
    return (currentPage.value / totalPages.value) * 100;
});
</script>
