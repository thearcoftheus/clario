import route from '@/helpers/route';

export default async function getOverview(content: string, callback: (responseText: string) => void) {
    let response;

    try {
        response = await fetch(route('overview'), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'text/event-stream',
            },
            body: JSON.stringify({ content }),
        });
    } catch (e) {
        console.error('Network error', e);
        return;
    }

    if (!response.ok || !response.body) {
        console.error('Bad response', response.status);
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
            console.error('Stream read error:', e);
        }
    } finally {
        reader.cancel();
    }
}
