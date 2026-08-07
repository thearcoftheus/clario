<template>
    <!--
        Rendered as a column-flow sibling of the Simple Read Markdown content,
        with `break-before: column` forcing it onto its own dedicated final
        slide. Layout/styling assumes it lives inside the content card's
        padded interior, so no border/background of its own.
    -->
    <section
        ref="sectionEl"
        aria-label="Difficulty feedback"
        class="break-before-column flex h-full flex-col justify-center px-2"
        style="break-before: column"
    >
        <template v-if="!answered">
            <h3 class="text-base font-bold leading-snug text-purple">
                Was Simple Read too easy, too challenging, or just right?
            </h3>
            <div class="mt-5 flex gap-2">
                <button
                    v-for="option in options"
                    :key="option.value"
                    type="button"
                    class="flex flex-1 cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-purple bg-white px-2 py-3 text-center transition-colors hover:bg-purple-light"
                    @click="onChoose(option.value)"
                >
                    <div class="flex size-9 items-center justify-center rounded-lg border-2 border-purple bg-white">
                        <component :is="option.icon" class="size-5 text-purple" />
                    </div>
                    <p class="text-xs font-bold leading-tight text-black">{{ option.title }}</p>
                </button>
            </div>
            <p class="mt-5 text-xs leading-snug text-gray-500">
                Your answer stays on your device. It's used only to tune your version of Clario and is never shared with anyone else.
            </p>
        </template>

        <template v-else>
            <div class="flex flex-col items-center text-center">
                <CircleCheck class="mb-4 size-12 text-purple" :stroke-width="2" />
                <h3 class="text-base font-bold leading-snug text-purple">
                    Thank you — your answer will help your version of Clario adapt to your preferences.
                </h3>
                <p v-if="answeredLabel" class="mt-3 text-sm text-black">
                    You said this was <span class="font-bold">{{ answeredLabel }}</span>.
                </p>
                <p class="mt-6 text-xs leading-snug text-gray-500">
                    Your feedback stays on your device and is never shared with anyone else.
                </p>
            </div>
        </template>
    </section>
</template>

<script lang="ts" setup>
import type { SimplificationLevel } from '@/stores/appStateStore';
import { useFeedbackStore, type DifficultyChoice } from '@/stores/feedbackStore';
import { CircleCheck, Frown, Meh, Smile } from 'lucide-vue-next';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

const props = defineProps<{
    articleUrl: string;
    articleTitle: string;
    simplificationLevel: SimplificationLevel;
}>();

const feedbackStore = useFeedbackStore();

const options: Array<{
    value: DifficultyChoice;
    title: string;
    icon: typeof Smile;
}> = [
    { value: 'too_easy', title: 'Too easy', icon: Meh },
    { value: 'just_right', title: 'Just right', icon: Smile },
    { value: 'too_hard', title: 'Too hard', icon: Frown },
];

const answered = ref(feedbackStore.hasDifficultyFeedbackFor(props.articleUrl));

watch(
    () => props.articleUrl,
    url => {
        answered.value = feedbackStore.hasDifficultyFeedbackFor(url);
    },
);

const answeredLabel = computed(() => {
    const recorded = feedbackStore
        .getEventsByType('difficulty_feedback')
        .filter(e => e.articleUrl === props.articleUrl)
        .pop();
    if (!recorded) return '';
    return options.find(o => o.value === recorded.choice)?.title.toLowerCase() ?? '';
});

// Telemetry: record difficulty_check_shown the first time this section is at
// least half visible — the denominator for the check's completion rate, and a
// coarse "reached the end of Simple Read" signal. Once per article; the
// observer stays connected because the component survives article changes
// (articleUrl is a reactive prop).
const sectionEl = ref<HTMLElement | null>(null);
let observer: IntersectionObserver | null = null;

onMounted(() => {
    if (!sectionEl.value) return;
    observer = new IntersectionObserver(
        entries => {
            const visible = entries.some(entry => entry.isIntersecting);
            if (!visible || feedbackStore.hasCheckShownFor(props.articleUrl)) return;
            feedbackStore.recordEvent({
                type: 'difficulty_check_shown',
                timestamp: Date.now(),
                articleUrl: props.articleUrl,
                articleTitle: props.articleTitle,
                simplificationLevel: props.simplificationLevel,
            });
        },
        { threshold: 0.5 },
    );
    observer.observe(sectionEl.value);
});

onBeforeUnmount(() => {
    observer?.disconnect();
    observer = null;
});

async function onChoose(choice: DifficultyChoice) {
    answered.value = true;
    await feedbackStore.recordEvent({
        type: 'difficulty_feedback',
        timestamp: Date.now(),
        articleUrl: props.articleUrl,
        articleTitle: props.articleTitle,
        simplificationLevel: props.simplificationLevel,
        choice,
    });
}
</script>
