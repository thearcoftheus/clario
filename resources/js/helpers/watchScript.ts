// Decisions for avatarStore's single script slot, kept pure for testing. The
// panel follows the user across tabs, so the slot records which article (and
// which version of its summary) the script belongs to, and reads as idle for
// any other article rather than showing A's "Ready to generate" under B.

export type ScriptStatus = 'idle' | 'preparing' | 'ready' | 'error';

export interface ScriptSlot {
    url: string | null;
    /** The simplified text the script was prepared from. */
    summary: string | null;
    status: ScriptStatus;
}

export interface ScriptItem {
    url: string;
    simplifiedContent: string;
    isFetching: boolean;
    isStreaming: boolean;
}

/**
 * Should a script be prepared for the article on screen? Only once its
 * summary is complete, and only if the slot is not already for this exact
 * summary (preparing, ready, or failed — a failure does not retry by itself).
 */
export function decideScriptPrep(slot: ScriptSlot, item: ScriptItem | null): 'none' | 'prepare' {
    if (!item) return 'none';
    if (item.isFetching || item.isStreaming || !item.simplifiedContent) return 'none';
    if (slot.url !== item.url) return 'prepare';
    if (slot.summary !== item.simplifiedContent) return 'prepare';
    if (slot.status === 'idle') return 'prepare';
    return 'none';
}

/** The slot's status as the pane should see it: idle unless the slot is for the article on screen. */
export function effectiveScriptStatus(slot: ScriptSlot, currentUrl: string | null): ScriptStatus {
    if (slot.url === null || slot.url !== currentUrl) return 'idle';
    return slot.status;
}
