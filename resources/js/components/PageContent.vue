<template>
    <div class="flex justify-center">
        <Button @click="onButtonClick" :disabled="isStreaming || isFetching">
            Simplify
            <div v-if="isStreaming || isFetching" class="h-5 w-5 animate-spin rounded-full border-2 border-solid border-white border-t-transparent" />
        </Button>
    </div>

    <Markdown :content="data" />
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import { Button } from '@/components/ui/button';
import { extractContent } from '@/functions/extractContent';
import { useStream } from '@laravel/stream-vue';

const { data, isStreaming, isFetching, send } = useStream(route('translate'));

function onButtonClick() {
    extractContent().then(content => {
        send({
            content,
        });
    });
}
</script>

<style lang="scss"></style>
