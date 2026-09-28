// Per-tab request tokens. Content extraction is asynchronous (a message to the
// content script, possibly an injection and a retry), so a reply for a tab can
// arrive after a newer request for the same tab was issued — or after the tab
// navigated. Callers take a token when they start and check it when the reply
// lands; anything that is no longer current is dropped on the floor.

export type StaleGuard = {
    /** Issue a new token for this tab. Every older token for the tab is now stale. */
    next(tabId: number): number;
    /** Is this token still the latest one issued for the tab? */
    isCurrent(tabId: number, token: number): boolean;
    /** Make every in-flight request for the tab stale without issuing a new one. */
    invalidate(tabId: number): void;
    /** The tab is gone; free its counter. */
    forget(tabId: number): void;
};

export function createStaleGuard(): StaleGuard {
    const latest = new Map<number, number>();
    return {
        next(tabId) {
            const token = (latest.get(tabId) ?? 0) + 1;
            latest.set(tabId, token);
            return token;
        },
        isCurrent(tabId, token) {
            return latest.get(tabId) === token;
        },
        invalidate(tabId) {
            latest.set(tabId, (latest.get(tabId) ?? 0) + 1);
        },
        forget(tabId) {
            latest.delete(tabId);
        },
    };
}
