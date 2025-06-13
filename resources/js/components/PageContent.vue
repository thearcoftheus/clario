<template>
    <Button @click="onExtractContent">Extract content</Button>

    {{ extractedContent }}

    <div class="flex justify-between">
        <Button @click="onButtonClick">Stream content</Button>
        <div v-if="isStreaming || isFetching" class="h-5 w-5 animate-spin rounded-full border-t-2 border-solid border-gray-500"></div>
    </div>

    <p>{{ data }}</p>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import { extractContent } from '@/functions/extractContent';
import { useStream } from '@laravel/stream-vue';
import { ref } from 'vue';

const { data, isStreaming, isFetching, send } = useStream('https://arc-extension.ddev.site/api/translate');
function onButtonClick() {
    extractContent().then(content => {
        send({
            content,
        });
    });
}

function onExtractContent() {
    extractContent().then(content => {
        extractedContent.value = content;
    });
}

const extractedContent = ref('');
</script>

<style lang="scss" scoped></style>
