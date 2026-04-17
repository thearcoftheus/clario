import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';
import axios from 'axios';
import { onBeforeUnmount, ref } from 'vue';

interface Timepoint {
    markName: string;
    timeSeconds: number;
}

export function useListenPlayer() {
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

    /**
     * Build estimated word start times weighted by character length.
     * Longer words get proportionally more time. Punctuation at end of words
     * adds a small pause to simulate natural speech rhythm.
     */
    function buildEstimatedTimings(wordList: string[], totalDuration: number): number[] {
        const weights = wordList.map(word => {
            let w = Math.max(word.length, 1);
            // Add pause weight for sentence-ending punctuation
            if (/[.!?]$/.test(word)) w += 3;
            // Add small pause for commas, semicolons
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

    async function generate(content: string, voice: string = 'en-US-Neural2-C') {
        if (isGenerating.value) return;

        isGenerating.value = true;
        error.value = null;

        try {
            const response = await axios.post(
                route('narrate-sync'),
                { content, voice, language: 'en-US' },
                { headers: getApiHeaders() },
            );

            const data = response.data;

            // Store words and timepoints
            words.value = data.text.split(/\s+/).filter((w: string) => w.length > 0);
            timepoints.value = data.timepoints || [];

            // Convert base64 audio to blob
            const binaryString = atob(data.audio);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const blob = new Blob([bytes], { type: 'audio/mpeg' });

            // Clean up old audio and reset estimated timings
            cleanup();
            estimatedTimings = null;

            blobUrl = URL.createObjectURL(blob);
            audioElement = new Audio(blobUrl);
            audioElement.playbackRate = speed.value;

            audioElement.addEventListener('loadedmetadata', () => {
                duration.value = audioElement!.duration;
            });

            audioElement.addEventListener('timeupdate', () => {
                currentTime.value = audioElement!.currentTime;
                if (duration.value > 0) {
                    progress.value = (audioElement!.currentTime / duration.value) * 100;
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

            // Auto-play
            await audioElement.play();
        } catch (e: any) {
            console.error('Failed to generate audio:', e);
            error.value = e.response?.data?.message || 'Failed to generate audio';
        } finally {
            isGenerating.value = false;
        }
    }

    function startHighlightLoop() {
        function tick() {
            if (!audioElement || !isPlaying.value) return;

            const time = audioElement.currentTime;

            if (timepoints.value.length > 0) {
                // Binary search for the current word
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
                // Fallback: estimate based on word character length (weighted distribution)
                if (!estimatedTimings) {
                    estimatedTimings = buildEstimatedTimings(words.value, duration.value);
                }
                // Binary search estimated timings
                let lo2 = 0;
                let hi2 = estimatedTimings.length - 1;
                let result2 = -1;
                while (lo2 <= hi2) {
                    const mid2 = (lo2 + hi2) >> 1;
                    if (estimatedTimings[mid2] <= time) {
                        result2 = mid2;
                        lo2 = mid2 + 1;
                    } else {
                        hi2 = mid2 - 1;
                    }
                }
                currentWordIndex.value = result2;
            }

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
        cleanup,
    };
}
