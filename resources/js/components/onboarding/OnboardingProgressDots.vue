<template>
    <div
        role="progressbar"
        :aria-valuenow="current"
        :aria-valuemin="1"
        :aria-valuemax="total"
        :aria-label="`Step ${current} of ${total}`"
        class="flex items-center justify-center gap-2"
    >
        <span
            v-for="step in total"
            :key="step"
            class="h-1.5 w-10 rounded-full transition-colors"
            :class="step === current ? 'bg-purple' : 'bg-purple-light'"
        />
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    current: number;
    total: number;
}>();
</script>
