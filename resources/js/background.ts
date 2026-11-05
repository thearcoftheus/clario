import { configureAxios } from '@/helpers/apiConfig';
import { getBrowserId } from '@/helpers/browserId';
import chromeMessage from '@/helpers/chromeMessage';
import getOverview from '@/helpers/getOverview';
import { getReadability } from '@/helpers/getReadability';
import initCsrf from '@/helpers/initCsrf';
import openSidebar from '@/helpers/openSidebar';
import { ChromeMessage, CmOverviewError, CmOverviewResponse } from '@/types/messages';

// Configure axios with API key for background script API calls
configureAxios();

initCsrf();

// Make sure this browser has its anonymous ID before any panel opens. The
// `onInstalled` listener covers a fresh install AND an existing install
// updating to a version that sends the ID (reason: 'update'); the bare call
// below covers a service worker that wakes up for any other reason.
chrome.runtime.onInstalled.addListener(() => {
    void getBrowserId();
});
void getBrowserId();

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

let isSidebarOpen = false;

async function setSidebarState(isOpen: boolean) {
    isSidebarOpen = isOpen;

    const tabs = await chrome.tabs.query({ currentWindow: true });
    tabs.forEach(tab => {
        if (tab.id === undefined) return;
        chrome.tabs.sendMessage(
            tab.id,
            chromeMessage({
                action: 'sidebarState',
                isOpen: isOpen,
            }),
        );
    });
}

chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'sidebar') {
        setSidebarState(true);

        port.onDisconnect.addListener(() => {
            setSidebarState(false);
        });
    }
});

chrome.runtime.onConnect.addListener(port => {
    if (port.name !== 'overview') return;

    port.onMessage.addListener(async (message: ChromeMessage) => {
        if (message.action !== 'toggleOverview') return;

        const respond = (response: CmOverviewResponse | CmOverviewError) => {
            port.postMessage(response);
        };

        getOverview(
            message.content,
            responseText => {
                respond({ action: 'overviewResponse', content: responseText });
            },
            (errorMessage, error) => {
                console.error(errorMessage, error);
                respond({ action: 'overviewError', errorMessage, error });
            },
        );
    });
});

chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
    switch (message.action) {
        case 'openSidebar':
            openSidebar();
            return;

        case 'getReadability':
            getReadability(message.content).then(readability => sendResponse(readability));
            return true;

        case 'getSidebarState':
            sendResponse(
                chromeMessage({
                    action: 'sidebarState',
                    isOpen: isSidebarOpen,
                }),
            );
            return;
    }
});
