<template>
    <Teleport to="body">
        <Transition name="chat-modal">
            <div v-if="open" class="absolute inset-0 z-50 flex items-center justify-center">
                <!-- Backdrop -->
                <div class="absolute inset-0 bg-white/50 backdrop-blur-sm" @click="$emit('close')" />

                <!-- Modal -->
                <div class="relative mx-4 flex max-h-[70vh] w-full flex-col overflow-hidden rounded-xl bg-purple">
                    <!-- Header -->
                    <div class="flex shrink-0 items-center justify-between px-4 pt-4 pb-2">
                        <div class="flex items-center gap-2">
                            <img :src="personRaisedHandIcon" alt="" class="size-6 brightness-0 invert" />
                            <span class="text-xl font-bold text-white">Ask</span>
                        </div>
                        <button
                            class="flex size-7 cursor-pointer items-center justify-center rounded-full border border-white/50"
                            @click="$emit('close')"
                        >
                            <X class="size-4 text-white" />
                        </button>
                    </div>

                    <!-- Helper text -->
                    <div class="shrink-0 px-4 pb-2">
                        <p class="text-sm text-white/80">I can answer questions</p>
                        <p class="text-sm text-white/60">Example: Where did this happen?</p>
                    </div>

                    <!-- Messages -->
                    <div ref="chatContainer" class="min-h-0 flex-1 overflow-y-auto px-4">
                        <div class="space-y-3 py-2">
                            <div
                                v-for="(message, index) in chatMessages"
                                :key="index"
                                :class="['flex', message.sender === 'user' ? 'justify-end' : 'justify-start']"
                            >
                                <div
                                    :class="[
                                        'max-w-[85%] rounded-lg px-3 py-2 text-sm',
                                        message.sender === 'user'
                                            ? 'bg-white text-black'
                                            : 'bg-white/20 text-white',
                                    ]"
                                >
                                    <div
                                        v-if="message.sender === 'assistant' && message.text === '' && isFetching"
                                        class="size-4 animate-spin rounded-full border-2 border-solid border-white border-t-transparent"
                                    />
                                    <Markdown :content="message.text" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Input -->
                    <div class="shrink-0 p-4">
                        <form @submit.prevent="sendMessage" class="flex items-center gap-2">
                            <input
                                ref="textInput"
                                v-model="newMessage"
                                type="text"
                                placeholder="Type Your Question"
                                class="flex-1 rounded-full bg-white px-4 py-3 text-sm text-black outline-none placeholder:text-gray-400"
                                :disabled="isFetching || isStreaming"
                            />
                            <button
                                type="submit"
                                :disabled="isFetching || isStreaming || !newMessage.trim()"
                                class="shrink-0 cursor-pointer rounded-full bg-gray-300 px-5 py-3 text-sm font-medium text-black disabled:opacity-50"
                            >
                                Go!
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </Transition>
    </Teleport>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import { useChatStore } from '@/stores/chatStore';
import { useHistoryStore } from '@/stores/historyStore';
import { X } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { nextTick, ref, watch } from 'vue';

import personRaisedHandIcon from '@/../icons/sidebar/person-raised-hand.svg';

const props = defineProps<{ open: boolean }>();
defineEmits<{ close: [] }>();

watch(() => props.open, (isOpen) => {
    if (isOpen) {
        nextTick(() => {
            scrollToBottom();
            textInput.value?.focus();
        });
    }
});

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const chatStore = useChatStore();
const { chatMessages, isFetching, isStreaming } = storeToRefs(chatStore);

const newMessage = ref('');
const chatContainer = ref<HTMLElement>();
const textInput = ref<HTMLInputElement>();

function scrollToBottom() {
    if (chatContainer.value) {
        chatContainer.value.scrollTop = chatContainer.value.scrollHeight;
    }
}

async function sendMessage() {
    if (!newMessage.value.trim()) return;
    chatStore.addUserMessage(newMessage.value);
    newMessage.value = '';
    await nextTick();
    scrollToBottom();
}

watch(isStreaming, () => {
    if (!isStreaming.value) {
        nextTick(() => {
            scrollToBottom();
            textInput.value?.focus();
        });
    }
});
</script>

<style scoped>
.chat-modal-enter-active,
.chat-modal-leave-active {
    transition: opacity 0.2s ease;
}

.chat-modal-enter-from,
.chat-modal-leave-to {
    opacity: 0;
}
</style>
