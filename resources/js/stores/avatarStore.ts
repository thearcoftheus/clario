import route from '@/helpers/route';
import { useHistoryStore } from '@/stores/historyStore';
import axios from 'axios';
import { defineStore, storeToRefs } from 'pinia';
import { ref, watch } from 'vue';

export type ScriptStatus = 'idle' | 'preparing' | 'ready' | 'error';

export interface Timepoint {
    markName: string;
    timeSeconds: number;
}

export const useAvatarStore = defineStore('avatar', () => {
    const scriptStatus = ref<ScriptStatus>('idle');
    const currentPageUrl = ref<string | null>(null);
    const scriptText = ref<string | null>(null);

    // Cached Cartesia PCM16 audio + word-level timepoints — survives WatchPane
    // unmount/remount so the user can return mid-generation without re-paying the
    // ~53s TTS step, and replays use the same caption timing.
    const cartesiaAudio = ref<Uint8Array | null>(null);
    const cartesiaAudioForUrl = ref<string | null>(null);
    const cartesiaTimepoints = ref<Timepoint[]>([]);

    // Watch history store for summary completion
    const historyStore = useHistoryStore();
    const { historyItems } = storeToRefs(historyStore);

    watch(
        () => historyItems.value[0],
        (item) => {
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
        scriptStatus.value = 'idle';
        scriptText.value = null;
        cartesiaAudio.value = null;
        cartesiaAudioForUrl.value = null;
        cartesiaTimepoints.value = [];
    }

    function cacheCartesiaAudio(data: { audio: Uint8Array; timepoints: Timepoint[]; url: string }) {
        cartesiaAudio.value = data.audio;
        cartesiaAudioForUrl.value = data.url;
        cartesiaTimepoints.value = data.timepoints;
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

    return {
        scriptStatus,
        currentPageUrl,
        scriptText,
        cartesiaAudio,
        cartesiaAudioForUrl,
        cartesiaTimepoints,
        prepareScript,
        cacheCartesiaAudio,
        reset,
    };
});
