<template>
    <div class="flex h-full flex-col px-10 py-6">
        <div class="flex-1">
            <div class="flex items-center gap-3">
                <h1 ref="headingRef" tabindex="-1" class="text-purple text-2xl leading-tight font-bold tracking-tight outline-none">
                    Hi! Welcome<br />to Clario :)
                </h1>
                <svg class="size-[44px] shrink-0" viewBox="0 0 63 63" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="63" height="63" rx="14" fill="#5C2B85" />
                    <rect x="11" y="8" width="19" height="44" rx="3" fill="white" />
                    <rect x="30" y="8" width="6" height="44" rx="1" fill="white" opacity="0.6" />
                    <rect x="36" y="8" width="16" height="44" rx="3" fill="white" opacity="0.8" />
                </svg>
            </div>

            <p class="mt-5 text-base leading-snug text-black">Clario is here to help make web pages easier to read and understand.</p>
            <p class="mt-4 text-base leading-snug text-black">Let me ask you two quick questions so I can set up the way that works best for you.</p>
        </div>

        <hr class="border-card-border/30 mb-4" />

        <button type="button" class="bg-purple w-full cursor-pointer rounded-xl py-3 text-base font-bold text-white" @click="$emit('next')">
            Lets Get Started
        </button>

        <button type="button" class="mt-4 cursor-pointer text-left text-sm text-black" @click="$emit('skip-all')">
            Skip — take me straight to Clario
        </button>
    </div>
</template>

<script lang="ts" setup>
import { nextTick, onMounted, ref } from 'vue';

defineEmits<{
    next: [];
    'skip-all': [];
}>();

const headingRef = ref<HTMLHeadingElement>();

onMounted(() => {
    nextTick(() => headingRef.value?.focus());
});
</script>
