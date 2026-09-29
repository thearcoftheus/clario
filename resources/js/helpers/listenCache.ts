// Bookkeeping for listenStore's per-article audio cache, kept pure for
// testing. One entry per article URL rather than one slot for the whole
// panel: the panel follows the user across tabs, and a generation is
// several billable TTS calls, so audio made on tab A must survive the user
// generating on tab B and be waiting when they come back.

export const MAX_LISTEN_ENTRIES = 8; // mirrors MAX_CACHED_TABS; ~2.7 MB of base64 per 5-minute article

export interface Timepoint {
    markName: string;
    timeSeconds: number;
}

export interface ListenEntry {
    url: string;
    /** The simplified text the audio was made from. A regeneration under new settings is a miss. */
    content: string;
    audioBase64: string;
    words: string[];
    timepoints: Timepoint[];
    lastPosition: number;
    audioDuration: number;
    lastAccessAt: number;
}

/**
 * The cached audio for an article, if it was made from exactly this text.
 * Also the answer to "should a generation that just finished show up in the
 * pane": only if the article it was for is the one on screen, unchanged.
 */
export function findEntry(
    entries: ReadonlyMap<string, ListenEntry>,
    url: string | null | undefined,
    content: string | undefined,
): ListenEntry | null {
    if (!url) return null;
    const entry = entries.get(url);
    if (!entry || entry.content !== content) return null;
    return entry;
}

/**
 * Add or replace an article's audio. Over `max`, the least recently used
 * entry goes — never the one being inserted, and never `protectUrl` (the
 * article on screen), even if it is the oldest.
 */
export function insertEntry(
    entries: ReadonlyMap<string, ListenEntry>,
    entry: ListenEntry,
    protectUrl: string | null,
    max: number = MAX_LISTEN_ENTRIES,
): Map<string, ListenEntry> {
    const next = new Map(entries);
    next.set(entry.url, entry);

    while (next.size > max) {
        let victim: ListenEntry | null = null;
        for (const candidate of next.values()) {
            if (candidate.url === entry.url || candidate.url === protectUrl) continue;
            if (victim === null || candidate.lastAccessAt < victim.lastAccessAt) victim = candidate;
        }
        if (!victim) break;
        next.delete(victim.url);
    }

    return next;
}

/** Mark an entry as just used (LRU), optionally saving the playback position. */
export function touchEntry(
    entries: ReadonlyMap<string, ListenEntry>,
    url: string,
    now: number,
    patch: Partial<Pick<ListenEntry, 'lastPosition' | 'audioDuration'>> = {},
): Map<string, ListenEntry> {
    const existing = entries.get(url);
    if (!existing) return new Map(entries);
    const next = new Map(entries);
    next.set(url, { ...existing, ...patch, lastAccessAt: now });
    return next;
}

/** One generation per article at a time; other articles may generate in parallel. */
export function shouldStartGeneration(generating: ReadonlySet<string>, url: string): boolean {
    return !generating.has(url);
}
