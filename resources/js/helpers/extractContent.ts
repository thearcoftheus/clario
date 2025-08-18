function extractContentFrom(elm: HTMLElement): string | null {
    const clone = elm.cloneNode(true) as HTMLElement;

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
        '.ad-slot',
        '.adsbygoogle',
        'script',
        'noscript',
        'iframe',
        'hr',
        'form',
    ].join(',');

    clone.querySelectorAll(selectorsToRemove).forEach(el => {
        return el.remove();
    });

    if (clone.innerText.trim().length === 0) {
        return null;
    }

    return clone.innerHTML;
}

export default function extractMainContent(): string {
    const tag = (selector: string) => [selector, `.${selector}`, `#${selector}`];
    const id = (selector: string) => [`.${selector}`, `#${selector}`];

    //prettier-ignore
    const selectors = [
        ...tag('main'),
        ...id('content'),
        ...tag('article'),
        ...id('blogpost'),
        ...id('blog-post'),
        ...id('newsarticle'),
        ...id('news-article'),
        ...id('post'),
    ];

    for (const selector of selectors) {
        const elements = document.querySelectorAll<HTMLElement>(selector);

        if (elements.length === 1) {
            console.log(`Trying ${selector} as main element`);

            const content = extractContentFrom(elements[0]);
            if (content) {
                console.log(`Found main content using ${selector}`);
                return content;
            }
        }
    }

    const content = extractContentFrom(document.body) ?? '';

    console.log('Using body as main element');

    return content;
}
