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
                                'bg-green-100': isSpeaking,
                                'bg-gray-100': !isSpeaking,
                            }"
                        >
                            <component
                                :is="isSpeaking ? Volume2 : VolumeX"
                                class="h-5 w-5"
                                :class="{
                                    'text-green-600': isSpeaking,
                                    'text-gray-600': !isSpeaking,
                                }"
                            />
                        </div>
                        <div>
                            <div class="font-medium">{{ statusText }}</div>
                            <div class="text-sm text-muted-foreground">{{ voiceInfo }}</div>
                        </div>
                    </div>
                </div>

                <!-- Playback Controls -->
                <div class="flex flex-col gap-3">
                    <div class="flex gap-2">
                        <Button v-if="!isSpeaking && !isPaused" @click="startNarration" class="flex-1" size="lg">
                            <Play class="mr-2 h-5 w-5" />
                            Play Narration
                        </Button>
                        <Button v-if="isSpeaking" @click="pauseNarration" class="flex-1" size="lg" variant="outline">
                            <Pause class="mr-2 h-5 w-5" />
                            Pause
                        </Button>
                        <Button v-if="isPaused" @click="resumeNarration" class="flex-1" size="lg">
                            <Play class="mr-2 h-5 w-5" />
                            Resume
                        </Button>
                        <Button v-if="isSpeaking || isPaused" @click="stopNarration" size="lg" variant="destructive">
                            <Square class="mr-2 h-5 w-5" />
                            Stop
                        </Button>
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
                        >
                            {{ s }}x
                        </Button>
                    </div>
                </div>

                <!-- Voice Selection -->
                <div v-if="availableVoices.length > 0" class="space-y-2">
                    <label class="text-sm font-medium">Voice</label>
                    <select
                        v-model="selectedVoice"
                        @change="onVoiceChange"
                        class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                        :disabled="isSpeaking"
                    >
                        <option v-for="voice in availableVoices" :key="voice.name" :value="voice.name">
                            {{ voice.name }} ({{ voice.lang }})
                        </option>
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
import { useHistoryStore } from '@/stores/historyStore';
import { Pause, Play, Square, Volume2, VolumeX } from 'lucide-vue-next';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';

const historyStore = useHistoryStore();
const { historyItems } = storeToRefs(historyStore);

const isSpeaking = ref(false);
const isPaused = ref(false);
const speed = ref(1);
const availableVoices = ref<SpeechSynthesisVoice[]>([]);
const selectedVoice = ref<string>('');

let utterance: SpeechSynthesisUtterance | null = null;

// Get the summary text
const summaryText = computed(() => {
    return historyItems.value[0]?.simplifiedContent || '';
});

// Status text display
const statusText = computed(() => {
    if (isSpeaking.value) return 'Playing...';
    if (isPaused.value) return 'Paused';
    return 'Ready to play';
});

// Voice info
const voiceInfo = computed(() => {
    if (selectedVoice.value) {
        const voice = availableVoices.value.find(v => v.name === selectedVoice.value);
        return voice ? `${voice.name} (${voice.lang})` : 'Default voice';
    }
    return 'Default voice';
});

// Strip markdown formatting for speech
function stripMarkdown(text: string): string {
    return (
        text
            // Remove headers
            .replace(/#{1,6}\s+/g, '')
            // Remove bold/italic
            .replace(/(\*\*|__)(.*?)\1/g, '$2')
            .replace(/(\*|_)(.*?)\1/g, '$2')
            // Remove links but keep text
            .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
            // Remove code blocks
            .replace(/```[\s\S]*?```/g, '')
            .replace(/`([^`]+)`/g, '$1')
            // Remove bullet points
            .replace(/^\s*[-*+]\s+/gm, '')
            // Remove numbered lists
            .replace(/^\s*\d+\.\s+/gm, '')
            // Clean up extra whitespace
            .replace(/\n{3,}/g, '\n\n')
            .trim()
    );
}

// Load available voices
function loadVoices() {
    availableVoices.value = window.speechSynthesis.getVoices();
    if (availableVoices.value.length > 0 && !selectedVoice.value) {
        // Prefer English voices
        const englishVoice = availableVoices.value.find(v => v.lang.startsWith('en'));
        selectedVoice.value = englishVoice?.name || availableVoices.value[0].name;
    }
}

// Start narration
function startNarration() {
    if (!summaryText.value) return;

    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create new utterance
    const textToSpeak = stripMarkdown(summaryText.value);
    utterance = new SpeechSynthesisUtterance(textToSpeak);

    // Set voice
    const voice = availableVoices.value.find(v => v.name === selectedVoice.value);
    if (voice) {
        utterance.voice = voice;
    }

    // Set rate (speed)
    utterance.rate = speed.value;

    // Event handlers
    utterance.onstart = () => {
        isSpeaking.value = true;
        isPaused.value = false;
    };

    utterance.onend = () => {
        isSpeaking.value = false;
        isPaused.value = false;
    };

    utterance.onerror = () => {
        isSpeaking.value = false;
        isPaused.value = false;
    };

    // Start speaking
    window.speechSynthesis.speak(utterance);
}

// Pause narration
function pauseNarration() {
    window.speechSynthesis.pause();
    isSpeaking.value = false;
    isPaused.value = true;
}

// Resume narration
function resumeNarration() {
    window.speechSynthesis.resume();
    isSpeaking.value = true;
    isPaused.value = false;
}

// Stop narration
function stopNarration() {
    window.speechSynthesis.cancel();
    isSpeaking.value = false;
    isPaused.value = false;
}

// Set playback speed
function setSpeed(newSpeed: number) {
    speed.value = newSpeed;
    // If currently speaking, restart with new speed
    if (isSpeaking.value || isPaused.value) {
        stopNarration();
        startNarration();
    }
}

// Handle voice change
function onVoiceChange() {
    // If currently speaking, restart with new voice
    if (isSpeaking.value || isPaused.value) {
        stopNarration();
        startNarration();
    }
}

// Initialize
onMounted(() => {
    loadVoices();
    // Chrome loads voices asynchronously
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
    }
});
</script>
