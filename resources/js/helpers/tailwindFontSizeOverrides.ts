function calculatedFontSize(elm: HTMLElement) {
    const computedStyle = window.getComputedStyle(elm);
    return parseFloat(computedStyle.fontSize);
}

function getFontSizeMultiplier(elm: HTMLElement) {
    // Calculate font-size defined by site
    const currentFontSize = calculatedFontSize(elm);

    // Reset the font size to its default value
    const existingFontSizeStyle = elm.style.fontSize;
    elm.style.fontSize = 'unset';
    void elm.offsetWidth; // Force reflow

    // Calculate default browser font size
    const defaultFontSize = calculatedFontSize(elm);

    // Restore the original font size style
    elm.style.fontSize = existingFontSizeStyle;

    return defaultFontSize / currentFontSize;
}

export default function tailwindFontSizeOverrides(): Record<string, string> {
    const html = document.querySelector('html')!;

    const multiplier = getFontSizeMultiplier(html);
    if (multiplier === 1) return {};

    return {
        '--tw-multiplier': multiplier.toString(),
        '--spacing': `calc(.25rem * var(--tw-multiplier))`,
        '--container-sm': `calc(24rem * var(--tw-multiplier))`,
        '--container-lg': `calc(32rem * var(--tw-multiplier))`,
        '--container-xl': `calc(36rem * var(--tw-multiplier))`,
        '--container-6xl': `calc(72rem * var(--tw-multiplier))`,
        '--text-xs': `calc(.75rem * var(--tw-multiplier))`,
        '--text-sm': `calc(.875rem * var(--tw-multiplier))`,
        '--text-base': `calc(1rem * var(--tw-multiplier))`,
        '--text-lg': `calc(1.125rem * var(--tw-multiplier))`,
        '--text-xl': `calc(1.25rem * var(--tw-multiplier))`,
        '--text-2xl': `calc(1.5rem * var(--tw-multiplier))`,
        '--text-3xl': `calc(1.875rem * var(--tw-multiplier))`,
        '--radius-xs': `calc(.125rem * var(--tw-multiplier))`,
        '--radius-xl': `calc(.75rem * var(--tw-multiplier))`,
    };
}
