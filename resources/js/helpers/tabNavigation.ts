// Pure decision logic for the side panel's tab tracking. No `chrome` imports
// so it can be unit tested; initSidebarListeners.ts feeds it plain values.
//
// Background: Chrome side panels are per-window, so one panel document
// follows the user across every tab in its window. The panel keeps a per-tab
// cache (historyStore) and these functions decide, for each tab event, whether
// that cache needs a fetch, an invalidation, or nothing at all. The guiding
// rule is that a background tab must never cause a fetch — the tester report
// that prompted this was "Clario was trying to read tabs I wasn't on".

/** Pages the content script can run on. Everything else has no article. */
export function isExtractableUrl(url: string | undefined): url is string {
    return typeof url === 'string' && /^https?:\/\//i.test(url);
}

/** Same page, ignoring the fragment — `#section` links are not a navigation. */
export function sameArticleUrl(a: string, b: string): boolean {
    return stripFragment(a) === stripFragment(b);
}

function stripFragment(url: string): string {
    const i = url.indexOf('#');
    return i === -1 ? url : url.slice(0, i);
}

export type TabUpdateDecision = 'ignore' | 'fetch' | 'invalidate';

export type TabUpdateInput = {
    myWindowId: number | undefined;
    tab: { windowId?: number; active: boolean; url?: string; status?: string };
    change: { status?: string; url?: string };
    /** URL of the item cached for this tab, or null when there is none. */
    cachedUrl: string | null;
};

/**
 * What to do with a `chrome.tabs.onUpdated` event. Fires many times per
 * navigation (loading, title, favicon, complete) and for every tab in every
 * window; only a completed navigation to a new URL in the active tab of our
 * window is worth a fetch.
 */
export function decideTabUpdate({ myWindowId, tab, change, cachedUrl }: TabUpdateInput): TabUpdateDecision {
    if (myWindowId !== undefined && tab.windowId !== myWindowId) return 'ignore';

    if (!isExtractableUrl(tab.url)) {
        // The tab went somewhere we cannot read (chrome://, the Web Store…).
        // Whatever we cached for it describes a page that is gone.
        return cachedUrl ? 'invalidate' : 'ignore';
    }

    const urlChanged = cachedUrl === null || !sameArticleUrl(cachedUrl, tab.url);

    if (!tab.active) {
        // Never fetch for a tab the user is not looking at. If it navigated
        // away from what we cached, drop the cache so activation refetches.
        return change.url !== undefined && cachedUrl !== null && urlChanged ? 'invalidate' : 'ignore';
    }

    if (change.status === 'loading') {
        // The active tab started loading a different page: what we cached is
        // about to be wrong, so drop it now rather than leave the previous
        // article on screen until the load finishes. The fetch itself waits
        // for pageLoaded / 'complete'. A same-URL reload keeps its cache.
        return cachedUrl !== null && urlChanged ? 'invalidate' : 'ignore';
    }

    if (change.status === 'complete') {
        // A same-URL reload lands here as 'ignore'; the content script's
        // pageLoaded message handles that case (regenerate only if the
        // extracted content actually changed).
        return urlChanged ? 'fetch' : 'ignore';
    }

    if (change.url !== undefined && tab.status === 'complete') {
        // Same-document navigation (pushState / replaceState): Chrome reports
        // a URL change without a loading → complete cycle.
        return urlChanged ? 'fetch' : 'ignore';
    }

    return 'ignore';
}

export type ActivationDecision = 'switch' | 'switch-and-fetch' | 'switch-and-clear';

/**
 * What to do when a tab becomes active. The pointer always moves; this only
 * says whether the cache for that tab is usable.
 */
export function decideActivation({ tabUrl, cachedUrl }: { tabUrl?: string; cachedUrl: string | null }): ActivationDecision {
    if (!isExtractableUrl(tabUrl)) return 'switch-and-clear';
    if (cachedUrl === null || !sameArticleUrl(cachedUrl, tabUrl)) return 'switch-and-fetch';
    return 'switch';
}

/**
 * Trailing-edge debounce. Hand-rolled rather than @vueuse's useDebounceFn so
 * the tests can drive it with fake timers and so it can be keyed per tab.
 */
export function debounce<T extends unknown[]>(fn: (...args: T) => void, ms: number): (...args: T) => void {
    let timer: ReturnType<typeof setTimeout> | null = null;
    return (...args: T) => {
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(() => {
            timer = null;
            fn(...args);
        }, ms);
    };
}
