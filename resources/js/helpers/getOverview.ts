import { getApiHeaders } from '@/helpers/apiConfig';
import route from '@/helpers/route';

export default async function getOverview(
    content: string,
    callback: (responseText: string) => void,
    errorCallback: (errorMessage: string, error: any) => void,
) {
    let response;

    try {
        response = await fetch(route('overview'), {
            method: 'POST',
            headers: getApiHeaders({ Accept: 'text/event-stream' }),
            body: JSON.stringify({ content }),
        });
    } catch (e) {
        errorCallback('Network error', e);
        return;
    }

    if (!response.ok || !response.body) {
        errorCallback('Bad response', response.status);
        return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let responseText = '';

    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            responseText += chunk;

            callback(responseText);
        }
    } catch (e) {
        if (typeof e === 'object' && e !== null && 'name' in e && e.name !== 'AbortError') {
            errorCallback('Stream read error', e);
        }
    } finally {
        reader.cancel();
    }
}
