<template>
    <StyledTab>
        <div v-if="historyItems.length === 0" class="self-center py-8 text-center italic accent-gray-700">
            Refresh page to see summary
        </div>

        <!-- Simli Provider -->
        <div v-else-if="settings.videoProvider === 'Simli'" class="p-6">
            <div class="space-y-6">
                <!-- Status Display -->
                <div class="flex items-center justify-between rounded-lg border p-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-full"
                            :class="{
                                'bg-blue-100': scriptStatus === 'preparing',
                                'bg-green-100': scriptStatus === 'ready',
                                'bg-gray-100': scriptStatus === 'idle',
                            }"
                        >
                            <Loader2
                                v-if="scriptStatus === 'preparing'"
                                class="h-5 w-5 animate-spin text-blue-600"
                            />
                            <Sparkles v-else-if="scriptStatus === 'ready'" class="h-5 w-5 text-green-600" />
                            <User v-else class="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                            <div class="font-medium">{{ simliStatusText }}</div>
                            <div class="text-sm text-muted-foreground">{{ simliStatusDescription }}</div>
                        </div>
                    </div>
                </div>

                <!-- Simli Avatar Component -->
                <SimliAvatar v-if="scriptStatus === 'ready'" :script-text="scriptText" />

                <!-- Script Preview -->
                <div class="space-y-2">
                    <label class="text-sm font-medium">Script to Read</label>
                    <div class="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
                        <div v-if="scriptStatus === 'preparing'" class="flex items-center gap-2 text-muted-foreground">
                            <Loader2 class="h-4 w-4 animate-spin" />
                            Preparing script...
                        </div>
                        <template v-else-if="scriptText">
                            {{ scriptText }}
                        </template>
                        <div v-else class="italic text-muted-foreground">
                            Waiting for summary to complete...
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- D-ID Provider -->
        <div v-else class="p-6">
            <div class="space-y-6">
                <!-- Status Display -->
                <div class="flex items-center justify-between rounded-lg border p-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-full"
                            :class="{
                                'bg-blue-100': status === 'generating' || status === 'polling' || scriptStatus === 'preparing',
                                'bg-green-100': status === 'ready',
                                'bg-gray-100': status === 'idle' && scriptStatus !== 'preparing',
                            }"
                        >
                            <Loader2
                                v-if="status === 'generating' || status === 'polling' || scriptStatus === 'preparing'"
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
                <div v-if="status === 'idle' && scriptStatus !== 'preparing'" class="flex flex-col gap-3">
                    <Button @click="handleGenerate" class="w-full" size="lg" :disabled="!canGenerate">
                        <User class="mr-2 h-5 w-5" />
                        Generate Reading Avatar
                    </Button>
                    <p class="text-center text-xs text-muted-foreground">
                        An AI avatar will read your summary aloud. This may take up to 2 minutes.
                    </p>
                </div>

                <!-- Loading State -->
                <div v-if="status === 'generating' || status === 'polling'" class="flex flex-col items-center gap-4 py-4">
                    <div class="h-16 w-16 animate-pulse rounded-full bg-blue-100"></div>
                    <p class="text-center text-sm text-muted-foreground">
                        Creating your avatar video... This may take up to 2 minutes.
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

                <!-- Script Preview -->
                <div class="space-y-2">
                    <label class="text-sm font-medium">Script to Read</label>
                    <div class="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
                        <div v-if="scriptStatus === 'preparing'" class="flex items-center gap-2 text-muted-foreground">
                            <Loader2 class="h-4 w-4 animate-spin" />
                            Preparing script...
                        </div>
                        <template v-else-if="scriptText">
                            {{ scriptText }}
                        </template>
                        <div v-else class="italic text-muted-foreground">
                            Waiting for summary to complete...
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </StyledTab>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import StyledTab from '@/components/ui/StyledTab.vue';
import { useAppStateStore } from '@/stores/appStateStore';
import { useAvatarStore } from '@/stores/avatarStore';
import { useHistoryStore } from '@/stores/historyStore';
import SimliAvatar from '@/components/SimliAvatar.vue';
import { Loader2, Play, Sparkles, User, Video } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';

const appStateStore = useAppStateStore();
const { settings } = storeToRefs(appStateStore);

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const avatarStore = useAvatarStore();
const { status, scriptStatus, videoUrl, scriptText } = storeToRefs(avatarStore);

const videoRef = ref<HTMLVideoElement | null>(null);
const isVideoVisible = ref(false);

// Check if we can generate (script must be ready)
const canGenerate = computed(() => {
    return scriptStatus.value === 'ready' && status.value === 'idle';
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
            if (scriptStatus.value === 'preparing') {
                return 'Preparing script...';
            }
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
            if (scriptStatus.value === 'preparing') {
                return 'Condensing your summary for the avatar';
            }
            return 'Generate an AI avatar to read your summary';
    }
});

// Simli status text display
const simliStatusText = computed(() => {
    if (scriptStatus.value === 'preparing') {
        return 'Preparing script...';
    }
    if (scriptStatus.value === 'ready') {
        return 'Ready to stream';
    }
    return 'Avatar';
});

// Simli status description
const simliStatusDescription = computed(() => {
    if (scriptStatus.value === 'preparing') {
        return 'Condensing your summary for the avatar';
    }
    if (scriptStatus.value === 'ready') {
        return 'Click Start Avatar to begin streaming';
    }
    return 'Real-time avatar powered by Simli';
});

function handleGenerate() {
    avatarStore.generateAvatarVideo();
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
