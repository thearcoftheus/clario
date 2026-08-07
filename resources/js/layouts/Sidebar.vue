<template>
    <div class="bg-sidebar-bg flex h-dvh flex-col">
        <!-- Header -->
        <header class="flex shrink-0 items-center justify-between bg-white px-4 pt-4 pb-2">
            <button class="flex cursor-pointer items-center gap-2" @click="navigateTo('home', 'nav')">
                <svg class="size-[40px]" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="63" height="63" rx="14" fill="#5C2B85" />
                    <rect x="11" y="8" width="19" height="44" rx="3" fill="white" />
                    <rect x="30" y="8" width="6" height="44" rx="1" fill="white" opacity="0.6" />
                    <rect x="36" y="8" width="16" height="44" rx="3" fill="white" opacity="0.8" />
                </svg>
                <span class="text-[32px] font-bold text-black">Clario</span>
            </button>
            <button
                class="flex size-[28px] cursor-pointer items-center justify-center rounded-full border border-gray-300"
                @click="closeSidebar"
                aria-label="Close sidebar"
            >
                <ChevronDown class="size-4 text-gray-600" />
            </button>
        </header>

        <!-- Onboarding takeover (replaces main + footer for first-time users) -->
        <OnboardingOverlay v-if="showOnboarding" class="min-h-0 flex-1" />

        <!-- Main content area -->
        <div v-else class="min-h-0 flex-1 overflow-hidden" :class="activeView === 'home' ? 'overflow-y-auto' : ''">
            <!-- HOME VIEW -->
            <template v-if="activeView === 'home'">
                <!-- What You're Learning About -->
                <section class="px-4 pt-4 pb-4">
                    <h2 class="text-purple mb-2 text-lg leading-tight font-bold tracking-tight">What You're Learning About</h2>
                    <div v-if="currentItem" class="border-card-border overflow-hidden rounded-xl border-[0.5px] bg-white">
                        <!-- Loading state -->
                        <div v-if="currentItem.isHeadlineLoading" class="flex min-h-[80px] items-center justify-center">
                            <Loader2 class="text-purple size-6 animate-spin" />
                        </div>
                        <!-- Content (fades in) -->
                        <Transition name="fade">
                            <div v-if="!currentItem.isHeadlineLoading" class="flex">
                                <img
                                    v-if="currentItem.image && !homeImageFailed"
                                    :src="currentItem.image"
                                    alt=""
                                    class="w-[80px] shrink-0 self-stretch object-cover"
                                    @error="homeImageFailed = true"
                                />
                                <div v-else class="bg-purple-light flex w-[80px] shrink-0 items-center justify-center self-stretch">
                                    <Newspaper class="text-purple size-7" />
                                </div>
                                <div class="flex flex-col justify-center gap-1 p-3">
                                    <p class="text-base leading-tight font-bold tracking-tight text-black">
                                        {{ currentItem.aiTitle || currentItem.name }}
                                    </p>
                                    <p v-if="currentItem.aiSummary || currentItem.description" class="text-sm leading-snug tracking-tight text-black">
                                        {{ currentItem.aiSummary || currentItem.description }}
                                    </p>
                                </div>
                            </div>
                        </Transition>
                    </div>
                    <div v-else class="border-card-border flex h-[60px] items-center justify-center rounded-xl border-[0.5px] bg-white">
                        <p class="text-sm text-gray-400">Navigate to a page to get started</p>
                    </div>
                </section>

                <!-- Choose How To Learn About It -->
                <section class="px-4 pt-4 pb-4">
                    <h2 class="text-purple mb-2 text-lg leading-tight font-bold tracking-tight">Choose How To Learn About It</h2>
                    <div class="flex flex-col gap-2">
                        <!-- Read (full-width, purple) -->
                        <button
                            class="border-card-border bg-purple flex cursor-pointer items-center overflow-hidden rounded-xl border-[0.5px] p-3 text-left"
                            @click="navigateTo('summary', 'home_card')"
                        >
                            <div class="bg-purple-light mr-3 flex size-[48px] shrink-0 items-center justify-center rounded-xl">
                                <img :src="bookIcon" alt="" class="size-[36px]" />
                            </div>
                            <div class="flex-1">
                                <p class="text-base leading-tight font-bold tracking-tight text-white">Read</p>
                                <p class="mt-0.5 text-sm text-white">Simpler words, bigger text, pictures</p>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-1">
                                <span class="text-sm font-medium text-white">Tap to start</span>
                                <span
                                    v-if="recommendedFormFactors.includes('summary')"
                                    class="rounded-full border border-white px-2 py-0.5 text-[9px] font-bold text-white"
                                    >Recommended for you</span
                                >
                            </div>
                        </button>

                        <!-- Listen (full-width, purple) -->
                        <button
                            class="border-card-border bg-purple flex cursor-pointer items-center overflow-hidden rounded-xl border-[0.5px] p-3 text-left"
                            @click="navigateTo('narrate', 'home_card')"
                        >
                            <div class="bg-purple-light mr-3 flex size-[48px] shrink-0 items-center justify-center rounded-xl">
                                <img :src="earSoundIcon" alt="" class="size-[36px]" />
                            </div>
                            <div class="flex-1">
                                <p class="text-base leading-tight font-bold tracking-tight text-white">Listen</p>
                                <p class="mt-0.5 text-sm text-white">Read out loud</p>
                            </div>
                            <div class="flex shrink-0 flex-col items-end gap-1">
                                <span class="text-sm font-medium text-white">Tap to start</span>
                                <span
                                    v-if="recommendedFormFactors.includes('narrate')"
                                    class="rounded-full border border-white px-2 py-0.5 text-[9px] font-bold text-white"
                                    >Recommended for you</span
                                >
                            </div>
                        </button>

                        <!-- Ask + Watch (half-width row) -->
                        <div class="flex gap-2">
                            <!-- Ask -->
                            <button
                                class="border-card-border bg-purple-light flex flex-1 cursor-pointer flex-col overflow-hidden rounded-xl border-[0.5px] p-3 text-left"
                                @click="navigateTo('chat', 'home_card')"
                            >
                                <div class="bg-sidebar-bg mb-2 flex size-[36px] items-center justify-center rounded-xl">
                                    <img :src="personRaisedHandIcon" alt="" class="size-[36px]" />
                                </div>
                                <p class="text-purple text-base leading-tight font-bold tracking-tight">Ask</p>
                                <p class="text-purple mt-0.5 text-sm">Ask Questions</p>
                                <span
                                    v-if="recommendedFormFactors.includes('chat')"
                                    class="border-purple text-purple mt-2 inline-block self-start rounded-full border px-2 py-0.5 text-[9px] font-bold"
                                    >Recommended for you</span
                                >
                            </button>

                            <!-- Watch -->
                            <button
                                class="border-card-border bg-purple-light flex flex-1 cursor-pointer flex-col overflow-hidden rounded-xl border-[0.5px] p-3 text-left"
                                @click="navigateTo('avatar', 'home_card')"
                            >
                                <div class="bg-sidebar-bg mb-2 flex size-[36px] items-center justify-center rounded-xl">
                                    <img :src="explainerIcon" alt="" class="size-[36px]" />
                                </div>
                                <p class="text-purple text-base leading-tight font-bold tracking-tight">Watch</p>
                                <p class="text-purple mt-0.5 text-sm">An explainer video</p>
                                <span
                                    v-if="recommendedFormFactors.includes('avatar')"
                                    class="border-purple text-purple mt-2 inline-block self-start rounded-full border px-2 py-0.5 text-[9px] font-bold"
                                    >Recommended for you</span
                                >
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

        <template v-if="!showOnboarding">
            <!-- Footer -->
            <footer class="flex shrink-0 items-center justify-between bg-white px-4 py-2">
                <button class="cursor-pointer text-sm text-black underline" @click="helpDialog?.open()">Help</button>
                <button class="cursor-pointer text-sm text-black underline" @click="aboutDialog?.open()">About</button>
                <button class="flex cursor-pointer items-center gap-1" @click="settingsDialog?.open()">
                    <img :src="settingsIcon" alt="" class="size-[14px]" />
                    <span class="text-sm text-black underline">Advanced Settings</span>
                </button>
            </footer>

            <SettingsDialog ref="settingsDialog" />
            <HelpDialog ref="helpDialog" />
            <AboutDialog ref="aboutDialog" />

            <ChatModal :open="showChatModal" @close="showChatModal = false" />
        </template>
    </div>

    <HistoryItemHeadline v-for="item in historyItems" :key="'headline-' + item.date.unix()" :item="item" />
    <HistoryItemStream v-for="item in historyItems" :key="item.date.unix()" :item="item" />

    <Toaster />
</template>

<script lang="ts" setup>
import AboutDialog from '@/components/AboutDialog.vue';
import ChatModal from '@/components/ChatModal.vue';
import EasyReadPane from '@/components/EasyReadPane.vue';
import HelpDialog from '@/components/HelpDialog.vue';
import HistoryItemHeadline from '@/components/HistoryItemHeadline.vue';
import HistoryItemStream from '@/components/HistoryItemStream.vue';
import ListenPane from '@/components/ListenPane.vue';
import OnboardingOverlay from '@/components/onboarding/OnboardingOverlay.vue';
import SettingsDialog from '@/components/SettingsDialog.vue';
import { Toaster } from '@/components/ui/sonner';
import WatchPane from '@/components/WatchPane.vue';
import { NavigationKey, type View } from '@/composables/useNavigation';
import { useAppStateStore } from '@/stores/appStateStore';
import { useFeedbackStore, type PaneVisitTrigger } from '@/stores/feedbackStore';
import { useHistoryStore } from '@/stores/historyStore';
import { ChevronDown, Loader2, Newspaper } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, provide, ref, watch } from 'vue';
import 'vue-sonner/style.css';

import bookIcon from '@/../icons/sidebar/book.svg';
import earSoundIcon from '@/../icons/sidebar/ear-sound.svg';
import explainerIcon from '@/../icons/sidebar/explainer.svg';
import personRaisedHandIcon from '@/../icons/sidebar/person-raised-hand.svg';
import settingsIcon from '@/../icons/sidebar/settings.svg';

const activeView = ref<View>('home');
const showChatModal = ref(false);

// Single choke point for all user-initiated view changes — every navigation
// must go through here so pane_visit telemetry doesn't undercount. The chat
// "view" is really a modal, but it's still a pane visit for telemetry.
function navigateTo(view: View, trigger: PaneVisitTrigger) {
    if (view === 'chat') {
        showChatModal.value = true;
    } else {
        showChatModal.value = false;
        activeView.value = view;
    }

    const article = currentItem.value;
    feedbackStore.recordEvent({
        type: 'pane_visit',
        timestamp: Date.now(),
        pane: view,
        trigger,
        articleUrl: article?.url ?? null,
        articleTitle: article ? article.aiTitle || article.name : null,
    });
}

provide(NavigationKey, {
    setActiveView: (view: View, trigger: PaneVisitTrigger = 'nav') => navigateTo(view, trigger),
    openSettings: () => settingsDialog.value?.open(),
});

const appStateStore = useAppStateStore();
const { settings, isLoadingSettings, recommendedFormFactors } = storeToRefs(appStateStore);

const showOnboarding = computed(() => !isLoadingSettings.value && !settings.value.hasCompletedOnboarding);

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const feedbackStore = useFeedbackStore();

function closeSidebar() {
    window.close();
}

const settingsDialog = ref<InstanceType<typeof SettingsDialog> | null>(null);
const helpDialog = ref<InstanceType<typeof HelpDialog> | null>(null);
const aboutDialog = ref<InstanceType<typeof AboutDialog> | null>(null);

const currentItem = computed(() => historyItems.value[0] ?? null);

// Thumbnail load-failure fallback: reset on article change.
const homeImageFailed = ref(false);
watch(
    () => currentItem.value?.image,
    () => {
        homeImageFailed.value = false;
    },
);
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
