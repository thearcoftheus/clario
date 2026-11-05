// Anonymous per-browser-profile identifier. Attached to feedback reports so
// we can see that several reports came from the same browser without knowing
// whose browser it is, and (since 0.8.0) sent as the `X-Clario-Browser-Id`
// header on every API request so the server can count how many browsers used
// Clario on a given day. The server keeps only (browser_id, day) — see
// `install_activity` in CLAUDE.md — never what was read or when.
//
// Deliberate properties:
//   - Identifies a browser profile, not a person. One person on two machines
//     is two IDs; a shared computer is one ID.
//   - Not derivable from, or linkable to, any account.
//   - Stored in chrome.storage.local, NEVER chrome.storage.sync — sync would
//     tie the ID to the user's Google account and propagate it across their
//     devices, which would undermine the anonymity story.
//   - Persists through extension disable/enable, browser restarts, and
//     extension updates. Resets on uninstall/reinstall or if the user clears
//     extension data. We make no attempt to recover or link a previous ID.

const BROWSER_ID_KEY = 'browserId';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let cachedId: string | null = null;
// Concurrent first-run callers must not each mint an ID and race to write it.
let inFlight: Promise<string> | null = null;

async function resolveBrowserId(): Promise<string> {
    const stored = await chrome.storage.local.get(BROWSER_ID_KEY);
    const existing = stored?.[BROWSER_ID_KEY];

    if (typeof existing === 'string' && UUID_PATTERN.test(existing)) {
        cachedId = existing;
        return existing;
    }

    const fresh = crypto.randomUUID();
    await chrome.storage.local.set({ [BROWSER_ID_KEY]: fresh });
    cachedId = fresh;
    return fresh;
}

/**
 * The ID if it has already been resolved in this context, else null.
 *
 * Synchronous on purpose: `getApiHeaders()` is sync and is passed to
 * `useStream` at component setup, where nothing can await. Entry points call
 * `getBrowserId()` at startup so this is populated before the first request.
 * A null here just means the header is omitted — never a failed request.
 */
export function peekBrowserId(): string | null {
    return cachedId;
}

/**
 * Get this browser's anonymous ID, creating and persisting one on first call.
 */
export function getBrowserId(): Promise<string> {
    if (cachedId) return Promise.resolve(cachedId);

    if (!inFlight) {
        inFlight = resolveBrowserId().finally(() => {
            inFlight = null;
        });
    }

    return inFlight;
}
