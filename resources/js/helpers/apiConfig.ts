import axios from 'axios';
import { getBrowserId, peekBrowserId } from './browserId';

// API key from environment - will be empty in local dev, set for production
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Header carrying the anonymous per-browser ID on every API request, so the
 * server can count distinct browsers per day. Optional on the server side:
 * a request without it is served normally and simply not counted.
 */
export const BROWSER_ID_HEADER = 'X-Clario-Browser-Id';

/**
 * Get common headers for API requests.
 * Use this for fetch() calls.
 *
 * The browser ID is read synchronously from the cache that `getBrowserId()`
 * fills at startup (see sidebar.ts / background.ts). If it has not resolved
 * yet the header is left out rather than delaying the request.
 */
export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...additionalHeaders,
    };

    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }

    const browserId = peekBrowserId();
    if (browserId) {
        headers[BROWSER_ID_HEADER] = browserId;
    }

    return headers;
}

/**
 * Configure axios to include the API key and browser ID in all requests.
 * Call this once at app initialization.
 */
export function configureAxios(): void {
    if (API_KEY) {
        axios.defaults.headers.common['X-API-Key'] = API_KEY;
    }

    // Async interceptor: axios call sites don't all go through
    // getApiHeaders(), so attach the ID here for every request. Any failure
    // to read the ID leaves the request untouched — counting must never block
    // a user's request.
    axios.interceptors.request.use(async config => {
        if (!config.headers.has(BROWSER_ID_HEADER)) {
            try {
                config.headers.set(BROWSER_ID_HEADER, await getBrowserId());
            } catch {
                // Degrade silently.
            }
        }
        return config;
    });
}
