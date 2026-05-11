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
                <img :src="animatedImagesIcon" alt="" class="size-5" />
                <span class="text-lg font-bold leading-tight tracking-tight text-purple">Watch</span>
            </div>
        </div>

        <!-- Content card -->
        <div class="mx-4 mb-5 flex flex-col rounded-xl border-[0.5px] border-card-border bg-white">
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
            <div v-if="(scriptStatus === 'idle' || scriptStatus === 'preparing') && simliStatus === 'idle'" class="flex flex-col items-center justify-center gap-3 p-8">
                <Loader2 class="size-6 animate-spin text-purple" />
                <p class="text-sm text-gray-500">Preparing script...</p>
            </div>

            <!-- Script ready, not yet generating -->
            <div v-else-if="scriptStatus === 'ready' && simliStatus === 'idle'" class="flex flex-col items-center justify-center gap-4 p-6 text-center">
                <div class="flex size-16 items-center justify-center rounded-full bg-purple-light">
                    <img :src="animatedImagesIcon" alt="" class="size-10" />
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
            <div v-else-if="simliStatus === 'stopped'" class="flex flex-col items-center justify-center gap-4 p-6 text-center">
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
            <div v-else-if="simliStatus === 'preparing' || simliStatus === 'connecting'" class="flex flex-col items-center justify-center gap-3 p-8">
                <Loader2 class="size-8 animate-spin text-purple" />
                <p class="text-sm font-medium text-purple">
                    {{ simliStatus === 'preparing' ? 'Generating speech...' : 'Connecting to avatar...' }}
                </p>
                <p class="text-sm text-gray-400">
                    {{ simliStatus === 'preparing' ? 'This may take up to 2 minutes' : 'This may take up to 15 seconds' }}
                </p>
            </div>

            <!-- Script error -->
            <div v-if="scriptStatus === 'error' && simliStatus === 'idle'" class="flex flex-col items-center justify-center gap-3 p-8 text-center">
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
import { useAvatarStore } from '@/stores/avatarStore';
import { useHistoryStore } from '@/stores/historyStore';
import { SimliClient, generateSimliSessionToken, generateIceServers } from 'simli-client';
import axios from 'axios';
import { Loader2, Pause, Play } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

import animatedImagesIcon from '@/../icons/sidebar/animated-images.svg';

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

onMounted(() => {
    const url = currentItem.value?.url;
    if (url && avatarStore.cartesiaAudioForUrl === url && avatarStore.cartesiaAudio) {
        cachedAudio = avatarStore.cartesiaAudio;
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

async function startGeneration() {
    if (!scriptText.value || !videoRef.value || !audioRef.value) return;

    try {
        simliError.value = '';
        isPaused.value = false;

        let pcm16Audio: Uint8Array;

        if (cachedAudio) {
            // Reuse cached audio — skip the slow TTS step
            pcm16Audio = cachedAudio;
        } else {
            // Fetch Cartesia audio first (slow step)
            simliStatus.value = 'preparing';
            const response = await axios.post(
                route('avatar.cartesia.tts'),
                { text: scriptText.value },
                { responseType: 'arraybuffer' },
            );
            pcm16Audio = new Uint8Array(response.data);

            // Cache to the global store regardless of local component lifecycle —
            // if the user navigated away mid-fetch, the next visit can still reuse it.
            const articleUrl = currentItem.value?.url;
            if (articleUrl) {
                avatarStore.cacheCartesiaAudio({ audio: pcm16Audio, url: articleUrl });
            }

            // Bail out if the user navigated away during the slow Cartesia fetch.
            // Skips Simli session-token fetch, ICE-server fetch, and constructing a
            // SimliClient against now-null video/audio refs.
            if (disposed) return;

            cachedAudio = pcm16Audio;
        }

        // Establish WebRTC connection
        simliStatus.value = 'connecting';

        const tokenResponse = await generateSimliSessionToken({
            config: {
                faceId: SIMLI_FACE_ID,
                handleSilence: true,
                maxSessionLength: 300,
                maxIdleTime: 30,
            },
            apiKey: SIMLI_API_KEY,
        });

        const iceServers = await generateIceServers(SIMLI_API_KEY);

        simliClient = new SimliClient(
            tokenResponse.session_token,
            videoRef.value,
            audioRef.value,
            iceServers,
        );

        simliClient.on('disconnected', () => {
            if (simliStatus.value === 'streaming') {
                simliStatus.value = 'finished';
            }
        });

        simliClient.on('failed', () => {
            simliStatus.value = 'error';
            simliError.value = 'WebRTC connection failed';
        });

        await simliClient.start();
        simliStatus.value = 'streaming';

        // Send audio in chunks, pausing when user pauses
        const CHUNK_SIZE = 6000;
        let offset = 0;
        while (offset < pcm16Audio.length && simliClient) {
            // Wait while paused
            while (isPaused.value && simliClient) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            if (!simliClient) break;

            const chunk = pcm16Audio.slice(offset, offset + CHUNK_SIZE);
            simliClient.sendAudioData(chunk);
            offset += CHUNK_SIZE;
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        // Wait for avatar to finish (also respect pause)
        const audioDurationMs = (pcm16Audio.length / 32000) * 1000;
        const waitEnd = Date.now() + audioDurationMs + 2000;
        while (Date.now() < waitEnd && simliStatus.value === 'streaming') {
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        if (simliStatus.value === 'streaming') {
            // Finished naturally — show last frame with replay option
            if (simliClient) {
                simliClient.stop();
                simliClient = null;
            }
            simliStatus.value = 'finished';
        }
    } catch (error: any) {
        console.error('[Watch] Generation error:', error);
        simliStatus.value = 'error';
        simliError.value = error.message || 'Failed to generate video';
    }
}

function stopGeneration() {
    if (simliClient) {
        simliClient.stop();
        simliClient = null;
    }
    simliStatus.value = cachedAudio ? 'stopped' : 'idle';
    isPaused.value = false;
}

function resetSimli() {
    stopGeneration();
    simliError.value = '';
}

onBeforeUnmount(() => {
    disposed = true;
    if (simliClient) {
        simliClient.stop();
        simliClient = null;
    }
});
</script>
