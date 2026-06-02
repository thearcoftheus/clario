<template>
    <div class="flex h-full flex-col px-10 py-6">
        <div class="flex-1">
            <h1 ref="headingRef" tabindex="-1" class="text-purple text-2xl leading-tight font-bold tracking-tight outline-none">
                Thank you, feel free to explore Clario
            </h1>

            <p class="mt-5 text-base leading-snug text-black">Just open any website in your browser and clario will automatically start.</p>

            <h2 class="mt-6 text-base font-bold text-black">Tip and tricks</h2>

            <p class="mt-3 text-base leading-snug text-black">
                Look for the
                <Settings :stroke-width="2.5" class="text-purple mx-1 inline-block size-4 align-text-bottom" aria-label="settings" />
                icon to change things like font size, reading style, and article length
            </p>

            <p class="mt-4 text-base leading-snug text-black">Make the screen wider using the slider on the left</p>
        </div>

        <button type="button" class="bg-purple w-full cursor-pointer rounded-xl py-3 text-base font-bold text-white" @click="$emit('complete')">
            Get Started
        </button>
    </div>
</template>

<script lang="ts" setup>
import { Settings } from 'lucide-vue-next';
import { nextTick, onMounted, ref } from 'vue';

defineEmits<{
    complete: [];
}>();

const headingRef = ref<HTMLHeadingElement>();

onMounted(() => {
    nextTick(() => headingRef.value?.focus());
});
</script>
