import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';
import { useListenStore } from '@/stores/listenStore';
import axios from 'axios';
import { onBeforeUnmount, ref } from 'vue';

interface Timepoint {
    markName: string;
    timeSeconds: number;
}

export function useListenPlayer() {
    const listenStore = useListenStore();

    const isGenerating = ref(false);
    const isPlaying = ref(false);
    const isPaused = ref(false);
    const hasAudio = ref(false);
    const error = ref<string | null>(null);

    const currentTime = ref(0);
    const duration = ref(0);
    const progress = ref(0);
    const currentWordIndex = ref(-1);

    const words = ref<string[]>([]);
    const timepoints = ref<Timepoint[]>([]);
    const speed = ref(1);

    let audioElement: HTMLAudioElement | null = null;
    let blobUrl: string | null = null;
    let animFrameId: number | null = null;
    let estimatedTimings: number[] | null = null;
    let disposed = false;

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
     * Try to restore from the listen store (cached audio from a previous visit).
     * Returns true if restored successfully.
     */
    function restoreFromStore(articleUrl: string): boolean {
        if (
            listenStore.audioBase64 &&
            listenStore.generatedForUrl === articleUrl &&
            listenStore.words.length > 0
        ) {
            words.value = listenStore.words;
            timepoints.value = listenStore.timepoints;
            estimatedTimings = null;
            createAudioElement(listenStore.audioBase64, listenStore.lastPosition);
            return true;
        }
        return false;
    }

    async function generate(content: string, articleUrl: string, voice: string = 'en-US-Neural2-C') {
        // Try restoring from store first
        if (restoreFromStore(articleUrl)) {
            return;
        }

        if (isGenerating.value) return;

        isGenerating.value = true;
        error.value = null;

        try {
            const response = await axios.post(
                route('narrate-sync'),
                { content, voice, language: 'en-US' },
                { headers: getApiHeaders() },
            );

            if (disposed) return;

            const data = response.data;

            words.value = data.text.split(/\s+/).filter((w: string) => w.length > 0);
            timepoints.value = data.timepoints || [];
            estimatedTimings = null;

            // Cache in the store for persistence across navigation
            listenStore.cacheAudio({
                audio: data.audio,
                words: words.value,
                timepoints: timepoints.value,
                url: articleUrl,
            });

            createAudioElement(data.audio);
        } catch (e: any) {
            if (disposed) return;
            console.error('Failed to generate audio:', e);
            error.value = e.response?.data?.message || 'Failed to generate audio';
        } finally {
            if (!disposed) isGenerating.value = false;
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
    }

    function cleanup() {
        stopHighlightLoop();
        // Save position to store before destroying
        if (audioElement && hasAudio.value) {
            listenStore.savePosition(audioElement.currentTime, duration.value);
        }
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

    onBeforeUnmount(() => {
        disposed = true;
        cleanup();
    });

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
        cleanup,
    };
}
