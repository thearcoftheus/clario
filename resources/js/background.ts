import getOverview from '@/helpers/getOverview';
import { getReadability } from '@/helpers/getReadability';
import initCsrf from '@/helpers/initCsrf';
import openSidebar from '@/helpers/openSidebar';
import { ChromeMessage } from '@/types/messages';

initCsrf();

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

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
    }
});
