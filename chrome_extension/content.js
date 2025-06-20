chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'extractContent') {
        const content = extractMainContent();
        sendResponse({ content: content });
    }

    return true;
});

// Function to extract the main content from the page
function extractMainContent() {
    // Try to find the main content using common selectors
    const selectors = ['main', 'article', '#content', '.content', '#main', '.main', '.post', '.article'];

    let mainElement = null;

    // Try each selector until we find a match
    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            mainElement = element;
            break;
        }
    }

    // If no main content element was found, use the body
    if (!mainElement) {
        // As a fallback, get the body but exclude headers, footers, navs, and sidebars
        mainElement = document.body;

        // Create a clone to avoid modifying the actual page
        const clone = mainElement.cloneNode(true);

        // Remove common non-content elements
        const elementsToRemove = clone.querySelectorAll(
            'header, footer, nav, aside, .sidebar, #sidebar, .ad, .ads, .advertisement, script, noscript, iframe, hr',
        );
        elementsToRemove.forEach(el => el.remove());

        return clone.innerHTML;
    }

    return mainElement.innerHTML;
}

function pageLoaded() {
    chrome.runtime.sendMessage({
        type: 'pageLoaded',
        title: document.title,
        url: location.href,
        content: extractMainContent(),
    });
}

pageLoaded();

window.addEventListener('popstate', pageLoaded);
window.addEventListener('pushstate', pageLoaded);
window.addEventListener('replacestate', pageLoaded);

['pushState', 'replaceState'].forEach(fn => {
    const original = history[fn];
    history[fn] = function () {
        const result = original.apply(this, args);
        window.dispatchEvent(new Event(fn.toLowerCase()));
        return result;
    };
});
