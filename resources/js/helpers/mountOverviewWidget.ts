import tailwindStyles from '@/../css/shadow.css?inline';
import { configureAxios } from '@/helpers/apiConfig';
import isSidebarOpen from '@/helpers/isSidebarOpen';
import tailwindFontSizeOverrides from '@/helpers/tailwindFontSizeOverrides';
import OverviewWidget from '@/layouts/OverviewWidget.vue';
import { ChromeMessage } from '@/types/messages';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';

// Configure axios with API key header for content script API calls
configureAxios();

const containerId = 'clario-container';

async function createContainer(): Promise<HTMLDivElement> {
    const container = document.createElement('div');

    container.id = 'clario-container';

    container.style.position = 'fixed';
    container.style.bottom = 'calc(1rem * var(--tw-multiplier, 1))';
    container.style.right = 'calc(1rem * var(--tw-multiplier, 1))';
    container.style.zIndex = '2147483647';
    container.style.transition = 'opacity 0.2s';

    const overrides = tailwindFontSizeOverrides();
    Object.entries(overrides).forEach(([key, value]) => {
        container.style.setProperty(key, value);
    });

    const isOpen = await isSidebarOpen();
    setContainerState(container, isOpen);

    chrome.runtime.onMessage.addListener((message: ChromeMessage) => {
        if (message.action !== 'sidebarState') return;
        setContainerState(container, message.isOpen);
    });

    return container;
}

function setContainerState(container: HTMLElement, hideContainer: boolean) {
    container.style.opacity = hideContainer ? '0' : '1';
    container.style.pointerEvents = hideContainer ? 'none' : 'auto';
    container.inert = hideContainer;
    container.ariaHidden = hideContainer ? 'true' : 'false';
}

export async function mountOverviewWidget() {
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) return;

    const container = await createContainer();

    const shadow = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = tailwindStyles;
    shadow.appendChild(style);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    createApp(OverviewWidget).use(ZiggyVue).use(createPinia()).mount(mountPoint);

    document.body.appendChild(container);
}
