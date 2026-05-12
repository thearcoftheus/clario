<template>
    <div v-if="showWidget">
        <Transition
            mode="out-in"
            enter-from-class="opacity-0 scale-90"
            enter-active-class="transition duration-300 ease-out"
            leave-active-class="transition duration-300 ease-in"
            leave-to-class="opacity-0 scale-90"
            @after-leave="onAfterLeave"
        >
            <!-- Minimized state: compact pill, anchored bottom-right by the host container. -->
            <button
                v-if="isMinimized"
                key="pill"
                @click="openSidebar"
                class="bg-widget flex cursor-pointer items-center gap-2 rounded-full px-4 py-3 shadow-md/25 hover:opacity-90"
                aria-label="Open Clario"
            >
                <svg class="size-7" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="63" height="63" rx="14" fill="#5C2B85" />
                    <rect x="11" y="8" width="19" height="44" rx="3" fill="white" />
                    <rect x="30" y="8" width="6" height="44" rx="1" fill="white" opacity="0.6" />
                    <rect x="36" y="8" width="16" height="44" rx="3" fill="white" opacity="0.8" />
                </svg>
                <span class="text-base font-bold text-white whitespace-nowrap">Open Clario</span>
            </button>

            <!-- Default state: full pill bar across the bottom-center of the page. -->
            <div v-else key="full" class="bg-widget relative flex items-center rounded-full py-4 pl-9 pr-5 shadow-md/25">
                <!-- Top-left close-style minimize button (sits fully inside the bar
                     so it's always visible regardless of the host page's background). -->
                <button
                    @click="minimize"
                    class="absolute top-2 left-2 flex size-5 cursor-pointer items-center justify-center rounded-full bg-white/15 text-white/80 hover:bg-white/30 hover:text-white"
                    aria-label="Minimize Clario"
                    title="Minimize"
                >
                    <X class="size-3" />
                </button>

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
                    Clario can help you understand this page
                </p>

                <!-- Right: CTA -->
                <button
                    @click="openSidebar"
                    class="shrink-0 cursor-pointer rounded-full bg-white px-6 py-2 text-base font-bold text-[#1e1e1e] whitespace-nowrap hover:bg-gray-100"
                >
                    Click To Open Clario
                </button>
            </div>
        </Transition>
    </div>
</template>

<script lang="ts" setup>
import chromeMessage from '@/helpers/chromeMessage';
import { ChromeMessage } from '@/types/messages';
import { X } from 'lucide-vue-next';
import { onBeforeUnmount, onMounted, ref } from 'vue';

const props = defineProps<{ initialMinimized?: boolean }>();

const showWidget = ref(true);
const isMinimized = ref(props.initialMinimized ?? false);

const close = () => (showWidget.value = false);

// Repositions the host container between bottom-center (full) and
// bottom-right (minimized). Inline styles are set in mountOverviewWidget.ts
// for the initial state; we mutate them in place here.
function updateContainerPosition(minimized: boolean) {
    const container = document.getElementById('clario-container');
    if (!container) return;
    if (minimized) {
        container.style.left = 'auto';
        container.style.right = 'calc(1rem * var(--tw-multiplier, 1))';
        container.style.transform = 'none';
        container.style.width = 'auto';
    } else {
        container.style.left = '50%';
        container.style.right = 'auto';
        container.style.transform = 'translateX(-50%)';
        container.style.width = '90vw';
    }
}

// The container reposition happens in @after-leave (i.e. while the outgoing
// widget has finished its fade-out and the incoming widget hasn't yet
// appeared). This keeps the position swap invisible inside the transition.
function onAfterLeave() {
    updateContainerPosition(isMinimized.value);
}

function minimize() {
    isMinimized.value = true;
    chrome.storage.local.set({ clarioMinimized: true });
}

function openSidebar() {
    // Persist the cleared preference + fire the open message. Critically:
    // do NOT flip isMinimized.value or reposition the container synchronously
    // here — that causes a visible flash of the full bar before the host
    // container fades out. The visual swap is handled by handleSidebarState
    // below, on a setTimeout that runs after the host container has faded.
    chrome.storage.local.set({ clarioMinimized: false });
    chrome.runtime.sendMessage(
        chromeMessage({
            action: 'openSidebar',
        }),
    );
}

function handleSidebarState(message: ChromeMessage) {
    if (message.action !== 'sidebarState') return;
    // When the sidebar opens, the host container fades out (200ms opacity
    // transition set in mountOverviewWidget.ts). We wait past that window
    // before syncing the visual state to storage, so the swap is invisible.
    // When the sidebar closes again, the bar fades back in already in the
    // correct state — no mid-fade flash.
    if (!message.isOpen) return;
    window.setTimeout(async () => {
        const stored = await chrome.storage.local.get<{ clarioMinimized?: boolean }>('clarioMinimized');
        const next = stored.clarioMinimized ?? false;
        if (next !== isMinimized.value) {
            isMinimized.value = next;
            updateContainerPosition(next);
        }
    }, 250);
}

onMounted(() => {
    chrome.runtime.onMessage.addListener(handleSidebarState);
});

onBeforeUnmount(() => {
    chrome.runtime.onMessage.removeListener(handleSidebarState);
});
</script>
