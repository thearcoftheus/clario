import chromeMessage from '@/helpers/chromeMessage';
import getOverview from '@/helpers/getOverview';
import { getReadability } from '@/helpers/getReadability';
import initCsrf from '@/helpers/initCsrf';
import openSidebar from '@/helpers/openSidebar';
import { ChromeMessage } from '@/types/messages';

initCsrf();

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

        getOverview(message.content, responseText => {
            port.postMessage({ content: responseText });
        });
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
