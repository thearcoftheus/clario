<template>
    <div class="flex h-full flex-col overflow-y-auto">
        <!-- Compact article card -->
        <div class="px-4 pt-4 pb-5">
            <h2 class="mb-2 text-lg font-bold leading-tight tracking-tight text-purple">
                What You're Learning About
            </h2>
            <CompactArticleCard
                v-if="currentItem"
                :image="currentItem.image"
                :title="currentItem.aiTitle || currentItem.name"
            />
        </div>

        <!-- Watch heading row -->
        <div class="flex items-center justify-between px-4 pb-3">
            <div class="flex items-center gap-1.5">
                <img :src="explainerIcon" alt="" class="size-5" />
                <span class="text-lg font-bold leading-tight tracking-tight text-purple">Watch</span>
            </div>
        </div>

        <!-- Content card -->
        <div class="mx-4 mb-5 flex min-h-0 flex-1 flex-col rounded-xl border-[0.5px] border-card-border bg-white">
            <!-- Video/audio elements (always in DOM, hidden when not active) -->
            <div :class="showVideo ? '' : 'hidden'">
                <div class="relative aspect-[4/5] w-full bg-black">
                    <video
                        ref="videoRef"
                        autoplay
                        playsinline
                        class="h-full w-full object-cover"
                    />
                    <audio ref="audioRef" autoplay />

                    <!-- Caption overlay (current sentence, synced via Cartesia timepoints).
                         Sits at the bottom of the video; active word highlighted in
                         purple-light to stay consistent with the Listen pane semantic. -->
                    <div
                        v-if="currentSentence && currentSentence.length > 0"
                        class="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap justify-center gap-x-[0.3em] gap-y-1 bg-black/70 px-4 py-2 text-center"
                    >
                        <span
                            v-for="word in currentSentence"
                            :key="word.index"
                            class="rounded px-0.5 text-base leading-snug transition-colors duration-100"
                            :class="word.index === currentWordIndex ? 'bg-purple-light text-purple' : 'text-white'"
                        >{{ word.text }}</span>
                    </div>

                    <!-- Error overlay -->
                    <div v-if="simliStatus === 'error'" class="absolute inset-0 flex flex-col items-center justify-center bg-black/70 p-4 text-center">
                        <p class="mb-2 text-sm font-medium text-white">Something went wrong</p>
                        <p class="mb-4 text-sm text-white/70">{{ simliError }}</p>
                        <button
                            class="cursor-pointer rounded-lg bg-white px-4 py-2 text-sm font-bold text-purple"
                            @click="resetSimli"
                        >
                            Try Again
                        </button>
                    </div>

                    <!-- Finished overlay -->
                    <div v-if="simliStatus === 'finished'" class="absolute inset-0 flex flex-col items-center justify-center bg-black/50">
                        <button
                            class="cursor-pointer rounded-full bg-white px-6 py-2.5 text-sm font-bold text-purple shadow-lg"
                            @click="startGeneration"
                        >
                            Watch Again
                        </button>
                    </div>
                </div>

                <!-- Controls bar -->
                <div v-if="simliStatus === 'streaming'" class="flex shrink-0 items-center justify-center gap-3 border-t border-gray-200 px-4 py-3">
                    <button
                        class="flex size-8 cursor-pointer items-center justify-center rounded-full bg-purple"
                        @click="togglePause"
                    >
                        <Play v-if="isPaused" class="size-4 text-white" />
                        <Pause v-else class="size-4 text-white" />
                    </button>
                    <button
                        class="cursor-pointer rounded-lg bg-gray-200 px-4 py-1.5 text-sm font-medium text-black"
                        @click="stopGeneration"
                    >
                        Stop
                    </button>
                </div>
            </div>

            <!-- Preparing script -->
            <div v-if="(scriptStatus === 'idle' || scriptStatus === 'preparing') && simliStatus === 'idle'" class="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                <Loader2 class="size-6 animate-spin text-purple" />
                <p class="text-sm text-gray-500">Preparing script...</p>
            </div>

            <!-- Script ready, not yet generating -->
            <div v-else-if="scriptStatus === 'ready' && simliStatus === 'idle'" class="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div class="flex size-16 items-center justify-center rounded-full bg-purple-light">
                    <img :src="explainerIcon" alt="" class="size-10" />
                </div>
                <div>
                    <p class="text-base font-bold text-black">Ready to generate video</p>
                    <p class="mt-1 text-sm text-gray-500">Video generation can take up to 2 minutes</p>
                </div>
                <button
                    class="cursor-pointer rounded-lg bg-purple px-6 py-2.5 text-sm font-bold text-white"
                    @click="startGeneration"
                >
                    Generate Video
                </button>
            </div>

            <!-- Stopped (audio cached, ready to replay) -->
            <div v-else-if="simliStatus === 'stopped'" class="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
                <div class="flex size-16 items-center justify-center rounded-full bg-purple-light">
                    <Play class="size-8 text-purple" />
                </div>
                <p class="text-base font-bold text-black">Video stopped</p>
                <button
                    class="cursor-pointer rounded-lg bg-purple px-6 py-2.5 text-sm font-bold text-white"
                    @click="startGeneration"
                >
                    Replay Video
                </button>
            </div>

            <!-- Generating / connecting -->
            <div v-else-if="simliStatus === 'preparing' || simliStatus === 'connecting'" class="flex flex-1 flex-col items-center justify-center gap-3 p-8">
                <Loader2 class="size-8 animate-spin text-purple" />
                <p class="text-sm font-medium text-purple">
                    {{ simliStatus === 'preparing' ? 'Generating speech...' : 'Connecting to avatar...' }}
                </p>
                <p class="text-sm text-gray-400">
                    {{ simliStatus === 'preparing' ? 'This may take up to 3 minutes for long articles' : 'This may take up to 15 seconds' }}
                </p>
            </div>

            <!-- Script error -->
            <div v-if="scriptStatus === 'error' && simliStatus === 'idle'" class="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
                <p class="text-sm text-gray-500">Failed to prepare script. Please try again.</p>
            </div>
        </div>

        <!-- Learn Another Way -->
        <div class="shrink-0 px-4 pb-3 pt-3">
            <LearnAnotherWay exclude="avatar" />
        </div>
    </div>
</template>

<script lang="ts" setup>
import CompactArticleCard from '@/components/CompactArticleCard.vue';
import LearnAnotherWay from '@/components/LearnAnotherWay.vue';
import route from '@/helpers/route';
import { useAvatarStore, type Timepoint } from '@/stores/avatarStore';
import { useHistoryStore } from '@/stores/historyStore';
import { SimliClient, generateSimliSessionToken, generateIceServers } from 'simli-client';
import { Loader2, Pause, Play } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';

import explainerIcon from '@/../icons/sidebar/explainer.svg';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);
const currentItem = computed(() => historyItems.value[0] ?? null);

const avatarStore = useAvatarStore();
const { scriptStatus, scriptText } = storeToRefs(avatarStore);

// Simli state
const SIMLI_FACE_ID = '6ebf0aa7-6fed-443d-a4c6-fd1e3080b215';
const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY;

const videoRef = ref<HTMLVideoElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);
const simliStatus = ref<'idle' | 'preparing' | 'connecting' | 'streaming' | 'finished' | 'stopped' | 'error'>('idle');
const simliError = ref('');
const isPaused = ref(false);

let simliClient: SimliClient | null = null;
let cachedAudio: Uint8Array | null = null;
let disposed = false;

// Streaming state for the Cartesia → Simli pipeline.
// pendingChunks is a FIFO of audio chunks waiting to be sent to Simli; the pump
// drains it at controlled pacing. cartesiaState tracks the upstream stream so
// the pump knows when to stop waiting for more chunks. abortController lets
// stopGeneration() / unmount cancel an in-flight fetch.
const pendingChunks: Uint8Array[] = [];
let cartesiaState: 'idle' | 'streaming' | 'done' | 'error' = 'idle';
let abortController: AbortController | null = null;

// Caption state — driven by Cartesia word-level timepoints, synced via audioRef.
const captionTimepoints = ref<Timepoint[]>([]);
const currentWordIndex = ref(-1);
let captionFrameId: number | null = null;

onMounted(() => {
    const url = currentItem.value?.url;
    if (url && avatarStore.cartesiaAudioForUrl === url && avatarStore.cartesiaAudio) {
        cachedAudio = avatarStore.cartesiaAudio;
        captionTimepoints.value = avatarStore.cartesiaTimepoints;
    }
});

const showVideo = computed(() =>
    simliStatus.value === 'streaming' ||
    simliStatus.value === 'finished' ||
    simliStatus.value === 'error'
);

const hasGeneratedBefore = computed(() =>
    cachedAudio !== null
);

function togglePause() {
    if (!videoRef.value || !audioRef.value) return;

    if (isPaused.value) {
        videoRef.value.play();
        audioRef.value.play();
        isPaused.value = false;
    } else {
        videoRef.value.pause();
        audioRef.value.pause();
        isPaused.value = true;
    }
}

function base64ToUint8Array(b64: string): Uint8Array {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

function tryParseJson(s: string): any {
    try {
        return JSON.parse(s);
    } catch {
        return null;
    }
}

/**
 * Open the Cartesia SSE stream and consume it event-by-event. Audio chunks go
 * straight into `pendingChunks` for the pump to forward to Simli; timestamp
 * events extend `captionTimepoints` so captions update as soon as Cartesia
 * names a word. Returns the full audio buffer once the stream completes,
 * which the caller persists to the avatarStore cache for replay.
 */
async function fetchCartesiaSSE(text: string, signal: AbortSignal): Promise<Uint8Array> {
    const response = await fetch(route('avatar.cartesia.tts'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
        },
        body: JSON.stringify({ text }),
        signal,
    });

    if (!response.ok || !response.body) {
        throw new Error(`Server returned ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const allChunks: Uint8Array[] = [];

    try {
        readLoop: while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });

            let pos: number;
            while ((pos = buffer.indexOf('\n\n')) !== -1) {
                const eventBlock = buffer.slice(0, pos);
                buffer = buffer.slice(pos + 2);

                let eventType: string | null = null;
                let eventData = '';
                for (const line of eventBlock.split('\n')) {
                    if (line.startsWith('event:')) {
                        eventType = line.slice(6).trim();
                    } else if (line.startsWith('data:')) {
                        const rest = line.slice(5);
                        eventData += rest.startsWith(' ') ? rest.slice(1) : rest;
                    }
                }

                if (eventType === null) continue;

                if (eventType === 'chunk') {
                    // Cartesia chunk events: data is either raw base64 or a JSON
                    // object with {data: base64}. Handle both defensively.
                    const parsed = tryParseJson(eventData);
                    const b64 =
                        parsed && typeof parsed === 'object' && typeof parsed.data === 'string'
                            ? parsed.data
                            : eventData;
                    if (typeof b64 === 'string' && b64.length > 0) {
                        const bytes = base64ToUint8Array(b64);
                        allChunks.push(bytes);
                        pendingChunks.push(bytes);
                    }
                } else if (eventType === 'timestamps') {
                    const parsed = tryParseJson(eventData);
                    const wt = parsed?.word_timestamps;
                    if (wt && Array.isArray(wt.words) && Array.isArray(wt.start)) {
                        const newTimepoints: Timepoint[] = wt.words.map(
                            (word: string, i: number) => ({
                                markName: word,
                                timeSeconds: Number(wt.start[i]),
                            }),
                        );
                        captionTimepoints.value = [...captionTimepoints.value, ...newTimepoints];
                    }
                } else if (eventType === 'done') {
                    break readLoop;
                } else if (eventType === 'error') {
                    const parsed = tryParseJson(eventData);
                    const msg = parsed?.error ?? 'TTS stream error';
                    throw new Error(String(msg));
                }
            }
        }
    } finally {
        reader.releaseLock();
    }

    // Combine all received chunks into one contiguous buffer for the avatarStore
    // cache (used for "Watch Again" without re-fetching).
    const totalLength = allChunks.reduce((sum, c) => sum + c.length, 0);
    const combined = new Uint8Array(totalLength);
    let offset = 0;
    for (const c of allChunks) {
        combined.set(c, offset);
        offset += c.length;
    }
    return combined;
}

/**
 * Open the Simli WebRTC connection (token + ICE + start). Runs independently
 * of the Cartesia fetch so the two waits overlap.
 */
async function setupSimli(): Promise<SimliClient> {
    const tokenResponse = await generateSimliSessionToken({
        config: {
            faceId: SIMLI_FACE_ID,
            handleSilence: true,
            maxSessionLength: 3600,
            maxIdleTime: 30,
        },
        apiKey: SIMLI_API_KEY,
    });
    const iceServers = await generateIceServers(SIMLI_API_KEY);

    const client = new SimliClient(
        tokenResponse.session_token,
        videoRef.value!,
        audioRef.value!,
        iceServers,
    );

    client.on('disconnected', () => {
        if (simliStatus.value === 'streaming') {
            simliStatus.value = 'finished';
        }
    });

    client.on('failed', () => {
        simliStatus.value = 'error';
        simliError.value = 'WebRTC connection failed';
    });

    await client.start();
    return client;
}

/**
 * Drain `pendingChunks` into Simli at controlled pacing. Pause-aware. Exits
 * when the queue is empty AND cartesiaState is terminal, or when the client
 * is replaced/disposed (e.g. user clicked Stop).
 */
async function pumpAudio(client: SimliClient): Promise<void> {
    while (!disposed && simliClient === client) {
        while (isPaused.value) {
            await new Promise(resolve => setTimeout(resolve, 100));
            if (disposed || simliClient !== client) return;
        }

        const chunk = pendingChunks.shift();
        if (chunk) {
            client.sendAudioData(chunk);
            // 50ms pacing — matches the legacy throttle. Cartesia chunks are
            // typically larger than Simli's per-call payload anyway, so this
            // keeps us from flooding the WebRTC connection.
            await new Promise(resolve => setTimeout(resolve, 50));
        } else if (cartesiaState === 'done' || cartesiaState === 'error') {
            return;
        } else {
            // Waiting for more chunks to arrive from Cartesia.
            await new Promise(resolve => setTimeout(resolve, 50));
        }
    }
}

async function startGeneration() {
    if (!scriptText.value || !videoRef.value || !audioRef.value) return;

    try {
        simliError.value = '';
        isPaused.value = false;
        currentWordIndex.value = -1;
        pendingChunks.length = 0;
        simliStatus.value = 'preparing';

        let fullAudioPromise: Promise<Uint8Array>;

        if (cachedAudio) {
            // Cache hit (in-memory from a prior visit this session): feed the
            // pump from the cached buffer, no network call needed. Timepoints
            // came from the avatarStore already at mount.
            const audio = cachedAudio;
            const CHUNK_SIZE = 6000;
            for (let offset = 0; offset < audio.length; offset += CHUNK_SIZE) {
                pendingChunks.push(audio.subarray(offset, Math.min(offset + CHUNK_SIZE, audio.length)));
            }
            cartesiaState = 'done';
            fullAudioPromise = Promise.resolve(audio);
        } else {
            // Cache miss: stream from Cartesia. Audio chunks flow into
            // pendingChunks as they arrive; the pump drains them in parallel.
            captionTimepoints.value = [];
            cartesiaState = 'streaming';
            abortController = new AbortController();
            fullAudioPromise = fetchCartesiaSSE(scriptText.value, abortController.signal)
                .then(audio => {
                    cartesiaState = 'done';
                    return audio;
                })
                .catch(err => {
                    cartesiaState = 'error';
                    throw err;
                });
        }

        // Parallel: kick off the Simli WebRTC handshake while Cartesia is
        // (potentially) still streaming chunks in. On a cache hit this still
        // gates time-to-first-frame on Simli's setup time only.
        const client = await setupSimli();
        if (disposed) {
            client.stop();
            return;
        }
        simliClient = client;
        simliStatus.value = 'streaming';

        const pumpPromise = pumpAudio(client);

        // Once Cartesia is fully drained we know the final audio buffer; cache
        // it so "Watch Again" and next-session restore work without re-fetching.
        const fullAudio = await fullAudioPromise;
        const articleUrl = currentItem.value?.url;
        if (articleUrl) {
            avatarStore.cacheCartesiaAudio({
                audio: fullAudio,
                timepoints: captionTimepoints.value,
                url: articleUrl,
            });
        }
        cachedAudio = fullAudio;

        // Wait for the pump to finish sending everything to Simli.
        await pumpPromise;

        // Then wait for the avatar to actually finish playing through (pump
        // sends faster than real-time, so playback continues after we stop
        // sending). Add 2s slack for the trailing audio + Simli buffer.
        const audioDurationMs = (fullAudio.length / 32000) * 1000;
        const waitEnd = Date.now() + audioDurationMs + 2000;
        while (Date.now() < waitEnd && simliStatus.value === 'streaming') {
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (simliStatus.value === 'streaming') {
            if (simliClient) {
                simliClient.stop();
                simliClient = null;
            }
            simliStatus.value = 'finished';
        }
    } catch (error: any) {
        console.error('[Watch] Generation error:', error);
        if (abortController) {
            abortController.abort();
        }
        simliStatus.value = 'error';
        simliError.value = error.message || 'Failed to generate video';
    } finally {
        abortController = null;
    }
}

function stopGeneration() {
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    if (simliClient) {
        simliClient.stop();
        simliClient = null;
    }
    pendingChunks.length = 0;
    cartesiaState = 'idle';
    simliStatus.value = cachedAudio ? 'stopped' : 'idle';
    isPaused.value = false;
}

function resetSimli() {
    stopGeneration();
    simliError.value = '';
}

// Group caption words into SENTENCES by walking scriptText's sentence boundaries
// in lockstep with the Cartesia timepoints. Sentence-level chunking keeps the
// bottom-of-video overlay compact (1–2 lines at a time) — full-transcript display
// was too tall to fit within the sidebar without scrolling.
const captionSentences = computed<{ text: string; index: number }[][]>(() => {
    if (captionTimepoints.value.length === 0) return [];
    if (!scriptText.value) return [];

    // Flatten paragraph breaks so sentence splitting works across them, then split
    // on sentence-ending punctuation (kept attached via lookbehind).
    const flat = scriptText.value.replace(/\s+/g, ' ').trim();
    const sentences = flat.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0);

    const result: { text: string; index: number }[][] = [];
    let globalIndex = 0;

    for (const sentence of sentences) {
        const sentenceWords = sentence.split(/\s+/).filter(w => w.length > 0);
        const sentenceResult: { text: string; index: number }[] = [];
        for (let i = 0; i < sentenceWords.length; i++) {
            if (globalIndex < captionTimepoints.value.length) {
                sentenceResult.push({
                    text: captionTimepoints.value[globalIndex].markName,
                    index: globalIndex,
                });
                globalIndex++;
            }
        }
        if (sentenceResult.length > 0) result.push(sentenceResult);
    }

    // Trailing remainder (tokenisation drift): drop leftover timepoints into a
    // final sentence so nothing disappears from the captions.
    if (globalIndex < captionTimepoints.value.length) {
        const remaining: { text: string; index: number }[] = [];
        while (globalIndex < captionTimepoints.value.length) {
            remaining.push({
                text: captionTimepoints.value[globalIndex].markName,
                index: globalIndex,
            });
            globalIndex++;
        }
        result.push(remaining);
    }

    return result;
});

const currentSentenceIndex = computed(() => {
    if (currentWordIndex.value < 0) return -1;
    for (let i = 0; i < captionSentences.value.length; i++) {
        const sent = captionSentences.value[i];
        if (sent.length === 0) continue;
        const firstIdx = sent[0].index;
        const lastIdx = sent[sent.length - 1].index;
        if (currentWordIndex.value >= firstIdx && currentWordIndex.value <= lastIdx) {
            return i;
        }
    }
    return -1;
});

const currentSentence = computed(() => {
    if (currentSentenceIndex.value < 0) return null;
    return captionSentences.value[currentSentenceIndex.value] ?? null;
});

function updateCurrentWordForTime(time: number) {
    if (captionTimepoints.value.length === 0) {
        currentWordIndex.value = -1;
        return;
    }
    let lo = 0;
    let hi = captionTimepoints.value.length - 1;
    let result = -1;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        if (captionTimepoints.value[mid].timeSeconds <= time) {
            result = mid;
            lo = mid + 1;
        } else {
            hi = mid - 1;
        }
    }
    currentWordIndex.value = result;
}

function startCaptionLoop() {
    function tick() {
        if (!audioRef.value || simliStatus.value !== 'streaming' || isPaused.value) {
            captionFrameId = null;
            return;
        }
        updateCurrentWordForTime(audioRef.value.currentTime);
        captionFrameId = requestAnimationFrame(tick);
    }
    if (captionFrameId === null) {
        captionFrameId = requestAnimationFrame(tick);
    }
}

function stopCaptionLoop() {
    if (captionFrameId !== null) {
        cancelAnimationFrame(captionFrameId);
        captionFrameId = null;
    }
}

watch(simliStatus, (val) => {
    if (val === 'streaming' && !isPaused.value) {
        startCaptionLoop();
    } else {
        stopCaptionLoop();
        if (val !== 'streaming') {
            currentWordIndex.value = -1;
        }
    }
});

watch(isPaused, (paused) => {
    if (paused) {
        stopCaptionLoop();
    } else if (simliStatus.value === 'streaming') {
        startCaptionLoop();
    }
});

onBeforeUnmount(() => {
    disposed = true;
    stopCaptionLoop();
    if (abortController) {
        abortController.abort();
        abortController = null;
    }
    if (simliClient) {
        simliClient.stop();
        simliClient = null;
    }
});
</script>
