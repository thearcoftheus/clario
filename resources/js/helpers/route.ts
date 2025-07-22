import { Ziggy } from '@/ziggy';
import { route as ziggyRoute, ValidRouteName } from 'ziggy-js';

export default function route(name: ValidRouteName, params?: any, absolute?: boolean) {
    return ziggyRoute(name, params, absolute, Ziggy);
}
