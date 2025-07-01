import { route } from 'ziggy-js';

fetch(route('sanctum.csrf-cookie'), {
    credentials: 'include',
});
