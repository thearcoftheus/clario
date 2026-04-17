import chromeMessage from '@/helpers/chromeMessage';
import extractMainContent, { extractPageMetadata } from '@/helpers/extractContent';
import { mountOverviewWidget } from '@/helpers/mountOverviewWidget';
import onReady from '@/helpers/onReady';
import { ChromeMessage } from '@/types/messages';

chrome.runtime.onMessage.addListener((message: ChromeMessage, sender, sendResponse) => {
    if (message.action !== 'extractContent') return;

    const metadata = extractPageMetadata();
    sendResponse({
        title: document.title,
        url: location.href,
        content: extractMainContent(),
        ...metadata,
    });
});

function pageLoaded() {
    const metadata = extractPageMetadata();
    chrome.runtime.sendMessage(
        chromeMessage({
            action: 'pageLoaded',
            title: document.title,
            url: location.href,
            content: extractMainContent(),
            ...metadata,
        }),
    );
}

pageLoaded();

window.addEventListener('popstate', pageLoaded);
window.addEventListener('pushstate', pageLoaded);
window.addEventListener('replacestate', pageLoaded);

const states = ['pushState', 'replaceState'] as const;
states.forEach(fn => {
    const original = history[fn];
    history[fn] = function (args) {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event(fn.toLowerCase()));
        return result;
    };
});

onReady(mountOverviewWidget);
