<template>
    <div class="markdown-content" v-html="markdownContent" />
</template>

<script lang="ts" setup>
import { marked } from 'marked';
import { computed } from 'vue';

const { content } = defineProps<{
    content: string;
}>();

const markdownContent = computed(() => {
    if (!content) return '';
    return marked(content);
});
</script>

<style lang="scss">
.markdown-content {
    %generic-block {
        &:not(:first-child) {
            margin-top: 1.4em;
        }
        &:not(:last-child) {
            margin-bottom: 1.4em;
        }
    }

    /* Basic markdown styling */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6 {
        margin-top: 1em;
        margin-bottom: 0.5em;
        font-weight: bold;
    }

    h1 {
        font-size: 1.8em;
    }
    h2 {
        font-size: 1.5em;
    }
    h3 {
        font-size: 1.3em;
    }

    p {
        @extend %generic-block;
    }

    hr {
        @extend %generic-block;
        border: 0 none;
        border-top: 1px solid #ccc;
    }

    ul,
    ol {
        @extend %generic-block;

        li {
            margin-bottom: 0.8em;
            margin-left: 30px;

            > ul,
            > ol {
                &:nth-child(1n) {
                    margin-top: 1em !important;
                }
            }
        }
    }

    ul > li {
        list-style: disc outside;
    }

    li ul > li {
        list-style: square outside;

        &::marker {
            color: inherit;
        }
    }

    ol > li {
        list-style: decimal outside;

        &::marker {
            font-weight: bold;
        }
    }

    li ol > li {
        list-style: lower-alpha;

        &::marker {
            font-weight: normal;
        }
    }

    li li ol > li {
        list-style: lower-roman;
    }

    code {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 0.2em 0.4em;
        border-radius: 3px;
        font-family: monospace;
    }

    pre {
        background-color: rgba(0, 0, 0, 0.05);
        padding: 1em;
        border-radius: 5px;
        overflow-x: auto;
        margin-bottom: 1em;

        code {
            background-color: transparent;
            padding: 0;
        }
    }

    blockquote {
        border-left: 4px solid #ddd;
        padding-left: 1em;
        color: #666;
        margin-bottom: 1em;
    }

    a {
        color: #0366d6;
        text-decoration: none;

        &:hover,
        &:focus-visible {
            text-decoration: underline;
        }
    }

    table {
        border-collapse: collapse;
        margin-bottom: 1em;

        th,
        td {
            border: 1px solid #ddd;
            padding: 0.5em;
        }

        th {
            background-color: rgba(0, 0, 0, 0.05);
        }
    }
}
</style>
