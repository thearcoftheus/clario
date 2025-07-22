export default function extractMainContent() {
    const selectors = ['main', 'article', '#content', '.content', '#main', '.main', '.post', '.article'];

    let mainElement = null;

    for (const selector of selectors) {
        const element = document.querySelector(selector);
        if (element) {
            mainElement = element;
            break;
        }
    }

    if (!mainElement) mainElement = document.body;

    const clone = mainElement.cloneNode(true) as HTMLElement;

    const selectorsToRemove = [
        'header',
        'footer',
        'nav',
        'aside',
        '.sidebar',
        '#sidebar',
        '.ad',
        '.ads',
        '.advertisement',
        'script',
        'noscript',
        'iframe',
        'hr',
        'form',
    ].join(',');

    clone.querySelectorAll(selectorsToRemove).forEach(el => {
        return el.remove();
    });

    return clone.innerHTML;
}
