<template>
    <StyledTab>
        <div v-if="historyItems.length === 0" class="self-center py-8 text-center italic accent-gray-700">Refresh page to see summary</div>
        <template v-else>
            <div class="grid h-full grid-rows-[1fr_auto]">
                <div class="overflow-auto contain-size" ref="chatContainer">
                    <div class="space-y-4 p-6">
                        <div
                            v-for="(message, index) in chatMessages"
                            :key="index"
                            :class="['flex', message.sender === 'user' ? 'justify-end' : 'justify-start']"
                        >
                            <div
                                :class="[
                                    'max-w-[90%] rounded-lg px-4 py-2',
                                    message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                                ]"
                            >
                                <div
                                    v-if="message.sender === 'assistant' && message.text === '' && isFetching"
                                    class="h-5 w-5 animate-spin rounded-full border-2 border-solid border-gray-900 border-t-transparent"
                                />
                                <Markdown :content="message.text" />
                            </div>
                        </div>
                    </div>
                </div>
                <div class="border-t p-6">
                    <form @submit.prevent="sendMessage" class="flex space-x-2">
                        <Input
                            type="text"
                            v-model="newMessage"
                            placeholder="Type your message..."
                            class="flex-1"
                            :disabled="isFetching || isStreaming"
                            ref="textInput"
                        />
                        <Button type="submit" size="icon" :disabled="isFetching || isStreaming">
                            <SendIcon class="h-4 w-4" />
                        </Button>
                    </form>
                </div>
            </div>
        </template>
    </StyledTab>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import StyledTab from '@/components/ui/StyledTab.vue';
import { useChatStore } from '@/stores/chatStore';
import { useHistoryStore } from '@/stores/historyStore';
import { Send as SendIcon } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, ref, watch } from 'vue';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const chatStore = useChatStore();
const { chatMessages, isFetching, isStreaming } = storeToRefs(chatStore);

const newMessage = ref('');
const chatContainer = ref<HTMLElement>();
const textInput = ref();

function focusTextInput() {
    const inputElement = textInput.value?.$el as HTMLInputElement;
    inputElement?.focus();
}

function scrollToBottom() {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
}

async function sendMessage() {
    chatStore.addUserMessage(newMessage.value);
    newMessage.value = '';

    await nextTick();
    scrollToBottom();
}

watch(isStreaming, () => {
    if (!isStreaming.value) {
        nextTick(() => {
            scrollToBottom();
            focusTextInput();
        });
    }
});

onMounted(async () => {
    scrollToBottom();
    setTimeout(() => {
        focusTextInput();
    }, 50);
});
</script>
