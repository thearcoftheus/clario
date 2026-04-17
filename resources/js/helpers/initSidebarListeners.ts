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

export default function initSidebarListeners() {
    const historyStore = useHistoryStore();

    initSidebarPort();

    chrome.runtime.onMessage.addListener((message: ChromeMessage, sender) => {
        if (message.action !== 'pageLoaded') return;
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
        // Get current tab content
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
            if (!tabs[0]?.id) return;
            getPageContent(tabs[0].id!);
        });

        // When tab updated, get tab's content
        chrome.tabs.onUpdated.addListener(tabId => {
            getPageContent(tabId);
        });

        // When switch to new tab, get tab's content
        chrome.tabs.onActivated.addListener(activeInfo => {
            getPageContent(activeInfo.tabId);
        });
    });
}
