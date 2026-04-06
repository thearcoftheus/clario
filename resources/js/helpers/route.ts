import { Ziggy as ZiggyConfig } from '@/ziggy';
import { route as ziggyRoute, ValidRouteName } from 'ziggy-js';

// Override the URL with the environment variable if available
// This allows switching between local and production without regenerating Ziggy
const Ziggy = {
    ...ZiggyConfig,
    url: import.meta.env.VITE_API_URL || ZiggyConfig.url,
};

export default function route(name: ValidRouteName, params?: any, absolute?: boolean) {
    return ziggyRoute(name, params, absolute, Ziggy);
}
