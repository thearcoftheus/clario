import { useAppStateStore } from '@/stores/appStateStore';
import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { defineStore, storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

dayjs.extend(relativeTime);

export type HistoryItem = {
    name: string;
    url: string;
    content: string;
    simplifiedContent: string;
    isStreaming: boolean;
    isFetching: boolean;
    date: Dayjs;
    formattedDate: string;
};

export type NewHistoryItem = Pick<HistoryItem, 'name' | 'url' | 'content'>;

export const useHistoryStore = defineStore('store', function () {
    const historyItems = ref<HistoryItem[]>([]);

    const appState = useAppStateStore();
    const { settings } = storeToRefs(appState);

    function add(item: NewHistoryItem) {
        historyItems.value = historyItems.value.filter(existingItem => existingItem.url !== item.url);

        historyItems.value.unshift({
            ...item,
            simplifiedContent: '',
            isStreaming: false,
            isFetching: true,
            date: dayjs(),
            formattedDate: dayjs().fromNow(),
        });
    }

    function remove(item: HistoryItem) {
        historyItems.value = historyItems.value.filter(existingItem => existingItem.url !== item.url);
    }

    watch(settings, () => {
        if (historyItems.value.length === 0) return;
        historyItems.value[0].date = dayjs();
    });

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
