import { configureAxios } from '@/helpers/apiConfig';
import initCsrf from '@/helpers/initCsrf';
import initSidebarListeners from '@/helpers/initSidebarListeners';
import SidebarApp from '@/layouts/Sidebar.vue';
import { useReportStore } from '@/stores/reportStore';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';
import '../css/app.css';

// Configure axios with API key header
configureAxios();

initCsrf();

const pinia = createPinia();

createApp(SidebarApp).use(ZiggyVue).use(pinia).mount('#app');

initSidebarListeners();

// Send any feedback reports that were queued while the server was
// unreachable. Fire-and-forget: a failure here just leaves them queued for
// the next sidebar load.
void useReportStore(pinia).flushPending();
