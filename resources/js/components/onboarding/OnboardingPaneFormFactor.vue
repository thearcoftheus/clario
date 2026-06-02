<template>
    <div class="flex h-full flex-col px-6 py-6">
        <div class="flex-1">
            <p class="text-purple text-sm font-medium">How Do You Like To Learn?</p>
            <h1 ref="headingRef" tabindex="-1" class="text-purple mt-1 text-xl leading-tight font-bold tracking-tight outline-none">
                When you want to understand something, what helps most?
                <span class="ml-1 text-sm font-medium">Choose all apply to you</span>
            </h1>

            <fieldset class="mt-6 flex flex-col gap-3 border-0 p-0">
                <legend class="sr-only">Preferred ways to learn</legend>
                <label
                    v-for="option in options"
                    :key="option.value"
                    :class="[
                        'border-purple flex cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                        selected.includes(option.value) ? 'bg-purple-light' : 'bg-white',
                    ]"
                >
                    <div class="bg-purple-light flex size-10 shrink-0 items-center justify-center rounded-lg">
                        <img :src="option.icon" alt="" class="size-7" />
                    </div>
                    <div class="flex-1">
                        <p class="text-sm leading-tight font-bold text-black">{{ option.title }}</p>
                        <p class="mt-1 text-xs leading-snug text-black">{{ option.subtitle }}</p>
                    </div>
                    <span
                        :class="[
                            'flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors',
                            selected.includes(option.value) ? 'border-purple' : 'border-gray-400',
                        ]"
                    >
                        <span v-if="selected.includes(option.value)" class="bg-purple size-2.5 rounded-full" />
                    </span>
                    <input type="checkbox" :value="option.value" v-model="selected" class="sr-only" />
                </label>
            </fieldset>
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
import type { FormFactor } from '@/stores/appStateStore';
import { nextTick, onMounted, ref } from 'vue';

import bookIcon from '@/../icons/sidebar/book.svg';
import earSoundIcon from '@/../icons/sidebar/ear-sound.svg';
import explainerIcon from '@/../icons/sidebar/explainer.svg';
import personRaisedHandIcon from '@/../icons/sidebar/person-raised-hand.svg';

const props = defineProps<{
    initial?: FormFactor[];
}>();

const emit = defineEmits<{
    next: [value: FormFactor[]];
    back: [];
    'skip-question': [];
}>();

const options: Array<{
    value: FormFactor;
    title: string;
    subtitle: string;
    icon: string;
}> = [
    {
        value: 'summary',
        title: 'I like To Read',
        subtitle: 'Show me the text version first',
        icon: bookIcon,
    },
    {
        value: 'narrate',
        title: 'I like To Listen',
        subtitle: 'Show me the text version first',
        icon: earSoundIcon,
    },
    {
        value: 'avatar',
        title: 'I like To Watch',
        subtitle: 'Show me the text version first',
        icon: explainerIcon,
    },
    {
        value: 'chat',
        title: 'I Like To Ask Questions',
        subtitle: 'I like chatting with someone about it',
        icon: personRaisedHandIcon,
    },
];

const selected = ref<FormFactor[]>(props.initial ? [...props.initial] : []);

const headingRef = ref<HTMLHeadingElement>();

onMounted(() => {
    nextTick(() => headingRef.value?.focus());
});

function onSaveNext() {
    if (selected.value.length > 0) {
        emit('next', [...selected.value]);
    } else {
        emit('skip-question');
    }
}
</script>
