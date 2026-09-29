import {
    findEntry,
    insertEntry,
    shouldStartGeneration,
    touchEntry,
    type ListenEntry,
    type Timepoint,
} from '@/helpers/listenCache';
import { defineStore } from 'pinia';
import { ref } from 'vue';

// Per-article Listen audio plus the state of every generation in flight. The
// side panel is one document per window, so this store is what makes a
// generation started on tab A land in A's cache — and only ever show in the
// pane if A is still the article on screen — while the user is off on tab B.
// useListenPlayer derives its words / generating / error state from here and
// owns nothing but the audio element.
export const useListenStore = defineStore('listen', () => {
    const entries = ref<Map<string, ListenEntry>>(new Map());
    const generatingUrls = ref<Set<string>>(new Set());
    const errorByUrl = ref<Map<string, string>>(new Map());

    /** Cached audio for an article, if made from exactly this text. No LRU bump, so safe in computeds. */
    function find(url: string | null | undefined, content: string | undefined): ListenEntry | null {
        return findEntry(entries.value, url, content);
    }

    function cacheAudio(
        data: { url: string; content: string; audio: string; words: string[]; timepoints: Timepoint[] },
        protectUrl: string | null,
    ) {
        entries.value = insertEntry(
            entries.value,
            {
                url: data.url,
                content: data.content,
                audioBase64: data.audio,
                words: data.words,
                timepoints: data.timepoints,
                lastPosition: 0,
                audioDuration: 0,
                lastAccessAt: Date.now(),
            },
            protectUrl,
        );
    }

    function touch(url: string, patch: Partial<Pick<ListenEntry, 'lastPosition' | 'audioDuration'>> = {}) {
        entries.value = touchEntry(entries.value, url, Date.now(), patch);
    }

    function savePosition(url: string, position: number, duration: number) {
        touch(url, { lastPosition: position, audioDuration: duration });
    }

    /** Claim a generation for an article. False if one is already in flight for it. */
    function startGeneration(url: string): boolean {
        if (!shouldStartGeneration(generatingUrls.value, url)) return false;
        const next = new Set(generatingUrls.value);
        next.add(url);
        generatingUrls.value = next;
        const errors = new Map(errorByUrl.value);
        errors.delete(url);
        errorByUrl.value = errors;
        return true;
    }

    function finishGeneration(url: string, error?: string) {
        const next = new Set(generatingUrls.value);
        next.delete(url);
        generatingUrls.value = next;
        if (error) {
            const errors = new Map(errorByUrl.value);
            errors.set(url, error);
            errorByUrl.value = errors;
        }
    }

    function isGenerating(url: string): boolean {
        return generatingUrls.value.has(url);
    }

    function errorFor(url: string): string | null {
        return errorByUrl.value.get(url) ?? null;
    }

    return {
        entries,
        generatingUrls,
        errorByUrl,
        find,
        cacheAudio,
        touch,
        savePosition,
        startGeneration,
        finishGeneration,
        isGenerating,
        errorFor,
    };
});
