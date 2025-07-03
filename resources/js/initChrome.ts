import { useAppStateStore } from '@/stores/appStateStore';
import { useHistoryStore } from '@/stores/historyStore';
import { storeToRefs } from 'pinia';

const historyStore = useHistoryStore();

const appState = useAppStateStore();
const { isExtractingContent } = storeToRefs(appState);

chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'pageLoaded') {
        historyStore.add({
            name: message.title,
            url: message.url,
            content: message.content,
        });
    }
});

document.addEventListener('DOMContentLoaded', () => {
    function injectContentScript(tabId: number, callback: () => any) {
        chrome.scripting.executeScript(
            {
                target: { tabId },
                files: ['content.js'],
            },
            callback,
        );
    }

    function getPageContent(tabId: number, retry: number = 3) {
        isExtractingContent.value = true;
        chrome.tabs.sendMessage(tabId, { action: 'extractContent' }, response => {
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
            });

            isExtractingContent.value = false;
        });
    }

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
        if (!tabs[0]?.id) return;
        getPageContent(tabs[0].id!);
    });

    const port = chrome.runtime.connect({ name: 'sidebar-channel' });

    port.onMessage.addListener(message => {
        if (message.type === 'tab-updated' || message.type === 'tab-activated') {
            getPageContent(message.tabId);
        }
    });
});
