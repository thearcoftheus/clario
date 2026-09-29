import { describe, expect, it } from 'vitest';
import { findEntry, insertEntry, shouldStartGeneration, touchEntry, type ListenEntry } from './listenCache';

function entry(url: string, lastAccessAt: number, content = `text of ${url}`): ListenEntry {
    return { url, content, audioBase64: 'AAAA', words: ['a'], timepoints: [], lastPosition: 0, audioDuration: 0, lastAccessAt };
}

const A = 'https://x.org/a';
const B = 'https://x.org/b';
const C = 'https://x.org/c';

describe('findEntry', () => {
    const entries = new Map([[A, entry(A, 1)]]);

    it('misses an unknown article and a missing URL', () => {
        expect(findEntry(entries, B, 'text of ' + B)).toBeNull();
        expect(findEntry(entries, null, 'x')).toBeNull();
        expect(findEntry(entries, undefined, 'x')).toBeNull();
    });

    it('hits only when the audio was made from the same text', () => {
        expect(findEntry(entries, A, 'text of ' + A)?.url).toBe(A);
        expect(findEntry(entries, A, 'regenerated under new settings')).toBeNull();
        expect(findEntry(entries, A, undefined)).toBeNull();
    });
});

describe('insertEntry', () => {
    it('does not mutate the map it is given and replaces an existing article', () => {
        const original = new Map([[A, entry(A, 1, 'old')]]);
        const next = insertEntry(original, entry(A, 2, 'new'), null);
        expect(original.get(A)?.content).toBe('old');
        expect(next.get(A)?.content).toBe('new');
        expect(next.size).toBe(1);
    });

    it('keeps everything while under the cap', () => {
        const next = insertEntry(new Map([[A, entry(A, 1)]]), entry(B, 2), null, 2);
        expect([...next.keys()]).toEqual([A, B]);
    });

    it('evicts the least recently used article over the cap', () => {
        const entries = new Map([
            [A, entry(A, 30)],
            [B, entry(B, 10)],
        ]);
        const next = insertEntry(entries, entry(C, 20), null, 2);
        expect(next.has(B)).toBe(false);
        expect(next.has(A)).toBe(true);
        expect(next.has(C)).toBe(true);
    });

    it('never evicts the article just inserted, even when it is the oldest', () => {
        const entries = new Map([
            [A, entry(A, 30)],
            [B, entry(B, 20)],
        ]);
        const next = insertEntry(entries, entry(C, 1), null, 2);
        expect(next.has(C)).toBe(true);
        expect(next.has(B)).toBe(false);
    });

    it('never evicts the protected article, even when it is the oldest', () => {
        const entries = new Map([
            [A, entry(A, 1)],
            [B, entry(B, 20)],
        ]);
        const next = insertEntry(entries, entry(C, 30), A, 2);
        expect(next.has(A)).toBe(true);
        expect(next.has(B)).toBe(false);
    });

    it('stops evicting when only protected entries remain', () => {
        const next = insertEntry(new Map([[A, entry(A, 1)]]), entry(B, 2), A, 1);
        expect(next.size).toBe(2);
    });
});

describe('touchEntry', () => {
    it('bumps the access time and saves the position', () => {
        const entries = new Map([[A, entry(A, 1)]]);
        const next = touchEntry(entries, A, 99, { lastPosition: 12, audioDuration: 60 });
        expect(next.get(A)).toMatchObject({ lastAccessAt: 99, lastPosition: 12, audioDuration: 60 });
        expect(entries.get(A)?.lastAccessAt).toBe(1);
    });

    it('is a no-op for an unknown article', () => {
        const entries = new Map([[A, entry(A, 1)]]);
        expect(touchEntry(entries, B, 99)).toEqual(entries);
    });
});

describe('shouldStartGeneration', () => {
    it('refuses a second generation for the same article and allows another article', () => {
        const generating = new Set([A]);
        expect(shouldStartGeneration(generating, A)).toBe(false);
        expect(shouldStartGeneration(generating, B)).toBe(true);
        expect(shouldStartGeneration(new Set(), A)).toBe(true);
    });
});
