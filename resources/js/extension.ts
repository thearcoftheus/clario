import '../css/app.css';

import { createApp } from 'vue';
import ExtensionApp from '@/layouts/Extension.vue';

// Create and mount the Vue app
const app = createApp(ExtensionApp);

// Mount the app when the DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    app.mount('#app');
});
