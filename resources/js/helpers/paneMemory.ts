import type { View } from '@/composables/useNavigation';

// Which pane each browser tab was last on, kept pure for testing. The side
// panel is one document per window, so without this the pane the user opened
// on one tab would just stay up over whatever tab they switch to. historyStore
// owns the map; Sidebar.vue's activeView is derived from it.

export const DEFAULT_VIEW: View = 'home';

/** The pane to show for a tab: what it was last on, or Home for a tab we have never seen. */
export function viewForTab(views: ReadonlyMap<number, View>, tabId: number | null): View {
    if (tabId === null) return DEFAULT_VIEW;
    return views.get(tabId) ?? DEFAULT_VIEW;
}

/**
 * Remember that a tab is on `view`. Returns a new map. Chat is a modal over
 * the current pane rather than a pane of its own, so it is never remembered.
 */
export function rememberView(views: ReadonlyMap<number, View>, tabId: number | null, view: View): Map<number, View> {
    const next = new Map(views);
    if (tabId === null || view === 'chat') return next;
    next.set(tabId, view);
    return next;
}

/** Forget a tab's pane so its next activation lands on Home. Returns a new map. */
export function forgetView(views: ReadonlyMap<number, View>, tabId: number): Map<number, View> {
    const next = new Map(views);
    next.delete(tabId);
    return next;
}
