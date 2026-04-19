<template>
    <div class="flex h-dvh flex-col bg-sidebar-bg">
        <!-- Header -->
        <header class="flex shrink-0 items-center justify-between bg-white px-4 pt-4 pb-2">
            <button class="flex cursor-pointer items-center gap-2" @click="activeView = 'home'">
                <svg class="size-[40px]" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="63" height="63" rx="14" fill="#5C2B85" />
                    <rect x="11" y="8" width="19" height="44" rx="3" fill="white" />
                    <rect x="30" y="8" width="6" height="44" rx="1" fill="white" opacity="0.6" />
                    <rect x="36" y="8" width="16" height="44" rx="3" fill="white" opacity="0.8" />
                </svg>
                <span class="text-[32px] font-bold text-black">Clario</span>
            </button>
            <button class="flex size-[28px] cursor-pointer items-center justify-center rounded-full border border-gray-300" @click="closeSidebar" aria-label="Close sidebar">
                <ChevronDown class="size-4 text-gray-600" />
            </button>
        </header>

        <!-- Main content area -->
        <div class="min-h-0 flex-1 overflow-hidden" :class="activeView === 'home' ? 'overflow-y-auto' : ''">
            <!-- HOME VIEW -->
            <template v-if="activeView === 'home'">
                <!-- What You're Learning About -->
                <section class="px-4 pb-4 pt-4">
                    <h2 class="mb-2 text-lg font-bold leading-tight tracking-tight text-purple">
                        What You're Learning About
                    </h2>
                    <div v-if="currentItem" class="overflow-hidden rounded-xl border-[0.5px] border-card-border bg-white">
                        <!-- Loading state -->
                        <div v-if="currentItem.isHeadlineLoading" class="flex min-h-[80px] items-center justify-center">
                            <Loader2 class="size-6 animate-spin text-purple" />
                        </div>
                        <!-- Content (fades in) -->
                        <Transition name="fade">
                            <div v-if="!currentItem.isHeadlineLoading" class="flex">
                                <img
                                    v-if="currentItem.image"
                                    :src="currentItem.image"
                                    alt=""
                                    class="w-[80px] shrink-0 self-stretch object-cover"
                                />
                                <div class="flex flex-col justify-center gap-1 p-3">
                                    <p class="text-base font-bold leading-tight tracking-tight text-black">
                                        {{ currentItem.aiTitle || currentItem.name }}
                                    </p>
                                    <p v-if="currentItem.aiSummary || currentItem.description" class="text-sm leading-snug tracking-tight text-black">
                                        {{ currentItem.aiSummary || currentItem.description }}
                                    </p>
                                </div>
                            </div>
                        </Transition>
                    </div>
                    <div v-else class="flex h-[60px] items-center justify-center rounded-xl border-[0.5px] border-card-border bg-white">
                        <p class="text-sm text-gray-400">Navigate to a page to get started</p>
                    </div>
                </section>

                <!-- Choose How To Learn About It -->
                <section class="px-4 pb-4 pt-4">
                    <h2 class="mb-2 text-lg font-bold leading-tight tracking-tight text-purple">
                        Choose How To Learn About It
                    </h2>
                    <div class="flex flex-col gap-2">
                        <!-- Easy Read (full-width, purple) -->
                        <button
                            class="flex cursor-pointer items-center overflow-hidden rounded-xl border-[0.5px] border-card-border bg-purple p-3 text-left"
                            @click="activeView = 'summary'"
                        >
                            <div class="mr-3 flex size-[48px] shrink-0 items-center justify-center rounded-xl bg-purple-light">
                                <img :src="bookIcon" alt="" class="size-[36px]" />
                            </div>
                            <div class="flex-1">
                                <p class="text-base font-bold leading-tight tracking-tight text-white">Easy Read</p>
                                <p class="mt-0.5 text-sm text-white">Simpler words, bigger text, pictures</p>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-1">
                                <span class="text-sm font-medium text-white">Tap to start</span>
                                <span class="rounded-full border border-white px-2 py-0.5 text-[9px] font-bold text-white">Recommended for you</span>
                            </div>
                        </button>

                        <!-- Listen (full-width, purple) -->
                        <button
                            class="flex cursor-pointer items-center overflow-hidden rounded-xl border-[0.5px] border-card-border bg-purple p-3 text-left"
                            @click="activeView = 'narrate'"
                        >
                            <div class="mr-3 flex size-[48px] shrink-0 items-center justify-center rounded-xl bg-purple-light">
                                <img :src="earSoundIcon" alt="" class="size-[36px]" />
                            </div>
                            <div class="flex-1">
                                <p class="text-base font-bold leading-tight tracking-tight text-white">Listen</p>
                                <p class="mt-0.5 text-sm text-white">Read out loud</p>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-1">
                                <span class="text-sm font-medium text-white">Tap to start</span>
                                <span class="rounded-full border border-white px-2 py-0.5 text-[9px] font-bold text-white">Recommended for you</span>
                            </div>
                        </button>

                        <!-- Ask + Watch (half-width row) -->
                        <div class="flex gap-2">
                            <!-- Ask -->
                            <button
                                class="flex flex-1 cursor-pointer flex-col overflow-hidden rounded-xl border-[0.5px] border-card-border bg-purple-light p-3 text-left"
                                @click="showChatModal = true"
                            >
                                <div class="mb-2 flex size-[36px] items-center justify-center rounded-xl bg-sidebar-bg">
                                    <img :src="personRaisedHandIcon" alt="" class="size-[36px]" />
                                </div>
                                <p class="text-base font-bold leading-tight tracking-tight text-purple">Ask</p>
                                <p class="mt-0.5 text-sm text-purple">Ask Questions</p>
                            </button>

                            <!-- Watch -->
                            <button
                                class="flex flex-1 cursor-pointer flex-col overflow-hidden rounded-xl border-[0.5px] border-card-border bg-purple-light p-3 text-left"
                                @click="activeView = 'avatar'"
                            >
                                <div class="mb-2 flex size-[36px] items-center justify-center rounded-xl bg-sidebar-bg">
                                    <img :src="animatedImagesIcon" alt="" class="size-[36px]" />
                                </div>
                                <p class="text-base font-bold leading-tight tracking-tight text-purple">Watch</p>
                                <p class="mt-0.5 text-sm text-purple">Watch A video</p>
                            </button>
                        </div>
                    </div>
                </section>
            </template>

            <!-- PANE VIEWS -->
            <EasyReadPane v-else-if="activeView === 'summary'" class="h-full" />
            <ListenPane v-else-if="activeView === 'narrate'" class="h-full" />
            <WatchPane v-else-if="activeView === 'avatar'" class="h-full" />
        </div>

        <!-- Footer -->
        <footer class="flex shrink-0 items-center justify-between bg-white px-4 py-2">
            <a href="#" class="text-sm text-black underline">Help</a>
            <a href="#" class="text-sm text-black underline">About</a>
            <button class="flex cursor-pointer items-center gap-1" @click="settingsDialog?.open()">
                <img :src="settingsIcon" alt="" class="size-[14px]" />
                <span class="text-sm text-black underline">Advanced Settings</span>
            </button>
        </footer>

        <SettingsDialog ref="settingsDialog" />

        <ChatModal :open="showChatModal" @close="showChatModal = false" />
    </div>

    <HistoryItemHeadline v-for="item in historyItems" :key="'headline-' + item.date.unix()" :item="item" />
    <HistoryItemStream v-for="item in historyItems" :key="item.date.unix()" :item="item" />

    <Toaster />
</template>

<script lang="ts" setup>
import ChatModal from '@/components/ChatModal.vue';
import EasyReadPane from '@/components/EasyReadPane.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import HistoryItemHeadline from '@/components/HistoryItemHeadline.vue';
import HistoryItemStream from '@/components/HistoryItemStream.vue';
import ListenPane from '@/components/ListenPane.vue';
import WatchPane from '@/components/WatchPane.vue';
import { Toaster } from '@/components/ui/sonner';
import { NavigationKey, type View } from '@/composables/useNavigation';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { ChevronDown, Loader2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, provide, ref } from 'vue';
import 'vue-sonner/style.css';

import bookIcon from '@/../icons/sidebar/book.svg';
import earSoundIcon from '@/../icons/sidebar/ear-sound.svg';
import personRaisedHandIcon from '@/../icons/sidebar/person-raised-hand.svg';
import animatedImagesIcon from '@/../icons/sidebar/animated-images.svg';
import settingsIcon from '@/../icons/sidebar/settings.svg';

const activeView = ref<View>('home');
const showChatModal = ref(false);

provide(NavigationKey, {
    setActiveView: (view: View) => {
        if (view === 'chat') {
            showChatModal.value = true;
        } else {
            showChatModal.value = false;
            activeView.value = view;
        }
    },
});

const appStateStore = useAppStateStore();
const { settings } = storeToRefs(appStateStore);

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

function closeSidebar() {
    window.close();
}

const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null);

const currentItem = computed(() => historyItems.value[0] ?? null);
</script>

<style lang="scss">
html {
    overflow: hidden;
}

.fade-enter-active {
    transition: opacity 0.4s ease;
}

.fade-enter-from {
    opacity: 0;
}
</style>
