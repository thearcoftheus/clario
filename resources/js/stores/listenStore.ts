import { defineStore } from 'pinia';
import { ref } from 'vue';

interface Timepoint {
    markName: string;
    timeSeconds: number;
}

export const useListenStore = defineStore('listen', () => {
    // Cached audio data (persists across navigation)
    const audioBase64 = ref<string | null>(null);
    const words = ref<string[]>([]);
    const timepoints = ref<Timepoint[]>([]);
    const lastPosition = ref(0);
    const audioDuration = ref(0);

    // Track which article this audio is for
    const generatedForUrl = ref<string | null>(null);

    function cacheAudio(data: {
        audio: string;
        words: string[];
        timepoints: Timepoint[];
        url: string;
    }) {
        audioBase64.value = data.audio;
        words.value = data.words;
        timepoints.value = data.timepoints;
        generatedForUrl.value = data.url;
        lastPosition.value = 0;
    }

    function savePosition(position: number, duration: number) {
        lastPosition.value = position;
        audioDuration.value = duration;
    }

    function reset() {
        audioBase64.value = null;
        words.value = [];
        timepoints.value = [];
        lastPosition.value = 0;
        audioDuration.value = 0;
        generatedForUrl.value = null;
    }

    return {
        audioBase64,
        words,
        timepoints,
        lastPosition,
        audioDuration,
        generatedForUrl,
        cacheAudio,
        savePosition,
        reset,
    };
});
