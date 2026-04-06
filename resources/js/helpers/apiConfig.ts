import axios from 'axios';

// API key from environment - will be empty in local dev, set for production
const API_KEY = import.meta.env.VITE_API_KEY || '';

/**
 * Get common headers for API requests.
 * Use this for fetch() calls.
 */
export function getApiHeaders(additionalHeaders: Record<string, string> = {}): Record<string, string> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...additionalHeaders,
    };

    if (API_KEY) {
        headers['X-API-Key'] = API_KEY;
    }

    return headers;
}

/**
 * Configure axios to include the API key in all requests.
 * Call this once at app initialization.
 */
export function configureAxios(): void {
    if (API_KEY) {
        axios.defaults.headers.common['X-API-Key'] = API_KEY;
    }
}
