<template>
    <div class="flex h-full flex-col gap-4 p-4">
        <div class="mb-2 flex items-center justify-between">
            <h1 class="text-xl font-bold">Clario</h1>
            <SettingsDialog />
        </div>

        <Tabs default-value="summary">
            <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="summary">
                <PageSummary />
            </TabsContent>
            <TabsContent value="chat">
                <Chat />
            </TabsContent>
            <TabsContent value="history">
                <History />
            </TabsContent>
        </Tabs>
    </div>

    <HistoryItemStream v-for="item in historyItems" :key="item.date.unix()" :item="item" />
</template>

<script lang="ts" setup>
import Chat from '@/components/Chat.vue';
import HistoryItemStream from '@/components/HistoryItemStream.vue';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import History from '@/layouts/History.vue';
import PageSummary from '@/layouts/PageSummary.vue';
import SettingsDialog from '@/layouts/SettingsDialog.vue';
import { useHistoryStore } from '@/stores/historyStore';
import { storeToRefs } from 'pinia';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);
</script>

<style lang="scss" scoped>
.h-full {
    height: 100%;
}
</style>
