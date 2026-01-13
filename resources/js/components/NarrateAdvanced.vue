<template>
    <StyledTab>
        <div v-if="historyItems.length === 0" class="self-center py-8 text-center italic accent-gray-700">
            Refresh page to see summary
        </div>
        <div v-else class="p-6">
            <div class="space-y-6">
                <!-- Status Display -->
                <div class="flex items-center justify-between rounded-lg border p-4">
                    <div class="flex items-center gap-3">
                        <div
                            class="flex h-10 w-10 items-center justify-center rounded-full"
                            :class="{
                                'bg-green-100': isPlaying,
                                'bg-blue-100': isGenerating,
                                'bg-gray-100': !isPlaying && !isGenerating,
                            }"
                        >
                            <component
                                :is="statusIcon"
                                class="h-5 w-5"
                                :class="{
                                    'text-green-600': isPlaying,
                                    'text-blue-600': isGenerating,
                                    'text-gray-600': !isPlaying && !isGenerating,
                                }"
                            />
                        </div>
                        <div>
                            <div class="font-medium">{{ statusText }}</div>
                            <div class="text-sm text-muted-foreground">Google Cloud TTS</div>
                        </div>
                    </div>
                </div>

                <!-- Error Display -->
                <div v-if="error" class="rounded-lg border border-red-200 bg-red-50 p-4">
                    <div class="flex items-center gap-2 text-red-800">
                        <AlertCircle class="h-5 w-5" />
                        <div>
                            <div class="font-medium">Error</div>
                            <div class="text-sm">{{ error }}</div>
                        </div>
                    </div>
                </div>

                <!-- Playback Controls -->
                <div class="flex flex-col gap-3">
                    <div class="flex gap-2">
                        <Button v-if="!audioUrl && !isGenerating" @click="generateAudio" class="flex-1" size="lg">
                            <Sparkles class="mr-2 h-5 w-5" />
                            Generate Audio
                        </Button>
                        <Button
                            v-if="audioUrl && !isPlaying"
                            @click="playAudio"
                            class="flex-1"
                            size="lg"
                            :disabled="isGenerating"
                        >
                            <Play class="mr-2 h-5 w-5" />
                            Play
                        </Button>
                        <Button v-if="isPlaying" @click="pauseAudio" class="flex-1" size="lg" variant="outline">
                            <Pause class="mr-2 h-5 w-5" />
                            Pause
                        </Button>
                        <Button
                            v-if="audioUrl"
                            @click="stopAudio"
                            size="lg"
                            variant="destructive"
                            :disabled="isGenerating"
                        >
                            <Square class="mr-2 h-5 w-5" />
                            Stop
                        </Button>
                    </div>

                    <!-- Progress Bar -->
                    <div v-if="audioUrl" class="space-y-1">
                        <div class="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                            <div class="h-full bg-blue-600 transition-all" :style="{ width: `${progress}%` }" />
                        </div>
                        <div class="flex justify-between text-xs text-muted-foreground">
                            <span>{{ formatTime(currentTime) }}</span>
                            <span>{{ formatTime(duration) }}</span>
                        </div>
                    </div>
                </div>

                <!-- Speed Control -->
                <div class="space-y-2">
                    <div class="flex items-center justify-between">
                        <label class="text-sm font-medium">Playback Speed</label>
                        <span class="text-sm text-muted-foreground">{{ speed }}x</span>
                    </div>
                    <div class="flex gap-2">
                        <Button
                            v-for="s in [0.75, 1, 1.25, 1.5, 2]"
                            :key="s"
                            @click="setSpeed(s)"
                            size="sm"
                            :variant="speed === s ? 'default' : 'outline'"
                            :disabled="isGenerating"
                        >
                            {{ s }}x
                        </Button>
                    </div>
                </div>

                <!-- Voice Selection -->
                <div class="space-y-2">
                    <label class="text-sm font-medium">Voice</label>
                    <select
                        v-model="selectedVoice"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        :disabled="isGenerating || isPlaying"
                    >
                        <optgroup label="Chirp3-HD (Most Natural)">
                            <option value="en-US-Chirp3-HD-Kore">Kore - Female, warm & clear</option>
                            <option value="en-US-Chirp3-HD-Charon">Charon - Male, deep & calm</option>
                            <option value="en-US-Chirp3-HD-Aoede">Aoede - Female, bright & expressive</option>
                            <option value="en-US-Chirp3-HD-Fenrir">Fenrir - Male, strong & authoritative</option>
                            <option value="en-US-Chirp3-HD-Puck">Puck - Male, friendly & conversational</option>
                        </optgroup>
                        <optgroup label="WaveNet">
                            <option value="en-US-Wavenet-A">English (US) - WaveNet Male A</option>
                            <option value="en-US-Wavenet-B">English (US) - WaveNet Male B</option>
                            <option value="en-US-Wavenet-C">English (US) - WaveNet Female C</option>
                            <option value="en-US-Wavenet-D">English (US) - WaveNet Male D</option>
                            <option value="en-US-Wavenet-F">English (US) - WaveNet Female F</option>
                        </optgroup>
                        <optgroup label="Neural2">
                            <option value="en-US-Neural2-A">English (US) - Neural2 Female A</option>
                            <option value="en-US-Neural2-C">English (US) - Neural2 Female C</option>
                            <option value="en-US-Neural2-D">English (US) - Neural2 Male D</option>
                            <option value="en-US-Neural2-E">English (US) - Neural2 Female E</option>
                            <option value="en-US-Neural2-F">English (US) - Neural2 Female F</option>
                            <option value="en-US-Neural2-G">English (US) - Neural2 Female G</option>
                            <option value="en-US-Neural2-H">English (US) - Neural2 Female H</option>
                            <option value="en-US-Neural2-I">English (US) - Neural2 Male I</option>
                            <option value="en-US-Neural2-J">English (US) - Neural2 Male J</option>
                            <option value="en-GB-Neural2-A">English (UK) - Neural2 Female A</option>
                            <option value="en-GB-Neural2-B">English (UK) - Neural2 Male B</option>
                            <option value="en-GB-Neural2-C">English (UK) - Neural2 Female C</option>
                            <option value="en-GB-Neural2-D">English (UK) - Neural2 Male D</option>
                        </optgroup>
                    </select>
                </div>

                <!-- Summary Preview -->
                <div class="space-y-2">
                    <label class="text-sm font-medium">Summary to Narrate</label>
                    <div class="max-h-48 overflow-auto rounded-lg border bg-muted/50 p-4 text-sm">
                        <Markdown :content="summaryText" />
                    </div>
                </div>
            </div>
        </div>
    </StyledTab>
</template>

<script lang="ts" setup>
import Markdown from '@/components/Markdown.vue';
import { Button } from '@/components/ui/button';
import StyledTab from '@/components/ui/StyledTab.vue';
import route from '@/helpers/route';
import { useHistoryStore } from '@/stores/historyStore';
import axios from 'axios';
import { AlertCircle, Loader2, Pause, Play, Sparkles, Square, Volume2 } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onBeforeUnmount, ref } from 'vue';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const isPlaying = ref(false);
const isGenerating = ref(false);
const speed = ref(1);
const selectedVoice = ref('en-US-Neural2-C');
const audioUrl = ref<string | null>(null);
const error = ref<string | null>(null);
const currentTime = ref(0);
const duration = ref(0);

let audioElement: HTMLAudioElement | null = null;

// Get the summary text
const summaryText = computed(() => {
    return historyItems.value[0]?.simplifiedContent || '';
});

// Status text display
const statusText = computed(() => {
    if (isGenerating.value) return 'Generating audio...';
    if (isPlaying.value) return 'Playing...';
    if (audioUrl.value) return 'Ready to play';
    return 'Click Generate Audio to start';
});

// Status icon
const statusIcon = computed(() => {
    if (isGenerating.value) return Loader2;
    if (isPlaying.value) return Volume2;
    return Sparkles;
});

// Progress percentage
const progress = computed(() => {
    if (duration.value === 0) return 0;
    return (currentTime.value / duration.value) * 100;
});

// Format time in MM:SS
function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

// Generate audio from API
async function generateAudio() {
    if (!summaryText.value) return;

    error.value = null;
    isGenerating.value = true;

    try {
        // Call the API to generate audio
        const response = await axios.post(
            route('narrate'),
            {
                content: summaryText.value,
                voice: selectedVoice.value,
                speed: speed.value,
                language: selectedVoice.value.startsWith('en-US') ? 'en-US' : 'en-GB',
            },
            {
                responseType: 'blob',
            },
        );

        // Create object URL from blob
        const blob = new Blob([response.data], { type: 'audio/mpeg' });
        audioUrl.value = URL.createObjectURL(blob);

        // Create audio element
        createAudioElement();

    } catch (e: any) {
        console.error('Failed to generate audio:', e);

        // When responseType is 'blob', error responses are also blobs and need to be parsed
        if (e.response?.data instanceof Blob) {
            try {
                const text = await e.response.data.text();
                const errorData = JSON.parse(text);
                error.value = errorData.message || errorData.error || 'Failed to generate audio. Please try again.';
            } catch {
                error.value = 'Failed to generate audio. Please try again.';
            }
        } else {
            error.value = e.response?.data?.message || e.response?.data?.error || 'Failed to generate audio. Please try again.';
        }
    } finally {
        isGenerating.value = false;
    }
}

// Create audio element
function createAudioElement() {
    if (!audioUrl.value) return;

    // Clean up existing audio
    if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
    }

    audioElement = new Audio(audioUrl.value);
    audioElement.playbackRate = speed.value;

    // Event listeners
    audioElement.addEventListener('loadedmetadata', () => {
        duration.value = audioElement!.duration;
    });

    audioElement.addEventListener('timeupdate', () => {
        currentTime.value = audioElement!.currentTime;
    });

    audioElement.addEventListener('ended', () => {
        isPlaying.value = false;
        currentTime.value = 0;
    });

    audioElement.addEventListener('error', () => {
        error.value = 'Failed to play audio';
        isPlaying.value = false;
    });
}

// Play audio
function playAudio() {
    if (!audioElement) return;
    audioElement.play();
    isPlaying.value = true;
}

// Pause audio
function pauseAudio() {
    if (!audioElement) return;
    audioElement.pause();
    isPlaying.value = false;
}

// Stop audio
function stopAudio() {
    if (!audioElement) return;
    audioElement.pause();
    audioElement.currentTime = 0;
    isPlaying.value = false;
    currentTime.value = 0;
}

// Check if current voice is Chirp3-HD (speed only affects playback, not generation)
function isChirp3Voice(): boolean {
    return selectedVoice.value.includes('Chirp3-HD');
}

// Set playback speed
function setSpeed(newSpeed: number) {
    speed.value = newSpeed;
    if (audioElement) {
        audioElement.playbackRate = newSpeed;
    }
    // For Chirp3-HD, speed only affects playback (API doesn't support speakingRate)
    // For other voices, reset audio to regenerate with new speed
    if (audioUrl.value && !isChirp3Voice()) {
        audioUrl.value = null;
    }
}

// Cleanup on unmount
onBeforeUnmount(() => {
    if (audioElement) {
        audioElement.pause();
        audioElement.src = '';
    }
    if (audioUrl.value) {
        URL.revokeObjectURL(audioUrl.value);
    }
});
</script>
