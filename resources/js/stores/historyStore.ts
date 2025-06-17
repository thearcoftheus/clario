import dayjs, { Dayjs } from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { defineStore } from 'pinia';
import { ref } from 'vue';

dayjs.extend(relativeTime);

export type HistoryItem = {
    name: string;
    url: string;
    content: string;
    date: Dayjs;
    formattedDate: string;
};

export type NewHistoryItem = Omit<HistoryItem, 'date' | 'formattedDate'>;

export const useHistoryStore = defineStore('store', function () {
    const historyItems = ref<HistoryItem[]>([]);

    function add(item: NewHistoryItem) {
        historyItems.value = historyItems.value.filter(existingItem => existingItem.url !== item.url);

        historyItems.value.unshift({
            ...item,
            date: dayjs(),
            formattedDate: dayjs().fromNow(),
        });
    }

    function remove(item: HistoryItem) {
        historyItems.value = historyItems.value.filter(existingItem => existingItem.url !== item.url);
    }

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
