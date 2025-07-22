<template>
    <StyledTab>
        <div v-if="isLoading" class="m-6 flex justify-center py-8">
            <div class="h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-t-transparent" />
        </div>
        <div v-else-if="historyItems.length === 0" class="self-center py-8 text-center italic accent-gray-700">Refresh page to see summary</div>
        <div v-else class="p-6">
            <Markdown :content="historyItems[0].simplifiedContent" />
        </div>
    </StyledTab>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import StyledTab from '@/components/ui/StyledTab.vue';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const appState = useAppStateStore();
const { isExtractingContent } = storeToRefs(appState);

const isLoading = computed(() => {
    return isExtractingContent.value || historyItems.value[0]?.isFetching;
});
</script>
