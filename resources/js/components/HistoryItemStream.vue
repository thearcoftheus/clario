<script lang="ts" setup>
import { HistoryItem } from '@/stores/historyStore';
import { useStream } from '@laravel/stream-vue';
import { onBeforeUnmount, onMounted, watch } from 'vue';

const { item } = defineProps<{
    item: HistoryItem;
}>();

const { data, isStreaming, isFetching, send, cancel } = useStream(route('translate'));

watch(data, v => (item.simplifiedContent = v), { immediate: true });
watch(isFetching, v => (item.isFetching = v), { immediate: true });
watch(isStreaming, v => (item.isStreaming = v), { immediate: true });

onMounted(() => send({ content: item.content }));
onBeforeUnmount(() => cancel());
</script>
