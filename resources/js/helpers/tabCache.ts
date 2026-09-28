import { sameArticleUrl } from '@/helpers/tabNavigation';

// Array logic for historyStore's per-tab cache, kept pure for testing.

/**
 * Should a freshly extracted page replace what is cached for its tab? The
 * content script sends pageLoaded on every load, including a plain reload of
 * the same page, and the inject-and-retry path can deliver the same
 * extraction twice. Only a genuinely different page earns a new generation.
 */
export function shouldReplace(
    existing: { url: string; content: string } | undefined,
    incoming: { url: string; content: string },
): boolean {
    if (!existing) return true;
    if (!sameArticleUrl(existing.url, incoming.url)) return true;
    return existing.content !== incoming.content;
}

/**
 * Which cached item to evict once the cache is over `max`: the least recently
 * active tab that is not the one on screen. Returns null when nothing needs to
 * go.
 */
export function pickEviction<T extends { tabId: number; lastActiveAt: number }>(
    items: T[],
    currentTabId: number | null,
    max: number,
): T | null {
    if (items.length <= max) return null;
    let oldest: T | null = null;
    for (const item of items) {
        if (item.tabId === currentTabId) continue;
        if (oldest === null || item.lastActiveAt < oldest.lastActiveAt) oldest = item;
    }
    return oldest;
}
