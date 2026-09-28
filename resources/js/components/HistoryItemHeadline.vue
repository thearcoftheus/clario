<script lang="ts" setup>
import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';
import { useAppStateStore } from '@/stores/appStateStore';
import { HistoryItem } from '@/stores/historyStore';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted } from 'vue';

const { item } = defineProps<{
    item: HistoryItem;
}>();

const appState = useAppStateStore();
const { settings } = storeToRefs(appState);

// Cancelled on unmount: the item was regenerated (remounting this component
// with a fresh request) or its tab went away, so a late reply must not clear
// the loading flag under the new request.
const abortController = new AbortController();

onMounted(async () => {
    try {
        const response = await axios.post(
            route('headline'),
            { content: item.content, settings: settings.value },
            { headers: getApiHeaders(), signal: abortController.signal },
        );

        if (response.data.title) {
            item.aiTitle = response.data.title;
        }
        if (response.data.summary) {
            item.aiSummary = response.data.summary;
        }
    } catch (error) {
        if (axios.isCancel(error)) return;
        console.error('Failed to fetch headline:', error);
    } finally {
        if (!abortController.signal.aborted) {
            item.isHeadlineLoading = false;
        }
    }
});

onBeforeUnmount(() => abortController.abort());
</script>
