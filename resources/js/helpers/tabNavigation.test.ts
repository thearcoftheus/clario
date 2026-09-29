import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { debounce, decideActivation, decideTabUpdate, isExtractableUrl, sameArticleUrl, type TabUpdateInput } from './tabNavigation';

const WIN = 7;
const A = 'https://example.org/a';
const B = 'https://example.org/b';

type UpdateOverrides = Omit<Partial<TabUpdateInput>, 'tab'> & { tab?: Partial<TabUpdateInput['tab']> };

function update(overrides: UpdateOverrides = {}): TabUpdateInput {
    return {
        myWindowId: WIN,
        cachedUrl: A,
        change: {},
        ...overrides,
        tab: { windowId: WIN, active: true, url: A, status: 'complete', ...overrides.tab },
    };
}

describe('isExtractableUrl', () => {
    it('accepts http and https only', () => {
        expect(isExtractableUrl('https://a.b/c')).toBe(true);
        expect(isExtractableUrl('http://a.b')).toBe(true);
        expect(isExtractableUrl('chrome://extensions')).toBe(false);
        expect(isExtractableUrl('about:blank')).toBe(false);
        expect(isExtractableUrl('chrome-extension://abc/sidepanel.html')).toBe(false);
        expect(isExtractableUrl('file:///tmp/x.html')).toBe(false);
        expect(isExtractableUrl(undefined)).toBe(false);
    });
});

describe('sameArticleUrl', () => {
    it('ignores the fragment and nothing else', () => {
        expect(sameArticleUrl(A, `${A}#top`)).toBe(true);
        expect(sameArticleUrl(`${A}#x`, `${A}#y`)).toBe(true);
        expect(sameArticleUrl(A, `${A}?p=2`)).toBe(false);
        expect(sameArticleUrl(A, B)).toBe(false);
    });
});

describe('decideTabUpdate', () => {
    it('ignores tabs in other windows', () => {
        expect(decideTabUpdate(update({ tab: { windowId: WIN + 1, url: B }, change: { status: 'complete' } }))).toBe('ignore');
    });

    it('does not filter by window when the panel has no window id', () => {
        expect(decideTabUpdate(update({ myWindowId: undefined, tab: { windowId: 99, url: B }, change: { status: 'complete' } }))).toBe('fetch');
    });

    it('never fetches for a background tab', () => {
        expect(decideTabUpdate(update({ tab: { active: false, url: B }, change: { status: 'complete' } }))).toBe('ignore');
        expect(decideTabUpdate(update({ tab: { active: false, url: B }, cachedUrl: null, change: { status: 'complete', url: B } }))).toBe('ignore');
    });

    it('invalidates a background tab that navigated away from its cached article', () => {
        expect(decideTabUpdate(update({ tab: { active: false, url: B }, change: { url: B } }))).toBe('invalidate');
    });

    it('leaves a background tab alone when it reloads the same article', () => {
        expect(decideTabUpdate(update({ tab: { active: false }, change: { status: 'loading', url: A } }))).toBe('ignore');
        expect(decideTabUpdate(update({ tab: { active: false }, change: { status: 'complete' } }))).toBe('ignore');
    });

    it('drops the cache when the active tab starts loading a different page, without fetching', () => {
        expect(decideTabUpdate(update({ tab: { url: B, status: 'loading' }, change: { status: 'loading', url: B } }))).toBe('invalidate');
        expect(decideTabUpdate(update({ tab: { url: B, status: 'loading' }, cachedUrl: null, change: { status: 'loading', url: B } }))).toBe('ignore');
    });

    it('keeps the cache while the active tab reloads the same page', () => {
        expect(decideTabUpdate(update({ tab: { status: 'loading' }, change: { status: 'loading' } }))).toBe('ignore');
    });

    it('fetches when the active tab completes a navigation to a new URL', () => {
        expect(decideTabUpdate(update({ tab: { url: B }, change: { status: 'complete' } }))).toBe('fetch');
        expect(decideTabUpdate(update({ tab: { url: B }, cachedUrl: null, change: { status: 'complete' } }))).toBe('fetch');
    });

    it('does not refetch a same-URL reload (pageLoaded handles that)', () => {
        expect(decideTabUpdate(update({ change: { status: 'complete' } }))).toBe('ignore');
    });

    it('treats a hash-only change as the same article', () => {
        expect(decideTabUpdate(update({ tab: { url: `${A}#section` }, change: { url: `${A}#section` } }))).toBe('ignore');
    });

    it('fetches on a same-document navigation reported as a url change on a complete tab', () => {
        expect(decideTabUpdate(update({ tab: { url: B, status: 'complete' }, change: { url: B } }))).toBe('fetch');
    });

    it('ignores title, favicon and other noise', () => {
        expect(decideTabUpdate(update({ change: { title: 'x' } as never }))).toBe('ignore');
        expect(decideTabUpdate(update({ change: {} }))).toBe('ignore');
    });

    it('clears when the tab goes somewhere unreadable, only if something was cached', () => {
        expect(decideTabUpdate(update({ tab: { url: 'chrome://newtab' }, change: { status: 'complete' } }))).toBe('clear');
        expect(decideTabUpdate(update({ tab: { url: 'chrome://newtab' }, cachedUrl: null, change: { status: 'complete' } }))).toBe('ignore');
    });

    it('clears a background tab that went somewhere unreadable too', () => {
        expect(decideTabUpdate(update({ tab: { url: 'chrome://settings', active: false }, change: { status: 'complete' } }))).toBe('clear');
    });
});

describe('decideActivation', () => {
    it('clears on unreadable pages', () => {
        expect(decideActivation({ tabUrl: 'chrome://extensions', cachedUrl: A })).toBe('switch-and-clear');
        expect(decideActivation({ tabUrl: undefined, cachedUrl: null })).toBe('switch-and-clear');
    });

    it('fetches when nothing is cached or the cache is for another URL', () => {
        expect(decideActivation({ tabUrl: A, cachedUrl: null })).toBe('switch-and-fetch');
        expect(decideActivation({ tabUrl: B, cachedUrl: A })).toBe('switch-and-fetch');
    });

    it('just switches on a cache hit, hash-insensitively', () => {
        expect(decideActivation({ tabUrl: A, cachedUrl: A })).toBe('switch');
        expect(decideActivation({ tabUrl: `${A}#foo`, cachedUrl: A })).toBe('switch');
    });
});

describe('debounce', () => {
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    });
    afterEach(() => {
        vi.useRealTimers();
    });

    it('runs once with the last arguments after the window', () => {
        const fn = vi.fn();
        const d = debounce(fn, 300);
        d(1);
        d(2);
        vi.advanceTimersByTime(299);
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        expect(fn).toHaveBeenCalledTimes(1);
        expect(fn).toHaveBeenCalledWith(2);
    });

    it('restarts the window on each call', () => {
        const fn = vi.fn();
        const d = debounce(fn, 300);
        d(1);
        vi.advanceTimersByTime(200);
        d(2);
        vi.advanceTimersByTime(200);
        expect(fn).not.toHaveBeenCalled();
        vi.advanceTimersByTime(100);
        expect(fn).toHaveBeenCalledWith(2);
    });
});
