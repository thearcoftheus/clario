<template>
    <div v-if="showWidget">
        <div class="bg-widget flex items-center rounded-full px-5 py-4 shadow-md/25">
            <!-- Left: Logo + Clario -->
            <div class="flex shrink-0 items-center gap-3">
                <svg class="size-10" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="63" height="63" rx="14" fill="#5C2B85" />
                    <rect x="11" y="8" width="19" height="44" rx="3" fill="white" />
                    <rect x="30" y="8" width="6" height="44" rx="1" fill="white" opacity="0.6" />
                    <rect x="36" y="8" width="16" height="44" rx="3" fill="white" opacity="0.8" />
                </svg>
                <span class="text-2xl font-bold text-white whitespace-nowrap">Clario</span>
            </div>

            <!-- Center: Message -->
            <p class="flex-1 text-center text-base text-white whitespace-nowrap">
                Clario can help you <span class="underline">listen to this page</span>
                <Volume2 class="ml-2 inline size-6 align-middle text-white" />
            </p>

            <!-- Right: CTA Button -->
            <button
                @click="openSidebar"
                class="shrink-0 cursor-pointer rounded-full bg-white px-6 py-2 text-base font-bold text-[#1e1e1e] whitespace-nowrap hover:bg-gray-100"
            >
                Click To Open Clario
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import chromeMessage from '@/helpers/chromeMessage';
import { Volume2 } from 'lucide-vue-next';
import { ref } from 'vue';

const showWidget = ref(true);

const close = () => (showWidget.value = false);

function openSidebar() {
    chrome.runtime.sendMessage(
        chromeMessage({
            action: 'openSidebar',
        }),
    );
}
</script>
