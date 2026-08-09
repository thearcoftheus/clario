<script lang="ts" setup>
import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';
import { useAppStateStore } from '@/stores/appStateStore';
import { HistoryItem } from '@/stores/historyStore';
import { useStream } from '@laravel/stream-vue';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, watch } from 'vue';

const { item } = defineProps<{
    item: HistoryItem;
}>();

const appState = useAppStateStore();
const { settings } = storeToRefs(appState);

const { data, isStreaming, isFetching, send, cancel } = useStream(route('translate'), {
    headers: getApiHeaders(),
});

watch(data, v => (item.simplifiedContent = v), { immediate: true });
watch(isFetching, v => (item.isFetching = v), { immediate: true });
watch(isStreaming, v => (item.isStreaming = v), { immediate: true });

// `trigger` is metrics-only — it tells the server whether this generation was
// Clario prefetching or the user asking for a different version. It does not
// affect the prompt or the response.
onMounted(() => send({ content: item.content, settings: settings.value, trigger: item.trigger }));
onBeforeUnmount(() => cancel());
</script>
