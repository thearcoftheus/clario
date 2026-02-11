<template>
    <div class="grid h-dvh grid-rows-[auto_1fr] gap-4 p-4">
        <div class="mb-2 flex items-center justify-between">
            <h1 class="text-xl font-bold">Clario <span class="text-base font-normal">v0.5.4</span></h1>
            <SettingsDialog />
        </div>

        <Tabs default-value="summary" class="grid grid-rows-[auto_1fr]">
            <TabsList>
                <TabsTrigger value="summary">Summary</TabsTrigger>
                <TabsTrigger value="chat">Chat</TabsTrigger>
                <TabsTrigger value="narrate">Narrate</TabsTrigger>
                <!--                <TabsTrigger value="history">History</TabsTrigger>-->
            </TabsList>
            <TabsContent value="summary">
                <PageSummary />
            </TabsContent>
            <TabsContent value="chat">
                <Chat />
            </TabsContent>
            <TabsContent value="narrate">
                <NarrateAdvanced v-if="settings.voiceOption === 'Advanced'" />
                <Narrate v-else />
            </TabsContent>
            <!--            <TabsContent value="history">-->
            <!--                <History />-->
            <!--            </TabsContent>-->
        </Tabs>
    </div>

    <HistoryItemStream v-for="item in historyItems" :key="item.date.unix()" :item="item" />

    <Toaster />
</template>

<script lang="ts" setup>
import Chat from '@/components/Chat.vue';
import HistoryItemStream from '@/components/HistoryItemStream.vue';
import Narrate from '@/components/Narrate.vue';
import NarrateAdvanced from '@/components/NarrateAdvanced.vue';
import PageSummary from '@/components/PageSummary.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import { Toaster } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { storeToRefs } from 'pinia';
import 'vue-sonner/style.css';

const appStateStore = useAppStateStore();
const { settings } = storeToRefs(appStateStore);

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);
</script>

<style lang="scss">
html {
    overflow: hidden;
}
</style>
