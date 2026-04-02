<template>
    <div class="flex flex-col items-center gap-4">
        <!-- Video/Audio Elements for Simli -->
        <div class="relative aspect-square w-full max-w-md overflow-hidden rounded-lg border bg-black">
            <video
                ref="videoRef"
                autoplay
                playsinline
                class="h-full w-full object-cover"
            />
            <audio ref="audioRef" autoplay />

            <!-- Loading Overlay -->
            <div
                v-if="status === 'connecting' || status === 'preparing'"
                class="absolute inset-0 flex flex-col items-center justify-center bg-black/60"
            >
                <Loader2 class="h-12 w-12 animate-spin text-white" />
                <p class="mt-4 text-sm text-white">
                    {{ status === 'connecting' ? 'Connecting to avatar...' : 'Generating speech...' }}
                </p>
            </div>

            <!-- Idle State Overlay -->
            <div
                v-if="status === 'idle'"
                class="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-purple-900/80 to-purple-950/90"
            >
                <div class="flex h-20 w-20 items-center justify-center rounded-full bg-purple-100">
                    <User class="h-10 w-10 text-purple-600" />
                </div>
                <p class="mt-4 text-center text-white">
                    Click Start to begin streaming
                </p>
            </div>
        </div>

        <!-- Controls -->
        <div class="flex w-full max-w-md flex-col gap-3">
            <Button
                v-if="status === 'idle'"
                @click="startStream"
                class="w-full"
                size="lg"
                :disabled="!canStart"
            >
                <Play class="mr-2 h-5 w-5" />
                Start Avatar
            </Button>

            <Button
                v-if="status === 'streaming'"
                @click="stopStream"
                class="w-full"
                size="lg"
                variant="destructive"
            >
                <Square class="mr-2 h-5 w-5" />
                Stop
            </Button>

            <!-- Status Text -->
            <p class="text-center text-xs text-muted-foreground">
                <template v-if="status === 'idle'">
                    Real-time streaming with Cartesia voice
                </template>
                <template v-else-if="status === 'connecting'">
                    Establishing WebRTC connection...
                </template>
                <template v-else-if="status === 'preparing'">
                    Generating speech with Cartesia...
                </template>
                <template v-else-if="status === 'streaming'">
                    Avatar is reading your summary
                </template>
                <template v-else-if="status === 'error'">
                    {{ errorMessage }}
                </template>
            </p>
        </div>

        <!-- Error Display -->
        <div v-if="status === 'error'" class="w-full max-w-md rounded-lg border border-red-200 bg-red-50 p-4">
            <div class="flex items-center gap-2 text-red-800">
                <AlertCircle class="h-5 w-5 flex-shrink-0" />
                <div>
                    <div class="font-medium">Error</div>
                    <div class="text-sm">{{ errorMessage }}</div>
                </div>
            </div>
            <Button @click="resetState" variant="outline" size="sm" class="mt-3">
                Try Again
            </Button>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { Button } from '@/components/ui/button';
import route from '@/helpers/route';
import { SimliClient, generateSimliSessionToken, generateIceServers } from 'simli-client';
import axios from 'axios';
import { AlertCircle, Loader2, Play, Square, User } from 'lucide-vue-next';
import { computed, onBeforeUnmount, ref, watch } from 'vue';

const props = defineProps<{
    scriptText: string;
}>();

// Simli face ID for Ong avatar
const SIMLI_FACE_ID = '6ebf0aa7-6fed-443d-a4c6-fd1e3080b215';
const SIMLI_API_KEY = import.meta.env.VITE_SIMLI_API_KEY;

// Refs for video/audio elements
const videoRef = ref<HTMLVideoElement | null>(null);
const audioRef = ref<HTMLAudioElement | null>(null);

// State
const status = ref<'idle' | 'connecting' | 'preparing' | 'streaming' | 'error'>('idle');
const errorMessage = ref<string>('');

// Simli client instance
let simliClient: SimliClient | null = null;

// Check if we can start (need script text)
const canStart = computed(() => {
    return props.scriptText && props.scriptText.length > 0;
});

// Fetch PCM16 audio from Cartesia via our backend
async function fetchCartesiaAudio(text: string): Promise<Uint8Array> {
    const response = await axios.post(
        route('avatar.cartesia.tts'),
        { text },
        { responseType: 'arraybuffer' }
    );

    return new Uint8Array(response.data);
}

// Start the avatar stream
async function startStream() {
    if (!canStart.value || !videoRef.value || !audioRef.value) return;

    try {
        status.value = 'connecting';
        errorMessage.value = '';

        console.log('[Simli] Generating session token...');

        // Generate session token
        const sessionConfig = {
            faceId: SIMLI_FACE_ID,
            handleSilence: true,
            maxSessionLength: 300, // 5 minutes max
            maxIdleTime: 30,
        };

        const tokenResponse = await generateSimliSessionToken({
            config: sessionConfig,
            apiKey: SIMLI_API_KEY,
        });

        console.log('[Simli] Session token generated');

        // Get ICE servers
        const iceServers = await generateIceServers(SIMLI_API_KEY);
        console.log('[Simli] ICE servers obtained');

        // Create Simli client
        simliClient = new SimliClient(
            tokenResponse.session_token,
            videoRef.value,
            audioRef.value,
            iceServers
        );

        // Set up event listeners
        simliClient.on('connected', () => {
            console.log('[Simli] Connected');
        });

        simliClient.on('disconnected', () => {
            console.log('[Simli] Disconnected');
            if (status.value === 'streaming') {
                status.value = 'idle';
            }
        });

        simliClient.on('failed', () => {
            console.log('[Simli] Connection failed');
            status.value = 'error';
            errorMessage.value = 'WebRTC connection failed';
        });

        // Start the WebRTC connection
        console.log('[Simli] Starting connection...');
        await simliClient.start();
        console.log('[Simli] Connection started');

        // Generate audio with Cartesia
        status.value = 'preparing';
        console.log('[Simli] Fetching Cartesia audio...');
        const pcm16Audio = await fetchCartesiaAudio(props.scriptText);
        console.log('[Simli] Cartesia audio ready, size:', pcm16Audio.length);

        // Stream is now active
        status.value = 'streaming';

        // Send audio data to Simli in chunks
        const CHUNK_SIZE = 6000; // ~187ms of audio at 16kHz mono
        let offset = 0;

        while (offset < pcm16Audio.length && simliClient) {
            const chunk = pcm16Audio.slice(offset, offset + CHUNK_SIZE);
            simliClient.sendAudioData(chunk);
            offset += CHUNK_SIZE;

            // Small delay between chunks to prevent buffer overflow
            await new Promise(resolve => setTimeout(resolve, 50));
        }

        console.log('[Simli] All audio data sent');

        // Wait for the avatar to finish speaking
        // Estimate duration based on audio length (16kHz, 16-bit = 32000 bytes per second)
        const audioDurationMs = (pcm16Audio.length / 32000) * 1000;
        await new Promise(resolve => setTimeout(resolve, audioDurationMs + 2000));

        if (status.value === 'streaming') {
            stopStream();
        }

    } catch (error: any) {
        console.error('[Simli] Stream error:', error);
        status.value = 'error';
        errorMessage.value = error.message || 'Failed to start avatar stream';
    }
}

// Stop the stream
function stopStream() {
    if (simliClient) {
        simliClient.stop();
        simliClient = null;
    }
    status.value = 'idle';
}

// Reset state after error
function resetState() {
    stopStream();
    errorMessage.value = '';
}

// Watch for script changes - reset if script changes
watch(() => props.scriptText, () => {
    if (status.value === 'streaming') {
        stopStream();
    }
});

// Cleanup on unmount
onBeforeUnmount(() => {
    stopStream();
});
</script>
