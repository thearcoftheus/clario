import chromeMessage from '@/helpers/chromeMessage';
import getChromePort from '@/helpers/getChromePort';
import { createStaleGuard } from '@/helpers/staleGuard';
import { debounce, decideActivation, decideTabUpdate, isExtractableUrl, sameArticleUrl } from '@/helpers/tabNavigation';
import { useHistoryStore } from '@/stores/historyStore';
import { ChromeMessage } from '@/types/messages';

// How long a tab has to stay active before the panel extracts it. Flicking
// through tabs must not fan out an extraction (and a paid generation) per
// tab passed over.
export const FETCH_DEBOUNCE_MS = 300;

function initSidebarPort() {
    // Open sidebar port so that we can detect sidebar open/close
    getChromePort('sidebar', {
        onDisconnect: initSidebarPort,
    });
}

function injectContentScript(tabId: number, callback: () => void) {
    chrome.scripting.executeScript(
        {
            target: { tabId },
            files: ['build/content.js'],
        },
        callback,
    );
}

/**
 * Wires the side panel to the tabs of its window.
 *
 * Chrome side panels are per-window: this one document stays open while the
 * user moves between tabs. historyStore caches one article per tab, so the
 * job here is to move the store's pointer on every switch and to fetch only
 * when a tab genuinely has a page we haven't read — never for a tab the user
 * is not looking at. The decisions themselves are pure functions in
 * helpers/tabNavigation.ts; this file is the glue to the Chrome APIs.
 */
export default async function initSidebarListeners() {
    const historyStore = useHistoryStore();
    const guard = createStaleGuard();

    initSidebarPort();

    // Pin this sidebar instance to its host window. Every Chrome event listener
    // below filters against this ID so we ignore page loads, tab switches, and
    // tab updates that happen in other browser windows. Without this, the
    // sidebar in Window A would react to navigation in Window B since Chrome's
    // tab and runtime APIs broadcast globally by default.
    const hostWindow = await chrome.windows.getCurrent();
    const myWindowId = hostWindow.id;
    if (myWindowId === undefined) {
        console.warn('[Clario] chrome.windows.getCurrent() returned no id; sidebar event filtering is disabled.');
    }

    function inMyWindow(windowId: number | undefined): boolean {
        return myWindowId === undefined || windowId === myWindowId;
    }

    function invalidate(tabId: number) {
        guard.invalidate(tabId);
        historyStore.remove(tabId);
    }

    // Ask the tab's content script for the page. Injects the script and
    // retries when the tab predates this build of the extension. `token`
    // travels with the retries so a reply that lands after a newer request
    // for the same tab — or after the tab navigated — is dropped.
    function getPageContent(tabId: number, retry: number = 3, token: number = guard.next(tabId)) {
        if (!guard.isCurrent(tabId, token)) return;

        historyStore.setPending(tabId, true);

        chrome.tabs.sendMessage(
            tabId,
            chromeMessage({
                action: 'extractContent',
            }),
            response => {
                if (!guard.isCurrent(tabId, token)) return;

                if (chrome.runtime.lastError || !response) {
                    if (retry > 0) {
                        injectContentScript(tabId, () => getPageContent(tabId, retry - 1, token));
                    } else {
                        historyStore.setPending(tabId, false);
                    }
                    return;
                }

                historyStore.add(tabId, {
                    name: response.title,
                    url: response.url,
                    content: response.content,
                    image: response.image,
                    description: response.description,
                });

                historyStore.setPending(tabId, false);
            },
        );
    }

    // Activation-driven fetches wait for the user to settle. One shared
    // timer: only the last activation in the window fetches, and only if that
    // tab is still the one on screen. Tabs passed over on the way get their
    // spinner cleared.
    const awaitingFetch = new Set<number>();
    const fetchAfterSettle = debounce((tabId: number) => {
        for (const id of awaitingFetch) {
            if (id !== tabId) historyStore.setPending(id, false);
        }
        awaitingFetch.clear();

        if (historyStore.currentTabId === tabId) {
            getPageContent(tabId);
        } else {
            historyStore.setPending(tabId, false);
        }
    }, FETCH_DEBOUNCE_MS);

    function scheduleFetch(tabId: number) {
        historyStore.setPending(tabId, true);
        awaitingFetch.add(tabId);
        fetchAfterSettle(tabId);
    }

    // Point the panel at a tab. A cache hit renders immediately and costs
    // nothing; a miss fetches (after the settle delay unless `immediate`).
    function activateTab(tab: chrome.tabs.Tab, { immediate = false } = {}) {
        const tabId = tab.id;
        if (tabId === undefined) return;

        historyStore.setCurrentTab(tabId);

        const decision = decideActivation({
            tabUrl: tab.url,
            cachedUrl: historyStore.itemForTab(tabId)?.url ?? null,
        });

        if (decision === 'switch-and-clear') {
            invalidate(tabId);
        } else if (decision === 'switch-and-fetch') {
            if (immediate) getPageContent(tabId);
            else scheduleFetch(tabId);
        }
    }

    // The content script announces itself on load and on same-document
    // navigation. For the active tab that is the freshest possible read of
    // the page, so it wins over any extraction still in flight. For a
    // background tab we only note that whatever we cached is now stale.
    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender) => {
        if (message.action !== 'pageLoaded') return;
        const tab = sender.tab;
        if (!tab?.id || !inMyWindow(tab.windowId)) return;
        const tabId = tab.id;

        if (tab.active) {
            guard.invalidate(tabId);
            historyStore.add(tabId, {
                name: message.title,
                url: message.url,
                content: message.content,
                image: message.image,
                description: message.description,
            });
            historyStore.setPending(tabId, false);
            return;
        }

        const cached = historyStore.itemForTab(tabId);
        if (cached && !sameArticleUrl(cached.url, message.url)) invalidate(tabId);
    });

    // Initial state: whichever tab is active in our window right now.
    chrome.tabs.query({ active: true, windowId: myWindowId }, tabs => {
        historyStore.markInitialTabResolved();
        const tab = tabs[0];
        if (tab) activateTab(tab, { immediate: true });
    });

    chrome.tabs.onActivated.addListener(({ tabId, windowId }) => {
        if (!inMyWindow(windowId)) return;
        chrome.tabs.get(tabId, tab => {
            // The tab can be gone by the time we ask (closed mid-switch).
            if (chrome.runtime.lastError || !tab) return;
            activateTab(tab);
        });
    });

    // Fires many times per navigation and for every tab; decideTabUpdate
    // picks out the one case worth a fetch (the active tab finished loading
    // a different page) and the cases that only stale the cache.
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        const decision = decideTabUpdate({
            myWindowId,
            tab: { windowId: tab.windowId, active: tab.active, url: tab.url, status: tab.status },
            change: { status: changeInfo.status, url: changeInfo.url },
            cachedUrl: historyStore.itemForTab(tabId)?.url ?? null,
        });

        if (decision === 'fetch') {
            getPageContent(tabId);
        } else if (decision === 'invalidate') {
            invalidate(tabId);
            // The active tab is loading a page we will read as soon as it
            // lands (pageLoaded or 'complete'): show the spinner meanwhile,
            // not the empty state. Cleared by whichever of those arrives.
            if (tab.active && changeInfo.status === 'loading' && isExtractableUrl(tab.url)) {
                historyStore.setPending(tabId, true);
            }
        }
    });

    chrome.tabs.onRemoved.addListener((tabId, { windowId }) => {
        if (!inMyWindow(windowId)) return;
        guard.forget(tabId);
        historyStore.remove(tabId);
        // Chrome follows this with onActivated for whichever tab takes over.
        if (historyStore.currentTabId === tabId) historyStore.setCurrentTab(null);
    });

    // Prerendered / instant pages swap tab ids on commit. The new id gets its
    // own onUpdated / onActivated; the old one just needs forgetting.
    chrome.tabs.onReplaced.addListener((_addedTabId, removedTabId) => {
        guard.forget(removedTabId);
        historyStore.remove(removedTabId);
    });
}
