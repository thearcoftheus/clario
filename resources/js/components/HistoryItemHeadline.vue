<script lang="ts" setup>
import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';
import { useAppStateStore } from '@/stores/appStateStore';
import { HistoryItem } from '@/stores/historyStore';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { onMounted } from 'vue';

const { item } = defineProps<{
    item: HistoryItem;
}>();

const appState = useAppStateStore();
const { settings } = storeToRefs(appState);

onMounted(async () => {
    try {
        const response = await axios.post(
            route('headline'),
            { content: item.content, settings: settings.value },
            { headers: getApiHeaders() },
        );

        if (response.data.title) {
            item.aiTitle = response.data.title;
        }
        if (response.data.summary) {
            item.aiSummary = response.data.summary;
        }
    } catch (error) {
        console.error('Failed to fetch headline:', error);
    } finally {
        item.isHeadlineLoading = false;
    }
});
</script>
