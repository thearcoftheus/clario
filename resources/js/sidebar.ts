import initCsrf from '@/helpers/initCsrf';
import initSidebarListeners from '@/helpers/initSidebarListeners';
import SidebarApp from '@/layouts/Sidebar.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';
import '../css/app.css';

initCsrf();

createApp(SidebarApp).use(ZiggyVue).use(createPinia()).mount('#app');

initSidebarListeners();
