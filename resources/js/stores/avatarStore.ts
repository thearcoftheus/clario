import route from '@/helpers/route';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import axios from 'axios';
import { defineStore, storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

export type AvatarStatus = 'idle' | 'generating' | 'polling' | 'ready' | 'error';
export type ScriptStatus = 'idle' | 'preparing' | 'ready' | 'error';

export const useAvatarStore = defineStore('avatar', () => {
    const status = ref<AvatarStatus>('idle');
    const scriptStatus = ref<ScriptStatus>('idle');
    const videoUrl = ref<string | null>(null);
    const jobId = ref<string | null>(null);
    const currentPageUrl = ref<string | null>(null);
    const errorMessage = ref<string | null>(null);
    const scriptText = ref<string | null>(null);

    // Cached Cartesia PCM16 audio — survives WatchPane unmount/remount so the
    // user can return mid-generation without re-paying the ~53s TTS step.
    const cartesiaAudio = ref<Uint8Array | null>(null);
    const cartesiaAudioForUrl = ref<string | null>(null);

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let pollCount = 0;
    const MAX_POLLS = 36; // 3 minutes at 5 second intervals

    // Watch history store for summary completion
    const historyStore = useHistoryStore();
    const { historyItems } = storeToRefs(historyStore);

    // Get app settings for reading level
    const appStateStore = useAppStateStore();
    const { settings } = storeToRefs(appStateStore);

    watch(
        () => historyItems.value[0],
        (item, oldItem) => {
            if (!item) return;

            // If this is a new page, reset
            if (item.url !== currentPageUrl.value) {
                reset();
                currentPageUrl.value = item.url;
            }

            // When summary streaming completes, prepare the script (use AI title if available)
            if (!item.isFetching && !item.isStreaming && item.simplifiedContent && scriptStatus.value === 'idle') {
                prepareScript(item.aiTitle || item.name, item.simplifiedContent);
            }
        },
        { deep: true, immediate: true }
    );

    function reset() {
        stopPolling();
        status.value = 'idle';
        scriptStatus.value = 'idle';
        videoUrl.value = null;
        jobId.value = null;
        errorMessage.value = null;
        scriptText.value = null;
        cartesiaAudio.value = null;
        cartesiaAudioForUrl.value = null;
        pollCount = 0;
    }

    function cacheCartesiaAudio(data: { audio: Uint8Array; url: string }) {
        cartesiaAudio.value = data.audio;
        cartesiaAudioForUrl.value = data.url;
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    async function prepareScript(title: string, summary: string) {
        if (scriptStatus.value === 'preparing' || scriptStatus.value === 'ready') {
            return;
        }

        scriptStatus.value = 'preparing';

        try {
            const response = await axios.post(route('avatar.script'), {
                title,
                summary,
                simplificationLevel: settings.value.simplificationLevel,
            });

            if (response.data.script) {
                scriptText.value = response.data.script;
                scriptStatus.value = 'ready';
            } else {
                scriptStatus.value = 'error';
            }
        } catch (error) {
            console.error('Script preparation failed:', error);
            scriptStatus.value = 'error';
        }
    }

    async function generateAvatarVideo() {
        // Need the script to be ready first
        if (scriptStatus.value !== 'ready' || !scriptText.value) {
            console.error('Script not ready');
            return;
        }

        // Don't generate if already generating
        if (status.value === 'generating' || status.value === 'polling') {
            return;
        }

        const item = historyItems.value[0];
        if (!item) return;

        status.value = 'generating';
        errorMessage.value = null;

        try {
            const response = await axios.post(route('avatar.generate'), {
                title: item.name,
                summary: item.simplifiedContent,
                simplificationLevel: settings.value.simplificationLevel,
            });

            if (response.data.jobId) {
                jobId.value = response.data.jobId;
                status.value = 'polling';
                startPolling();
            } else {
                status.value = 'error';
                errorMessage.value = 'No job ID returned';
            }
        } catch (error) {
            // Fail silently - don't show error to user
            console.error('Avatar generation failed:', error);
            status.value = 'idle';
        }
    }

    function startPolling() {
        pollCount = 0;
        pollInterval = setInterval(async () => {
            pollCount++;

            if (pollCount > MAX_POLLS) {
                // Give up silently after 3 minutes
                stopPolling();
                status.value = 'idle';
                return;
            }

            if (!jobId.value) {
                stopPolling();
                return;
            }

            try {
                const response = await axios.get(route('avatar.status', { jobId: jobId.value }));
                const data = response.data;

                if (data.status === 'done' && data.videoUrl) {
                    videoUrl.value = data.videoUrl;
                    status.value = 'ready';
                    stopPolling();
                } else if (data.status === 'error') {
                    // Fail silently
                    console.error('Avatar generation error:', data.error);
                    status.value = 'idle';
                    stopPolling();
                }
                // Otherwise keep polling (status is 'created', 'started', etc.)
            } catch (error) {
                // Fail silently
                console.error('Avatar status check failed:', error);
            }
        }, 5000); // Poll every 5 seconds
    }

    return {
        status,
        scriptStatus,
        videoUrl,
        jobId,
        currentPageUrl,
        errorMessage,
        scriptText,
        cartesiaAudio,
        cartesiaAudioForUrl,
        prepareScript,
        generateAvatarVideo,
        cacheCartesiaAudio,
        reset,
        stopPolling,
    };
});
