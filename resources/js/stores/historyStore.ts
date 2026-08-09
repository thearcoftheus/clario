import { useAppStateStore } from '@/stores/appStateStore';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { defineStore, storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

dayjs.extend(relativeTime);

// Why the next /api/translate call for this item is happening. Sent with the
// request and recorded in api_metrics so the portal can tell "Clario prepared
// this automatically" apart from "someone was reading and wanted it
// different" — without those being separable, the raw translate count reads
// as enthusiasm for Simple Read when most of it is prefetch.
export const StreamTriggers = ['prefetch', 'regenerate'] as const;
export type StreamTrigger = (typeof StreamTriggers)[number];

export type HistoryItem = {
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
};

export type NewHistoryItem = Pick<HistoryItem, 'name' | 'url' | 'content' | 'image' | 'description'>;

export const useHistoryStore = defineStore('store', function () {
    const historyItems = ref<HistoryItem[]>([]);

    const appState = useAppStateStore();
    const { settings } = storeToRefs(appState);

    function add(item: NewHistoryItem) {
        historyItems.value = historyItems.value.filter(existingItem => existingItem.url !== item.url);

        historyItems.value.unshift({
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
        });
    }

    function remove(item: HistoryItem) {
        historyItems.value = historyItems.value.filter(existingItem => existingItem.url !== item.url);
    }

    // Bump the latest history item's date to force a regeneration when a
    // content-affecting setting changes (this remounts HistoryItemHeadline /
    // HistoryItemStream via their date-keyed v-for in Sidebar.vue). Watch only
    // the fields that actually flow through to the backend prompt — not display
    // or playback preferences like textSize / playbackSpeed.
    watch(
        [
            () => settings.value.simplificationLevel,
            () => settings.value.summaryLength,
            () => settings.value.emoji,
        ],
        () => {
            if (historyItems.value.length === 0) return;
            // Set the trigger before bumping the date: the date change is what
            // remounts HistoryItemStream, and the new component reads this on
            // mount. Reversing these two lines would tag the request as a
            // prefetch.
            historyItems.value[0].trigger = 'regenerate';
            historyItems.value[0].date = dayjs();
        },
    );

    setInterval(() => {
        historyItems.value.map(item => {
            item.formattedDate = item.date.fromNow();
            return item;
        });
    }, 1000);

    return {
        historyItems,
        add,
        remove,
    };
});
