import '../css/app.css';

import ExtensionApp from '@/layouts/Extension.vue';
import { useHistoryStore } from '@/stores/historyStore';
import { Ziggy } from '@/ziggy';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { route, ZiggyVue } from 'ziggy-js';

window.Ziggy = Ziggy;
window.route = route;

fetch('https://arc-extension.ddev.site/sanctum/csrf-cookie', {
    credentials: 'include',
});

const pinia = createPinia();

createApp(ExtensionApp).use(ZiggyVue).use(pinia).mount('#app');

const historyStore = useHistoryStore();

chrome.runtime.onMessage.addListener(message => {
    if (message.type === 'pageLoaded') {
        historyStore.add({
            name: message.title,
            url: message.url,
            content: message.content,
        });
    }
});
