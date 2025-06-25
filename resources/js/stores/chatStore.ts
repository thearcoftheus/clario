import { useHistoryStore } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { defineStore, storeToRefs } from 'pinia';
import { ref } from 'vue';

export type ChatMessage = {
    sender: 'user' | 'assistant';
    text: string;
};

export const useChatStore = defineStore('chatstore', function () {
    const chatMessages = ref<ChatMessage[]>([{ sender: 'assistant', text: 'Hello! How can I help you today?' }]);

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let abortController: AbortController | null = null;

    const historyStore = useHistoryStore();
    const { historyItems } = storeToRefs(historyStore);

    const settingsStore = useSettingsStore();
    const { settings } = storeToRefs(settingsStore);

    const isFetching = ref(false);
    const isStreaming = ref(false);

    function addUserMessage(message: string) {
        if (message.trim().length === 0) return;
        if (isStreaming.value || isFetching.value) return;
        if (historyItems.value.length === 0) return;

        const userMessage = {
            sender: 'user' as const,
            text: message,
        };

        chatMessages.value.push(userMessage);

        getAssistantResponse();
    }

    async function getAssistantResponse() {
        if (isStreaming.value || isFetching.value) return;

        isFetching.value = true;
        abortController = new AbortController();

        chatMessages.value.push({
            sender: 'assistant',
            text: '',
        });

        let response;

        try {
            response = await fetch(route('chat'), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'text/event-stream',
                },
                body: JSON.stringify({
                    content: historyItems.value[0].content,
                    messages: chatMessages.value.slice(0, -1),
                    level: settings.value.simplificationLevel,
                }),
                signal: abortController.signal,
            });
        } catch (e) {
            console.error('Network error', e);
            isFetching.value = false;
            return;
        }

        if (!response.ok || !response.body) {
            console.error('Bad response', response.status);
            isFetching.value = false;
            return;
        }

        isFetching.value = false;
        isStreaming.value = true;

        reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                chatMessages.value[chatMessages.value.length - 1].text += chunk;
            }
        } catch (e) {
            if (typeof e === 'object' && e !== null && 'name' in e && e.name !== 'AbortError') {
                console.error('Stream read error:', e);
            }
        } finally {
            isStreaming.value = false;
            reader?.cancel();
            reader = null;
        }
    }

    function cancelAssistantResponse() {
        abortController?.abort();
        abortController = null;

        reader?.cancel();
        reader = null;

        isStreaming.value = false;
        isFetching.value = false;
    }

    return {
        chatMessages,
        addUserMessage,
        cancelAssistantResponse,
        isFetching,
        isStreaming,
    };
});
