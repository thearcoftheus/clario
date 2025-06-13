<template>
    <div class="bg-card text-card-foreground flex h-[500px] flex-col rounded-lg border shadow-sm">
        <div class="border-b p-6">
            <h3 class="text-lg leading-none font-semibold tracking-tight">Chat</h3>
            <p class="text-muted-foreground text-sm">Start a conversation</p>
        </div>
        <div class="flex-1 space-y-4 overflow-auto p-4" ref="chatContainer">
            <div
                v-for="(message, index) in chatMessages"
                :key="index"
                :class="['flex', message.sender === 'user' ? 'justify-end' : 'justify-start']"
            >
                <div
                    :class="[
                        'max-w-[80%] rounded-lg px-4 py-2 text-sm',
                        message.sender === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted',
                    ]"
                >
                    {{ message.text }}
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send as SendIcon } from 'lucide-vue-next';
import { nextTick, onMounted, ref } from 'vue';

// Chat functionality
const newMessage = ref('');
const chatContainer = ref<HTMLElement>();
const chatMessages = ref([
    { sender: 'assistant', text: 'Hello! How can I help you today?' },
    { sender: 'user', text: 'I need help with my Chrome extension.' },
    { sender: 'assistant', text: 'Sure, what specific issue are you having with your Chrome extension?' },
    { sender: 'user', text: "It's not loading properly in the browser." },
    { sender: 'assistant', text: "Let's troubleshoot that. Have you checked the console for any error messages?" },
]);

const sendMessage = async () => {
    if (!newMessage.value.trim()) return;

    // Add user message
    chatMessages.value.push({
        sender: 'user',
        text: newMessage.value,
    });

    // Clear input
    newMessage.value = '';

    // Scroll to bottom
    await nextTick();
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }

    // Simulate assistant response after a delay
    setTimeout(() => {
        chatMessages.value.push({
            sender: 'assistant',
            text: 'I understand. Can you provide more details about the issue?',
        });

        // Scroll to bottom again after assistant response
        nextTick(() => {
            if (chatContainer.value) {
                chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
            }
        });
    }, 1000);
};

// Scroll to bottom of chat on mount
onMounted(() => {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
});
</script>
