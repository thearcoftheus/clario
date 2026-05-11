<template>
    <div class="flex overflow-hidden rounded-xl border-[0.5px] border-card-border bg-white">
        <img
            v-if="image && !loadFailed"
            :src="image"
            alt=""
            class="h-[60px] w-[70px] shrink-0 object-cover"
            @error="loadFailed = true"
        />
        <div
            v-else
            class="flex h-[60px] w-[70px] shrink-0 items-center justify-center bg-purple-light"
        >
            <Newspaper class="size-7 text-purple" />
        </div>
        <div class="flex items-center p-2">
            <p class="text-base font-bold leading-tight tracking-tight text-black">
                {{ title }}
            </p>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Newspaper } from 'lucide-vue-next';
import { ref, watch } from 'vue';

const props = defineProps<{
    image?: string;
    title: string;
}>();

const loadFailed = ref(false);

// Reset error state when the image URL changes (e.g., navigating to a new article).
watch(() => props.image, () => { loadFailed.value = false; });
</script>
