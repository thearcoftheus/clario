import '../css/app.css';

import ExtensionApp from '@/layouts/Extension.vue';
import { Ziggy } from '@/ziggy';
import { createApp } from 'vue';
import { route, ZiggyVue } from 'ziggy-js';

window.Ziggy = Ziggy;
window.route = route;

fetch('https://arc-extension.ddev.site/sanctum/csrf-cookie', {
    credentials: 'include',
});

createApp(ExtensionApp).use(ZiggyVue).mount('#app');
