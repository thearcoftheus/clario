<template>
    <div class="flex h-full flex-col px-6 py-6">
        <div class="flex-1">
            <p class="text-purple text-sm font-medium">How do you like to read?</p>
            <h1 ref="headingRef" tabindex="-1" class="text-purple mt-1 text-xl leading-tight font-bold tracking-tight outline-none">
                When you read something online, how do you like it?
            </h1>

            <div role="radiogroup" aria-label="Reading level preference" class="mt-6 flex flex-col gap-3">
                <label
                    v-for="option in options"
                    :key="option.value"
                    :class="[
                        'border-purple flex cursor-pointer items-start gap-3 rounded-xl border-2 p-3 transition-colors',
                        selected === option.value ? 'bg-purple-light' : 'bg-white',
                    ]"
                >
                    <div class="border-purple flex size-10 shrink-0 items-center justify-center rounded-lg border-2 bg-white">
                        <component :is="option.icon" class="text-purple size-5" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm leading-tight font-bold text-black">{{ option.title }}</p>
                        <p class="mt-1 text-xs leading-snug text-black">{{ option.subtitle }}</p>
                    </div>
                    <span
                        :class="[
                            'mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            selected === option.value ? 'border-purple' : 'border-gray-400',
                        ]"
                    >
                        <span v-if="selected === option.value" class="bg-purple size-2.5 rounded-full" />
                    </span>
                    <input type="radio" name="reading-level" :value="option.value" v-model="selected" class="sr-only" />
                </label>
            </div>
        </div>

        <hr class="border-card-border/30 mb-3" />

        <button type="button" class="mx-auto mb-4 cursor-pointer text-sm text-black" @click="$emit('skip-question')">
            Skip - Let Clario decide for me
        </button>

        <div class="flex gap-3">
            <button
                type="button"
                class="border-purple bg-purple-light text-purple flex-1 cursor-pointer rounded-xl border-2 py-2.5 text-base font-bold"
                @click="$emit('back')"
            >
                Back
            </button>
            <button type="button" class="bg-purple flex-1 cursor-pointer rounded-xl py-2.5 text-base font-bold text-white" @click="onSaveNext">
                Save & Next
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import type { SimplificationLevel } from '@/stores/appStateStore';
import { Layers, Sparkles, Type } from 'lucide-vue-next';
import { nextTick, onMounted, ref } from 'vue';

const props = defineProps<{
    initial?: SimplificationLevel | null;
}>();

const emit = defineEmits<{
    next: [value: SimplificationLevel];
    back: [];
    'skip-question': [];
}>();

const options: Array<{
    value: SimplificationLevel;
    title: string;
    subtitle: string;
    icon: typeof Sparkles;
}> = [
    {
        value: 'Easy',
        title: 'Simple words and short sentences',
        subtitle: 'Clario rewrites pages in plain language',
        icon: Sparkles,
    },
    {
        value: 'Moderate',
        title: 'A mix — some simple, some regular',
        subtitle: 'Clario adjusts the harder parts',
        icon: Layers,
    },
    {
        value: 'Challenging',
        title: 'Regular text is fine for me',
        subtitle: 'I just want help with summaries and audio',
        icon: Type,
    },
];

const selected = ref<SimplificationLevel | null>(props.initial ?? null);

const headingRef = ref<HTMLHeadingElement>();

onMounted(() => {
    nextTick(() => headingRef.value?.focus());
});

function onSaveNext() {
    if (selected.value) {
        emit('next', selected.value);
    } else {
        emit('skip-question');
    }
}
</script>
