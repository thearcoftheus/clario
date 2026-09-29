import type { View } from '@/composables/useNavigation';
import { forgetView as forgetViewFor, rememberView, viewForTab } from '@/helpers/paneMemory';
import { settingsSignature } from '@/helpers/settingsSignature';
import { pickEviction, shouldReplace } from '@/helpers/tabCache';
import { useAppStateStore } from '@/stores/appStateStore';
import type { ChatMessage } from '@/types/types';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

dayjs.extend(relativeTime);

// Why the next /api/translate call for this item is happening. Sent with the
// request and recorded in api_metrics so the portal can tell "Clario prepared
// this automatically" apart from "someone was reading and wanted it
// different" — without those being separable, the raw translate count reads
// as enthusiasm for Simple Read when most of it is prefetch.
//
// 'prefetch' also covers the lazy catch-up of a cached tab whose text was
// generated under older settings (see setCurrentTab): the user changed the
// level while on another tab, so this generation is Clario keeping up on its
// own, not a request made on this article.
export const StreamTriggers = ['prefetch', 'regenerate'] as const;
export type StreamTrigger = (typeof StreamTriggers)[number];

export const CHAT_GREETING: ChatMessage = { sender: 'assistant', text: 'Do you have any questions about this article?' };

// Chrome side panels are per-window, so this one document follows the user
// across every tab in its window. Rather than refetching on each switch, the
// store keeps one item per tab and a pointer to the tab on screen. Bounded so
// a tab hoarder doesn't keep dozens of streams and raw page captures alive.
export const MAX_CACHED_TABS = 8;

export type HistoryItem = {
    tabId: number;
    name: string;
    url: string;
    content: string;
    image?: string;
    description?: string;
    aiTitle?: string;
    aiSummary?: string;
    isHeadlineLoading: boolean;
    simplifiedContent: string;
    isStreaming: boolean;
    isFetching: boolean;
    trigger: StreamTrigger;
    date: Dayjs;
    formattedDate: string;
    // The content settings simplifiedContent was (or is being) generated
    // with. Compared on activation so a tab that was in the background when
    // settings changed regenerates then, and only then.
    settingsSignature: string;
    // For LRU eviction once the cache is over MAX_CACHED_TABS.
    lastActiveAt: number;
    // This tab's chat transcript. Navigating the tab replaces the item (and
    // the transcript); regenerating keeps the item, so the transcript survives.
    chat: ChatMessage[];
};

export type NewHistoryItem = Pick<HistoryItem, 'name' | 'url' | 'content' | 'image' | 'description'>;

export const useHistoryStore = defineStore('store', function () {
    const appState = useAppStateStore();
    const { settings } = storeToRefs(appState);

    const cachedItems = ref<HistoryItem[]>([]);
    const currentTabId = ref<number | null>(null);
    // Tabs with a content extraction in flight (initSidebarListeners).
    const pendingTabIds = ref<Set<number>>(new Set());
    // False until the initial "which tab is active" query answers, so the
    // panel shows a spinner rather than the empty state on first paint.
    const hasResolvedInitialTab = ref(false);
    // The pane each tab was last on. Sidebar.vue's activeView is derived from
    // this, so switching tabs restores the pane without going through
    // navigateTo (a tab switch is not a pane_visit). Bounded by open tabs:
    // every close hits forgetTab. Eviction of the cached item does not forget
    // the pane — an evicted tab that is still open just refetches into it.
    const viewByTab = ref<Map<number, View>>(new Map());

    const currentSignature = computed(() => settingsSignature(settings.value));

    const currentItem = computed<HistoryItem | null>(
        () => cachedItems.value.find(item => item.tabId === currentTabId.value) ?? null,
    );

    const currentView = computed<View>(() => viewForTab(viewByTab.value, currentTabId.value));

    const isExtractingCurrent = computed(
        () => !hasResolvedInitialTab.value || (currentTabId.value !== null && pendingTabIds.value.has(currentTabId.value)),
    );

    /**
     * @deprecated Only the orphaned components (Chat.vue, History.vue,
     * Narrate.vue, NarrateAdvanced.vue, PageSummary.vue) still read this.
     * Use `currentItem` for the article on screen and `cachedItems` to
     * iterate every cached tab.
     */
    const historyItems = computed<HistoryItem[]>(() => (currentItem.value ? [currentItem.value] : []));

    function itemForTab(tabId: number): HistoryItem | undefined {
        return cachedItems.value.find(item => item.tabId === tabId);
    }

    /**
     * Cache a freshly extracted page for a tab. Idempotent: the same page
     * (same URL, same extracted content) keeps the cached item — and its
     * simplified text, chat and headline — instead of regenerating.
     */
    function add(tabId: number, item: NewHistoryItem): HistoryItem {
        const existing = itemForTab(tabId);
        if (existing && !shouldReplace(existing, item)) return existing;

        const fresh: HistoryItem = {
            tabId,
            ...item,
            aiTitle: undefined,
            aiSummary: undefined,
            isHeadlineLoading: true,
            simplifiedContent: '',
            isStreaming: false,
            isFetching: true,
            // A newly opened article is always Clario getting ahead of the
            // user, never the user asking.
            trigger: 'prefetch',
            date: dayjs(),
            formattedDate: dayjs().fromNow(),
            settingsSignature: currentSignature.value,
            lastActiveAt: Date.now(),
            chat: [{ ...CHAT_GREETING }],
        };

        cachedItems.value = [...cachedItems.value.filter(i => i.tabId !== tabId), fresh];

        const victim = pickEviction(cachedItems.value, currentTabId.value, MAX_CACHED_TABS);
        if (victim) cachedItems.value = cachedItems.value.filter(i => i !== victim);

        return itemForTab(tabId)!;
    }

    // Drops the cached item only. Same-tab navigation calls this while the
    // next page loads, and the user's pane must survive that.
    function remove(tabId: number) {
        cachedItems.value = cachedItems.value.filter(item => item.tabId !== tabId);
        pendingTabIds.value.delete(tabId);
    }

    function setCurrentView(view: View) {
        viewByTab.value = rememberView(viewByTab.value, currentTabId.value, view);
    }

    // The tab no longer has a readable page: next time it is on screen it
    // starts over on Home.
    function forgetView(tabId: number) {
        viewByTab.value = forgetViewFor(viewByTab.value, tabId);
    }

    // The tab is gone (closed or replaced): item and pane both go.
    function forgetTab(tabId: number) {
        remove(tabId);
        forgetView(tabId);
    }

    /**
     * Point the panel at a tab. Cheap: nothing is fetched here. If the tab's
     * cached text was generated under older content settings, regenerate it
     * now — lazily, so a settings change costs one generation per tab the
     * user actually returns to.
     */
    function setCurrentTab(tabId: number | null) {
        currentTabId.value = tabId;
        if (tabId === null) return;

        const item = itemForTab(tabId);
        if (!item) return;

        item.lastActiveAt = Date.now();

        if (item.settingsSignature !== currentSignature.value) {
            // Set the trigger before bumping the date: the date change is what
            // remounts HistoryItemStream, and the new component reads this on
            // mount. Reversing these two lines would tag the request as a
            // regenerate.
            item.trigger = 'prefetch';
            item.settingsSignature = currentSignature.value;
            item.date = dayjs();
        }
    }

    function setPending(tabId: number, pending: boolean) {
        if (pending) pendingTabIds.value.add(tabId);
        else pendingTabIds.value.delete(tabId);
    }

    function markInitialTabResolved() {
        hasResolvedInitialTab.value = true;
    }

    // Regenerate the article on screen when a content-affecting setting
    // changes (this remounts HistoryItemHeadline / HistoryItemStream via
    // their date-keyed v-for in Sidebar.vue). Other cached tabs catch up when
    // they are next activated — see setCurrentTab. The signature covers only
    // the fields that actually flow through to the backend prompt — not
    // display or playback preferences like textSize / playbackSpeed.
    watch(currentSignature, signature => {
        const item = currentItem.value;
        if (!item) return;
        // Set the trigger before bumping the date: the date change is what
        // remounts HistoryItemStream, and the new component reads this on
        // mount. Reversing these two lines would tag the request as a
        // prefetch.
        item.trigger = 'regenerate';
        item.settingsSignature = signature;
        item.date = dayjs();
    });

    setInterval(() => {
        cachedItems.value.forEach(item => {
            item.formattedDate = item.date.fromNow();
        });
    }, 1000);

    return {
        cachedItems,
        currentItem,
        currentTabId,
        currentView,
        isExtractingCurrent,
        historyItems,
        itemForTab,
        add,
        remove,
        setCurrentView,
        forgetView,
        forgetTab,
        setCurrentTab,
        setPending,
        markInitialTabResolved,
    };
});
