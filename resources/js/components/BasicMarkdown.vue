<template>
    <div class="markdown-content" v-html="markdownContent" />
</template>

<script lang="ts" setup>
import 'katex/dist/katex.min.css';
import MarkdownIt from 'markdown-it';
import { computed } from 'vue';

const { content } = defineProps<{
    content: string;
}>();

const md = new MarkdownIt({
    html: true,
    linkify: true,
    typographer: true,
});

const markdownContent = computed(() => {
    if (!content) return '';
    return md.render(content);
});
</script>
