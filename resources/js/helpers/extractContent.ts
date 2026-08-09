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
        // <style> blocks survive into innerHTML otherwise, and their CSS text
        // is then sent to the simplification API as if it were article
        // content. Pure noise: it costs input tokens on every call and can
        // only confuse the model.
        'style',
        // Icon markup — inflates the payload and leaves empty list rows behind.
        'svg',
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

export function extractPageMetadata(): { image?: string; description?: string } {
    const image =
        document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content ||
        document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content ||
        undefined;

    const description =
        document.querySelector<HTMLMetaElement>('meta[property="og:description"]')?.content ||
        document.querySelector<HTMLMetaElement>('meta[name="description"]')?.content ||
        undefined;

    return { image, description };
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
