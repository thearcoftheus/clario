<template>
    <StyledTab>
        <div v-if="historyItems.length === 0" class="self-center py-8 text-center italic accent-gray-700">
            Refresh page to see summary
        </div>
        <div v-else class="p-6">
            <div class="space-y-6">
                <!-- Status Display -->
                <div class="flex items-center justify-between rounded-lg border p-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-full"
                            :class="{
                                'bg-blue-100': status === 'generating' || status === 'polling',
                                'bg-green-100': status === 'ready',
                                'bg-gray-100': status === 'idle',
                            }"
                        >
                            <Loader2
                                v-if="status === 'generating' || status === 'polling'"
                                class="h-5 w-5 animate-spin text-blue-600"
                            />
                            <Video v-else-if="status === 'ready'" class="h-5 w-5 text-green-600" />
                            <User v-else class="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <div class="font-medium">{{ statusText }}</div>
                            <div class="text-sm text-muted-foreground">{{ statusDescription }}</div>
                        </div>
                    </div>
                </div>

                <!-- Generate Button -->
                <div v-if="status === 'idle'" class="flex flex-col gap-3">
                    <Button @click="handleGenerate" class="w-full" size="lg">
                        <User class="mr-2 h-5 w-5" />
                        Generate Reading Avatar
                    </Button>
                    <p class="text-center text-xs text-muted-foreground">
                        An AI avatar will read your summary aloud. This may take 15-45 seconds.
                    </p>
                </div>

                <!-- Loading State -->
                <div v-if="status === 'generating' || status === 'polling'" class="flex flex-col items-center gap-4 py-4">
                    <div class="h-16 w-16 animate-pulse rounded-full bg-blue-100"></div>
                    <p class="text-center text-sm text-muted-foreground">
                        Creating your avatar video... This typically takes 15-45 seconds.
                    </p>
                </div>

                <!-- Watch Button -->
                <div v-if="status === 'ready' && !isVideoVisible" class="flex flex-col gap-3">
                    <Button @click="showVideo" class="w-full" size="lg">
                        <Play class="mr-2 h-5 w-5" />
                        Watch Summary
                    </Button>
                </div>

                <!-- Video Player -->
                <div v-if="isVideoVisible && videoUrl" class="space-y-3">
                    <div class="overflow-hidden rounded-lg border">
                        <video
                            ref="videoRef"
                            :src="videoUrl"
                            controls
                            autoplay
                            class="w-full"
                            @error="handleVideoError"
                        />
                    </div>
                    <Button @click="hideVideo" variant="outline" class="w-full" size="sm">
                        Hide Video
                    </Button>
                </div>

                <!-- Summary Preview -->
                <div class="space-y-2">
                    <label class="text-sm font-medium">Summary to Read</label>
                    <div class="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
                        <Markdown :content="summaryText" />
                    </div>
                </div>
            </div>
        </div>
    </StyledTab>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import { Button } from '@/components/ui/button';
import StyledTab from '@/components/ui/StyledTab.vue';
import { useAvatarStore } from '@/stores/avatarStore';
import { useHistoryStore } from '@/stores/historyStore';
import { Loader2, Play, User, Video } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const avatarStore = useAvatarStore();
const { status, videoUrl } = storeToRefs(avatarStore);

const videoRef = ref<HTMLVideoElement | null>(null);
const isVideoVisible = ref(false);

// Get the summary text
const summaryText = computed(() => {
    return historyItems.value[0]?.simplifiedContent || '';
});

// Get the page title
const pageTitle = computed(() => {
    return historyItems.value[0]?.name || '';
});

// Get the page URL
const pageUrl = computed(() => {
    return historyItems.value[0]?.url || '';
});

// Status text display
const statusText = computed(() => {
    switch (status.value) {
        case 'generating':
        case 'polling':
            return 'Creating video...';
        case 'ready':
            return 'Video ready';
        default:
            return 'Avatar';
    }
});

// Status description
const statusDescription = computed(() => {
    switch (status.value) {
        case 'generating':
        case 'polling':
            return 'Please wait while we generate your avatar video';
        case 'ready':
            return 'Click below to watch the summary';
        default:
            return 'Generate an AI avatar to read your summary';
    }
});

function handleGenerate() {
    if (!summaryText.value || !pageTitle.value) return;
    avatarStore.generateAvatarVideo(pageUrl.value, pageTitle.value, summaryText.value);
}

function showVideo() {
    isVideoVisible.value = true;
}

function hideVideo() {
    isVideoVisible.value = false;
    if (videoRef.value) {
        videoRef.value.pause();
    }
}

function handleVideoError() {
    // Video URL expired or failed - reset state
    isVideoVisible.value = false;
    avatarStore.reset();
}
</script>
