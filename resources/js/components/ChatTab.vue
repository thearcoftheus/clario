<template>
    <div class="bg-card text-card-foreground flex h-[500px] flex-col rounded-lg border shadow-sm">
        <div class="border-b p-6">
            <h3 class="text-lg leading-none font-semibold tracking-tight">Chat</h3>
            <p class="text-muted-foreground text-sm">Start a conversation</p>
        </div>
        <div class="flex-1 space-y-4 overflow-auto p-4" ref="chatContainer">
            <div v-for="(message, index) in chatMessages" :key="index" :class="['flex', message.sender === 'user' ? 'justify-end' : 'justify-start']">
                <div :class="['max-w-[90%] rounded-lg px-4 py-2', message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted']">
                    <Markdown :content="message.text" />
                </div>
            </div>
        </div>
        <div class="border-t p-4">
            <form @submit.prevent="sendMessage" class="flex space-x-2">
                <Input v-model="newMessage" placeholder="Type your message..." class="flex-1" />
                <Button type="submit" size="icon">
                    <SendIcon class="h-4 w-4" />
                </Button>
            </form>
        </div>
    </div>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { extractContent } from '@/functions/extractContent';
import { useStream } from '@laravel/stream-vue';
import { Send as SendIcon } from 'lucide-vue-next';
import { nextTick, onMounted, ref, watch } from 'vue';

// Chat functionality
const newMessage = ref('');
const chatContainer = ref<HTMLElement>();

interface ChatMessage {
    sender: 'user' | 'assistant';
    text: string;
}

const chatMessages = ref<ChatMessage[]>([{ sender: 'assistant', text: 'Hello! How can I help you today?' }]);

const { data, isStreaming, isFetching, send } = useStream('https://arc-extension.ddev.site/api/chat');

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    const userMessage = {
        sender: 'user' as const,
        text: newMessage.value,
    };

    chatMessages.value.push(userMessage);
    newMessage.value = '';

    await nextTick();
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }

    extractContent().then(content => {
        send({
            content,
            messages: chatMessages.value,
        });

        chatMessages.value.push({
            sender: 'assistant',
            text: '',
        });
    });
};

watch([data, isStreaming], () => {
    if (!isStreaming) {
        nextTick(() => {
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
        });
    }

    if (data.value && chatMessages.value.length > 0) {
        const lastMessage = chatMessages.value[chatMessages.value.length - 1];
        if (lastMessage.sender === 'assistant') {
            lastMessage.text = data.value;
        }
    }
});

// Scroll to bottom of chat on mount
onMounted(() => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
});
</script>
