import { configureAxios } from '@/helpers/apiConfig';
import initCsrf from '@/helpers/initCsrf';
import initSidebarListeners from '@/helpers/initSidebarListeners';
import SidebarApp from '@/layouts/Sidebar.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';
import '../css/app.css';

// Configure axios with API key header
configureAxios();

initCsrf();

createApp(SidebarApp).use(ZiggyVue).use(createPinia()).mount('#app');

initSidebarListeners();
