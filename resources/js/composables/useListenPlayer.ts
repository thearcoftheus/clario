import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { useListenStore } from '@/stores/listenStore';
import axios from 'axios';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

/**
 * Playback for the Listen pane. Everything about *which* audio exists —
 * the words, whether a generation is in flight, the last error — is derived
 * from listenStore for the article on screen, so a tab switch can never
 * leave one article's transcript in the pane under another's title. This
 * composable owns only the HTMLAudioElement and its playback state.
 */
export function useListenPlayer() {
    const listenStore = useListenStore();
    const appStateStore = useAppStateStore();
    const { currentItem } = storeToRefs(useHistoryStore());

    const currentUrl = computed(() => currentItem.value?.url ?? null);
    // Hit only if the cached audio was made from the text now on screen, so a
    // regeneration under new settings is a miss until the user generates again.
    const entry = computed(() => listenStore.find(currentUrl.value, currentItem.value?.simplifiedContent));
    const words = computed(() => entry.value?.words ?? []);
    const timepoints = computed(() => entry.value?.timepoints ?? []);
    const isGenerating = computed(() => currentUrl.value !== null && listenStore.isGenerating(currentUrl.value));
    const error = computed(() => (currentUrl.value ? listenStore.errorFor(currentUrl.value) : null));

    const isPlaying = ref(false);
    const isPaused = ref(false);
    const hasAudio = ref(false);

    const currentTime = ref(0);
    const duration = ref(0);
    const progress = ref(0);
    const currentWordIndex = ref(-1);

    const speed = ref(appStateStore.settings.playbackSpeed);

    let audioElement: HTMLAudioElement | null = null;
    // The article the current audio element was built for.
    let loadedUrl: string | null = null;
    let blobUrl: string | null = null;
    let animFrameId: number | null = null;
    let estimatedTimings: number[] | null = null;

    /**
     * Build estimated word start times weighted by character length.
     */
    function buildEstimatedTimings(wordList: string[], totalDuration: number): number[] {
        const weights = wordList.map(word => {
            let w = Math.max(word.length, 1);
            if (/[.!?]$/.test(word)) w += 3;
            else if (/[,;:]$/.test(word)) w += 1.5;
            return w;
        });

        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        const timings: number[] = [];
        let cumulative = 0;

        for (let i = 0; i < weights.length; i++) {
            timings.push(cumulative);
            cumulative += (weights[i] / totalWeight) * totalDuration;
        }

        return timings;
    }

    /**
     * Create an HTMLAudioElement from base64 data and wire up event listeners.
     * Optionally seek to a starting position.
     */
    function createAudioElement(base64Audio: string, startAt: number = 0) {
        const binaryString = atob(base64Audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'audio/mpeg' });

        // Clean up old audio element
        if (audioElement) {
            audioElement.pause();
            audioElement.removeAttribute('src');
        }
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
        }

        blobUrl = URL.createObjectURL(blob);
        audioElement = new Audio(blobUrl);
        audioElement.playbackRate = speed.value;

        audioElement.addEventListener('loadedmetadata', () => {
            if (!audioElement) return;
            duration.value = audioElement.duration;
            if (startAt > 0 && startAt < audioElement.duration) {
                audioElement.currentTime = startAt;
                currentTime.value = startAt;
                progress.value = (startAt / audioElement.duration) * 100;
                // Highlight the correct word for the restored position
                updateWordIndexForTime(startAt);
            }
        });

        audioElement.addEventListener('timeupdate', () => {
            if (!audioElement) return;
            currentTime.value = audioElement.currentTime;
            if (duration.value > 0) {
                progress.value = (audioElement.currentTime / duration.value) * 100;
            }
        });

        audioElement.addEventListener('play', () => {
            isPlaying.value = true;
            isPaused.value = false;
            startHighlightLoop();
        });

        audioElement.addEventListener('pause', () => {
            isPlaying.value = false;
            isPaused.value = true;
            stopHighlightLoop();
        });

        audioElement.addEventListener('ended', () => {
            isPlaying.value = false;
            isPaused.value = false;
            currentWordIndex.value = -1;
            stopHighlightLoop();
        });

        hasAudio.value = true;
    }

    /**
     * Generate audio for an article. Writes only to listenStore, under the
     * URL captured at click time: if the user has moved to another tab by the
     * time the reply lands, the audio waits in the cache for their return and
     * the `entry` watcher below never sees it. Nothing here needs to know
     * whether the pane is still mounted.
     */
    async function generate(content: string, articleUrl: string, voice: string = 'en-US-Neural2-C') {
        if (!listenStore.startGeneration(articleUrl)) return;

        try {
            const response = await axios.post(
                route('narrate-sync'),
                { content, voice, language: 'en-US' },
                { headers: getApiHeaders() },
            );

            const data = response.data;
            listenStore.cacheAudio(
                {
                    url: articleUrl,
                    content,
                    audio: data.audio,
                    words: data.text.split(/\s+/).filter((w: string) => w.length > 0),
                    timepoints: data.timepoints || [],
                },
                currentUrl.value,
            );
            listenStore.finishGeneration(articleUrl);
        } catch (e: any) {
            console.error('Failed to generate audio:', e);
            listenStore.finishGeneration(articleUrl, e.response?.data?.message || 'Failed to generate audio');
        }
    }

    function updateWordIndexForTime(time: number) {
        if (timepoints.value.length > 0) {
            let lo = 0;
            let hi = timepoints.value.length - 1;
            let result = -1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (timepoints.value[mid].timeSeconds <= time) {
                    result = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            currentWordIndex.value = result;
        } else if (words.value.length > 0 && duration.value > 0) {
            if (!estimatedTimings) {
                estimatedTimings = buildEstimatedTimings(words.value, duration.value);
            }
            let lo = 0;
            let hi = estimatedTimings.length - 1;
            let result = -1;
            while (lo <= hi) {
                const mid = (lo + hi) >> 1;
                if (estimatedTimings[mid] <= time) {
                    result = mid;
                    lo = mid + 1;
                } else {
                    hi = mid - 1;
                }
            }
            currentWordIndex.value = result;
        }
    }

    function startHighlightLoop() {
        function tick() {
            if (!audioElement || !isPlaying.value) return;
            updateWordIndexForTime(audioElement.currentTime);
            animFrameId = requestAnimationFrame(tick);
        }

        animFrameId = requestAnimationFrame(tick);
    }

    function stopHighlightLoop() {
        if (animFrameId !== null) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    function play() {
        audioElement?.play();
    }

    function pause() {
        audioElement?.pause();
    }

    function stop() {
        if (audioElement) {
            audioElement.pause();
            audioElement.currentTime = 0;
        }
        isPlaying.value = false;
        isPaused.value = false;
        currentWordIndex.value = -1;
        stopHighlightLoop();
    }

    function seekTo(fraction: number) {
        if (audioElement && duration.value > 0) {
            audioElement.currentTime = fraction * duration.value;
        }
    }

    function setSpeed(rate: number) {
        speed.value = rate;
        if (audioElement) {
            audioElement.playbackRate = rate;
        }
        appStateStore.updateSettings({ playbackSpeed: rate });
    }

    function cleanup() {
        stopHighlightLoop();
        // Save position to store before destroying
        if (audioElement && hasAudio.value && loadedUrl) {
            listenStore.savePosition(loadedUrl, audioElement.currentTime, duration.value);
        }
        loadedUrl = null;
        if (audioElement) {
            audioElement.pause();
            audioElement.removeAttribute('src');
            audioElement = null;
        }
        if (blobUrl) {
            URL.revokeObjectURL(blobUrl);
            blobUrl = null;
        }
        hasAudio.value = false;
        isPlaying.value = false;
        isPaused.value = false;
        currentTime.value = 0;
        duration.value = 0;
        progress.value = 0;
        currentWordIndex.value = -1;
    }

    function formatTime(seconds: number): string {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    }

    // The one place the audio element follows the cache. Fires on mount, on a
    // tab switch either way, when a generation finishes for the article on
    // screen (miss → hit), and when the text is regenerated under new
    // settings (hit → miss). A generation finishing for some other article
    // leaves `entry` untouched, so nothing here runs.
    watch(
        entry,
        cached => {
            if (!cached) {
                cleanup();
                return;
            }
            if (loadedUrl === cached.url && hasAudio.value) return;
            cleanup();
            estimatedTimings = null;
            loadedUrl = cached.url;
            listenStore.touch(cached.url);
            createAudioElement(cached.audioBase64, cached.lastPosition);
        },
        { immediate: true },
    );

    onBeforeUnmount(cleanup);

    return {
        isGenerating,
        isPlaying,
        isPaused,
        hasAudio,
        error,
        currentTime,
        duration,
        progress,
        currentWordIndex,
        words,
        speed,
        generate,
        play,
        pause,
        stop,
        seekTo,
        setSpeed,
        formatTime,
    };
}
