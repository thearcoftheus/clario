import '../css/app.css';

import ExtensionApp from '@/layouts/Extension.vue';
import { createApp } from 'vue';

fetch('https://arc-extension.ddev.site/sanctum/csrf-cookie', {
    credentials: 'include',
});

createApp(ExtensionApp).mount('#app');
