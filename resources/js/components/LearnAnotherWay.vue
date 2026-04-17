<template>
    <div>
        <h2 class="mb-2 text-lg font-bold leading-tight tracking-tight text-purple">
            Learn Another Way
        </h2>
        <div class="flex gap-2">
            <button
                v-if="exclude !== 'narrate'"
                class="flex flex-1 cursor-pointer items-center overflow-hidden rounded-lg border-[0.5px] border-card-border bg-gray-light px-2 py-1.5"
                @click="nav.setActiveView('narrate')"
            >
                <div class="mr-1.5 flex size-[28px] shrink-0 items-center justify-center rounded-lg bg-sidebar-bg">
                    <img :src="earSoundIcon" alt="" class="size-[24px]" />
                </div>
                <span class="text-sm font-bold leading-tight tracking-tight text-purple">Listen</span>
            </button>

            <button
                v-if="exclude !== 'chat'"
                class="flex flex-1 cursor-pointer items-center overflow-hidden rounded-lg border-[0.5px] border-card-border bg-gray-light px-2 py-1.5"
                @click="nav.setActiveView('chat')"
            >
                <div class="mr-1.5 flex size-[28px] shrink-0 items-center justify-center rounded-lg bg-sidebar-bg">
                    <img :src="personRaisedHandIcon" alt="" class="size-[28px]" />
                </div>
                <span class="text-sm font-bold leading-tight tracking-tight text-purple">Ask</span>
            </button>

            <button
                v-if="exclude !== 'avatar'"
                class="flex flex-1 cursor-pointer items-center overflow-hidden rounded-lg border-[0.5px] border-card-border bg-gray-light px-2 py-1.5"
                @click="nav.setActiveView('avatar')"
            >
                <div class="mr-1.5 flex size-[28px] shrink-0 items-center justify-center rounded-lg bg-sidebar-bg">
                    <img :src="animatedImagesIcon" alt="" class="size-[28px]" />
                </div>
                <span class="text-sm font-bold leading-tight tracking-tight text-purple">Watch</span>
            </button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { useNavigation, type View } from '@/composables/useNavigation';

import earSoundIcon from '@/../icons/sidebar/ear-sound.svg';
import personRaisedHandIcon from '@/../icons/sidebar/person-raised-hand.svg';
import animatedImagesIcon from '@/../icons/sidebar/animated-images.svg';

defineProps<{
    exclude: View;
}>();

const nav = useNavigation();
</script>
