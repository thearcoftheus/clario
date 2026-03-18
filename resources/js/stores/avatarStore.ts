import route from '@/helpers/route';
import axios from 'axios';
import { defineStore } from 'pinia';
import { ref } from 'vue';

export type AvatarStatus = 'idle' | 'generating' | 'polling' | 'ready' | 'error';

export const useAvatarStore = defineStore('avatar', () => {
    const status = ref<AvatarStatus>('idle');
    const videoUrl = ref<string | null>(null);
    const jobId = ref<string | null>(null);
    const currentPageUrl = ref<string | null>(null);
    const errorMessage = ref<string | null>(null);

    let pollInterval: ReturnType<typeof setInterval> | null = null;
    let pollCount = 0;
    const MAX_POLLS = 36; // 3 minutes at 5 second intervals

    function reset() {
        stopPolling();
        status.value = 'idle';
        videoUrl.value = null;
        jobId.value = null;
        errorMessage.value = null;
        pollCount = 0;
    }

    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
        }
    }

    async function generateAvatarVideo(pageUrl: string, title: string, summary: string) {
        // Don't generate if already generating for this page
        if (currentPageUrl.value === pageUrl && (status.value === 'generating' || status.value === 'polling')) {
            return;
        }

        // If navigating to a new page, reset state
        if (currentPageUrl.value !== pageUrl) {
            reset();
            currentPageUrl.value = pageUrl;
        }

        status.value = 'generating';
        errorMessage.value = null;

        try {
            const response = await axios.post(route('avatar.generate'), {
                title,
                summary,
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
        videoUrl,
        jobId,
        currentPageUrl,
        errorMessage,
        generateAvatarVideo,
        reset,
        stopPolling,
    };
});
