<script lang="ts" setup>
import { HistoryItem } from '@/stores/historyStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { useStream } from '@laravel/stream-vue';
import { storeToRefs } from 'pinia';
import { onBeforeUnmount, onMounted, watch } from 'vue';

const { item } = defineProps<{
    item: HistoryItem;
}>();

const settingsStore = useSettingsStore();
const { settings } = storeToRefs(settingsStore);

const { data, isStreaming, isFetching, send, cancel } = useStream(route('translate'));

watch(data, v => (item.simplifiedContent = v), { immediate: true });
watch(isFetching, v => (item.isFetching = v), { immediate: true });
watch(isStreaming, v => (item.isStreaming = v), { immediate: true });

onMounted(() => send({ content: item.content, level: settings.value.simplificationLevel }));
onBeforeUnmount(() => cancel());
</script>
