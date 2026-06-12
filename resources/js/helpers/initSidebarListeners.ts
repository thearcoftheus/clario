import chromeMessage from '@/helpers/chromeMessage';
import getChromePort from '@/helpers/getChromePort';
import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { ChromeMessage } from '@/types/messages';
import { storeToRefs } from 'pinia';

function initSidebarPort() {
    // Open sidebar port so that we can detect sidebar open/close
    getChromePort('sidebar', {
        onDisconnect: initSidebarPort,
    });
}

function injectContentScript(tabId: number, callback: () => any) {
    chrome.scripting.executeScript(
        {
            target: { tabId },
            files: ['build/content.js'],
        },
        callback,
    );
}

function getPageContent(tabId: number, retry: number = 3) {
    const historyStore = useHistoryStore();

    const appState = useAppStateStore();
    const { isExtractingContent } = storeToRefs(appState);

    isExtractingContent.value = true;

    chrome.tabs.sendMessage(
        tabId,
        chromeMessage({
            action: 'extractContent',
        }),
        response => {
            if (chrome.runtime.lastError || !response) {
                if (retry > 0) {
                    injectContentScript(tabId, () => getPageContent(tabId, --retry));
                } else {
                    isExtractingContent.value = false;
                }
                return;
            }

            historyStore.add({
                name: response.title,
                url: response.url,
                content: response.content,
                image: response.image,
                description: response.description,
            });

            isExtractingContent.value = false;
        },
    );
}

export default async function initSidebarListeners() {
    const historyStore = useHistoryStore();

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

    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender) => {
        if (message.action !== 'pageLoaded') return;
        if (sender.tab?.windowId !== myWindowId) return;
        if (!sender.tab?.active) return;
        historyStore.add({
            name: message.title,
            url: message.url,
            content: message.content,
            image: message.image,
            description: message.description,
        });
    });

    document.addEventListener('DOMContentLoaded', () => {
        // Get current tab content within our window
        chrome.tabs.query({ active: true, windowId: myWindowId }, tabs => {
            if (!tabs[0]?.id) return;
            getPageContent(tabs[0].id!);
        });

        // When a tab in our window updates, get its content
        chrome.tabs.onUpdated.addListener((tabId, _changeInfo, tab) => {
            if (tab.windowId !== myWindowId) return;
            getPageContent(tabId);
        });

        // When the active tab in our window changes, get its content
        chrome.tabs.onActivated.addListener(activeInfo => {
            if (activeInfo.windowId !== myWindowId) return;
            getPageContent(activeInfo.tabId);
        });
    });
}
