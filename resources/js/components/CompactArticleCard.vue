<template>
    <div class="flex overflow-hidden rounded-xl border-[0.5px] border-card-border bg-white">
        <img
            v-if="image"
            :src="image"
            alt=""
            class="h-[60px] w-[70px] shrink-0 object-cover"
        />
        <div class="flex items-center p-2">
            <p class="text-base font-bold leading-tight tracking-tight text-black">
                {{ title }}
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
defineProps<{
    image?: string;
    title: string;
}>();
</script>
