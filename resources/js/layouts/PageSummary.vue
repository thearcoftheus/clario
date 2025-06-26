<template>
    <StyledTab>
        <div v-if="historyItems.length === 0" class="self-center py-8 text-center italic accent-gray-700">Refresh page to see summary</div>
        <div v-else class="p-6">
            <div v-if="historyItems[0].isFetching" class="flex justify-center py-8">
                <div class="h-8 w-8 animate-spin rounded-full border-2 border-solid border-black border-t-transparent" />
            </div>
            <Markdown :content="historyItems[0].simplifiedContent" />
        </div>
    </StyledTab>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import StyledTab from '@/components/ui/StyledTab.vue';
import { useHistoryStore } from '@/stores/historyStore';
import { storeToRefs } from 'pinia';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);
</script>
