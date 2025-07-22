<template>
    <div class="p-2">
        <div class="bg-background border-border rounded-md border p-3 shadow-md/25">
            <div class="flex items-center gap-2">
                <span class="mr-2 text-xl font-bold">Clario</span>
                <div class="flex items-center gap-2">
                    Content reading level
                    <div
                        v-if="loadingReadingLevel"
                        class="size-4 animate-spin rounded-full border-2 border-solid border-black border-t-transparent"
                    />
                    <span v-else-if="readability" class="rounded-xs p-2 font-bold" :class="color">
                        {{ readingLevel }}
                    </span>
                </div>
                <Button
                    variant="ghost"
                    @click="toggleOverview"
                    :aria-expanded="showOverview"
                    aria-controls="overview"
                    aria-label="Toggle overview panel"
                >
                    <div v-if="loadingOverview" class="size-4 animate-spin rounded-full border-2 border-solid border-black border-t-transparent" />
                    <ChevronDown v-else-if="!showOverview" class="size-6" />
                    <ChevronUp v-else class="size-6" />
                </Button>
            </div>
            <div id="overview" class="bg-accent mt-3 rounded-sm border px-2 py-4 contain-inline-size" :class="{ hidden: !showOverview }">
                <BasicMarkdown :content="overview" />
                <div class="mt-6 text-center">
                    <Button @click="openSidebar">
                        Full overview
                        <PanelRight class="size-4" />
                    </Button>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import BasicMarkdown from '@/components/BasicMarkdown.vue';
import { Button } from '@/components/ui/button';
import chromeMessage from '@/helpers/chromeMessage';
import extractMainContent from '@/helpers/extractContent';
import { FleschKincaidReadability } from '@/types/types';
import { ChevronDown, ChevronUp, PanelRight } from 'lucide-vue-next';
import { computed, ref } from 'vue';

type ReadingLevel = 'Easy' | 'Moderate' | 'Challenging' | 'Advanced';

const loadingReadingLevel = ref(true);
const readability = ref<FleschKincaidReadability>();
const readingLevel = computed<ReadingLevel | undefined>(() => {
    if (!readability.value) return;
    if (readability.value.grade <= 5) return 'Easy';
    if (readability.value.grade <= 8) return 'Moderate';
    if (readability.value.grade <= 12) return 'Challenging';
    return 'Advanced';
});
const color = computed(() => {
    if (readingLevel.value === 'Easy') return 'bg-green-200';
    if (readingLevel.value === 'Moderate') return 'bg-yellow-200';
    if (readingLevel.value === 'Challenging') return 'bg-orange-200';
    if (readingLevel.value === 'Advanced') return 'bg-red-200';
    return undefined;
});
const overview = ref('');
const showOverview = ref(false);
const loadingOverview = ref(false);

chrome.runtime.sendMessage(
    chromeMessage({
        action: 'getReadability',
        content: extractMainContent(),
    }),
    (response: FleschKincaidReadability) => {
        loadingReadingLevel.value = false;
        readability.value = response;
    },
);

const port = chrome.runtime.connect({ name: 'overview' });

port.onMessage.addListener(message => {
    if (message.content) {
        overview.value = message.content;
        showOverview.value = true;
        loadingOverview.value = false;
    }
});

function toggleOverview() {
    if (loadingOverview.value) return;

    if (overview.value) {
        showOverview.value = !showOverview.value;
        return;
    }

    loadingOverview.value = true;

    port.postMessage(
        chromeMessage({
            action: 'toggleOverview',
            content: extractMainContent(),
        }),
    );
}

function openSidebar() {
    chrome.runtime.sendMessage(
        chromeMessage({
            action: 'openSidebar',
        }),
    );
}
</script>
