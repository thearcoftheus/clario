import initCsrf from '@/helpers/initCsrf';
import initSidebarListeners from '@/helpers/initSidebarListeners';
import ExtensionApp from '@/layouts/Extension.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';
import '../css/app.css';

initCsrf();

createApp(ExtensionApp).use(ZiggyVue).use(createPinia()).mount('#app');

initSidebarListeners();
