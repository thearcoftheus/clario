import route from '@/helpers/route';
import { decideScriptPrep, effectiveScriptStatus, type ScriptStatus } from '@/helpers/watchScript';
import { useHistoryStore } from '@/stores/historyStore';
import axios from 'axios';
import { defineStore, storeToRefs } from 'pinia';
import { computed, ref, watch } from 'vue';

export type { ScriptStatus } from '@/helpers/watchScript';

export interface Timepoint {
    markName: string;
    timeSeconds: number;
}

interface ScriptSlotState {
    url: string | null;
    summary: string | null;
    status: ScriptStatus;
    text: string | null;
}

export const useAvatarStore = defineStore('avatar', () => {
    // One script at a time, tagged with the article and the summary it was
    // prepared from. The panel follows the user across tabs, so the exported
    // status / text read as idle / null for any other article instead of
    // showing A's script under B's title — without throwing A's script away,
    // so coming back to A is still a hit.
    const slot = ref<ScriptSlotState>({ url: null, summary: null, status: 'idle', text: null });
    // Bumped per prepareScript call; a reply whose token has moved on is dropped.
    let prepareToken = 0;

    // Cached Cartesia PCM16 audio + word-level timepoints — survives WatchPane
    // unmount/remount so the user can return mid-generation without re-paying the
    // ~53s TTS step, and replays use the same caption timing. Single slot on
    // purpose: PCM16 is ~10 MB per five-minute article.
    const cartesiaAudio = ref<Uint8Array | null>(null);
    const cartesiaAudioForUrl = ref<string | null>(null);
    const cartesiaTimepoints = ref<Timepoint[]>([]);

    const historyStore = useHistoryStore();
    const { currentItem } = storeToRefs(historyStore);

    const scriptStatus = computed(() => effectiveScriptStatus(slot.value, currentItem.value?.url ?? null));
    const scriptText = computed(() =>
        slot.value.url !== null && slot.value.url === currentItem.value?.url ? slot.value.text : null,
    );

    // Prepare the script once the summary on screen is complete, or again if
    // that summary was regenerated under new settings.
    watch(
        () => currentItem.value,
        item => {
            if (item && decideScriptPrep(slot.value, item) === 'prepare') {
                prepareScript(item.url, item.aiTitle || item.name, item.simplifiedContent);
            }
        },
        { deep: true, immediate: true },
    );

    function clearCartesiaAudio() {
        cartesiaAudio.value = null;
        cartesiaAudioForUrl.value = null;
        cartesiaTimepoints.value = [];
    }

    function cacheCartesiaAudio(data: { audio: Uint8Array; timepoints: Timepoint[]; url: string }) {
        cartesiaAudio.value = data.audio;
        cartesiaAudioForUrl.value = data.url;
        cartesiaTimepoints.value = data.timepoints;
    }

    async function prepareScript(url: string, title: string, summary: string) {
        const token = ++prepareToken;
        slot.value = { url, summary, status: 'preparing', text: null };
        // The audio belongs to the previous script.
        clearCartesiaAudio();

        try {
            const response = await axios.post(route('avatar.script'), { title, summary });
            if (token !== prepareToken) return;

            if (response.data.script) {
                slot.value = { ...slot.value, status: 'ready', text: response.data.script };
            } else {
                slot.value = { ...slot.value, status: 'error' };
            }
        } catch (error) {
            if (token !== prepareToken) return;
            console.error('Script preparation failed:', error);
            slot.value = { ...slot.value, status: 'error' };
        }
    }

    return {
        slot,
        scriptStatus,
        scriptText,
        cartesiaAudio,
        cartesiaAudioForUrl,
        cartesiaTimepoints,
        prepareScript,
        cacheCartesiaAudio,
    };
});
