import ExtensionApp from '@/layouts/Extension.vue';
import { createPinia } from 'pinia';
import { createApp } from 'vue';
import { ZiggyVue } from 'ziggy-js';

const pinia = createPinia();

createApp(ExtensionApp).use(ZiggyVue).use(pinia).mount('#app');
