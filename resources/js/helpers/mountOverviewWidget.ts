import tailwindStyles from '@/../css/shadow.css?inline';
import OverviewWidget from '@/layouts/OverviewWidget.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';

const containerId = 'clario-container';

function createContainer(): HTMLDivElement {
    const container = document.createElement('div');
    container.id = 'clario-container';
    container.style.position = 'fixed';
    container.style.bottom = '1rem';
    container.style.right = '1rem';
    container.style.zIndex = '99999';
    return container;
}

export default function mountOverviewWidget() {
    const existingContainer = document.getElementById(containerId);
    if (existingContainer) return;

    const container = createContainer();

    const shadow = container.attachShadow({ mode: 'open' });

    const style = document.createElement('style');
    style.textContent = tailwindStyles;
    shadow.appendChild(style);

    const mountPoint = document.createElement('div');
    shadow.appendChild(mountPoint);

    createApp(OverviewWidget).use(ZiggyVue).use(createPinia()).mount(mountPoint);

    document.body.appendChild(container);
}
