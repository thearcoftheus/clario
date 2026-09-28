import { getApiHeaders } from '@/helpers/apiConfig';
import { classifyChatIntent } from '@/helpers/classifyChatIntent';
import route from '@/helpers/route';
import { useAppStateStore } from '@/stores/appStateStore';
import { useFeedbackStore } from '@/stores/feedbackStore';
import { CHAT_GREETING, useHistoryStore, type HistoryItem } from '@/stores/historyStore';
import type { ChatMessage } from '@/types/types';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, toRaw, watch } from 'vue';

export type { ChatMessage } from '@/types/types';

type ChatPhase = 'fetching' | 'streaming';

type InflightRequest = {
    item: HistoryItem;
    controller: AbortController;
    reader: ReadableStreamDefaultReader<Uint8Array> | null;
};

// Each tab's transcript lives on its HistoryItem (historyStore), so the panel
// following the user to another tab shows that tab's conversation. A reply
// that is still streaming keeps writing into the message it was started for,
// wherever the user is now; only the tab on screen drives isFetching /
// isStreaming.
export const useChatStore = defineStore('chatstore', function () {
    const historyStore = useHistoryStore();
    const { currentItem, currentTabId, cachedItems } = storeToRefs(historyStore);

    const appState = useAppStateStore();
    const { settings } = storeToRefs(appState);

    const feedbackStore = useFeedbackStore();

    // Non-reactive: AbortController and the stream reader must not be wrapped
    // in a proxy. The reactive `phases` map is what the UI watches.
    const inflight = new Map<number, InflightRequest>();
    const phases = ref<Map<number, ChatPhase>>(new Map());

    const chatMessages = computed<ChatMessage[]>(() => currentItem.value?.chat ?? [CHAT_GREETING]);

    const isFetching = computed(() => currentTabId.value !== null && phases.value.get(currentTabId.value) === 'fetching');
    const isStreaming = computed(() => currentTabId.value !== null && phases.value.get(currentTabId.value) === 'streaming');

    function addUserMessage(message: string) {
        const item = currentItem.value;
        if (!item) return;
        if (message.trim().length === 0) return;
        if (phases.value.has(item.tabId)) return;

        // Telemetry (chat_message_sent, local-only): intent classification and
        // coarse size only — the message text itself is never stored.
        feedbackStore.recordEvent({
            type: 'chat_message_sent',
            timestamp: Date.now(),
            articleUrl: item.url,
            articleTitle: item.aiTitle || item.name,
            intent: classifyChatIntent(message),
            wordCount: message.trim().split(/\s+/).length,
            messageIndex: item.chat.filter(m => m.sender === 'user').length + 1,
        });

        item.chat.push({ sender: 'user', text: message });

        void getAssistantResponse(item);
    }

    function finish(tabId: number) {
        inflight.delete(tabId);
        phases.value.delete(tabId);
    }

    async function getAssistantResponse(item: HistoryItem) {
        const tabId = item.tabId;
        if (phases.value.has(tabId)) return;

        const controller = new AbortController();
        inflight.set(tabId, { item, controller, reader: null });
        phases.value.set(tabId, 'fetching');

        // Push, then read back the reactive proxy so chunks appended below
        // re-render. Captured now: the user may be on another tab by the time
        // they arrive.
        item.chat.push({ sender: 'assistant', text: '' });
        const assistantMessage = item.chat[item.chat.length - 1];

        let response: Response;

        try {
            response = await fetch(route('chat'), {
                method: 'POST',
                headers: getApiHeaders({ Accept: 'text/event-stream' }),
                body: JSON.stringify({
                    content: item.content,
                    messages: item.chat.slice(0, -1),
                    settings: settings.value,
                }),
                signal: controller.signal,
            });
        } catch (e) {
            if (!isAbortError(e)) console.error('Network error', e);
            finish(tabId);
            return;
        }

        if (!response.ok || !response.body) {
            console.error('Bad response', response.status);
            finish(tabId);
            return;
        }

        const entry = inflight.get(tabId);
        if (!entry || entry.controller !== controller) {
            // Cancelled while the request was in flight.
            void response.body.cancel();
            return;
        }

        phases.value.set(tabId, 'streaming');

        const reader = response.body.getReader();
        entry.reader = reader;
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                assistantMessage.text += decoder.decode(value, { stream: true });
            }
        } catch (e) {
            if (!isAbortError(e)) console.error('Stream read error:', e);
        } finally {
            reader.cancel().catch(() => {});
            if (inflight.get(tabId)?.controller === controller) finish(tabId);
        }
    }

    function cancelAssistantResponse(tabId: number | null = currentTabId.value) {
        if (tabId === null) return;
        const entry = inflight.get(tabId);
        if (!entry) return;

        entry.controller.abort();
        entry.reader?.cancel().catch(() => {});
        finish(tabId);
    }

    // A tab that closed or navigated replaces or drops its item; a reply
    // still streaming for the old item has nowhere to go and would keep the
    // new article's chat disabled.
    watch(cachedItems, items => {
        for (const [tabId, entry] of Array.from(inflight.entries())) {
            const stillCached = items.some(i => toRaw(i) === toRaw(entry.item));
            if (!stillCached) cancelAssistantResponse(tabId);
        }
    });

    return {
        chatMessages,
        addUserMessage,
        cancelAssistantResponse,
        isFetching,
        isStreaming,
    };
});

function isAbortError(e: unknown): boolean {
    return typeof e === 'object' && e !== null && 'name' in e && e.name === 'AbortError';
}
