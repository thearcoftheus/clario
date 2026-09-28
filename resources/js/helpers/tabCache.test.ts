import { describe, expect, it } from 'vitest';
import { pickEviction, shouldReplace } from './tabCache';

const A = { url: 'https://x.org/a', content: '<p>a</p>' };

describe('shouldReplace', () => {
    it('replaces when nothing is cached', () => {
        expect(shouldReplace(undefined, A)).toBe(true);
    });

    it('replaces on a different URL', () => {
        expect(shouldReplace(A, { ...A, url: 'https://x.org/b' })).toBe(true);
    });

    it('keeps the cache for a hash-only difference with the same content', () => {
        expect(shouldReplace(A, { ...A, url: `${A.url}#h` })).toBe(false);
    });

    it('replaces when the page content changed', () => {
        expect(shouldReplace(A, { ...A, content: '<p>a updated</p>' })).toBe(true);
    });

    it('keeps an identical re-extraction', () => {
        expect(shouldReplace(A, { ...A })).toBe(false);
    });
});

describe('pickEviction', () => {
    const items = [
        { tabId: 1, lastActiveAt: 30 },
        { tabId: 2, lastActiveAt: 10 },
        { tabId: 3, lastActiveAt: 20 },
    ];

    it('returns null while under the cap', () => {
        expect(pickEviction(items, 1, 3)).toBeNull();
    });

    it('picks the least recently active item over the cap', () => {
        expect(pickEviction(items, 1, 2)?.tabId).toBe(2);
    });

    it('never picks the current tab', () => {
        expect(pickEviction(items, 2, 2)?.tabId).toBe(3);
    });

    it('returns null when only the current tab remains', () => {
        expect(pickEviction([{ tabId: 1, lastActiveAt: 1 }], 1, 0)).toBeNull();
    });
});
