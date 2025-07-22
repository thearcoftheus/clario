import route from '@/helpers/route';

export default function initCsrf() {
    fetch(route('sanctum.csrf-cookie'), {
        credentials: 'include',
    });
}
