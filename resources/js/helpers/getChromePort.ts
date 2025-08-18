import { ChromeMessage } from '@/types/messages';

const ports: Record<string, chrome.runtime.Port> = {};

export default function getChromePort(
    name: string,
    onMessage: (message: ChromeMessage, port: chrome.runtime.Port) => void,
): chrome.runtime.Port | null {
    if (name in ports) return ports[name];

    try {
        const port = chrome.runtime.connect({ name });
        port.onMessage.addListener(onMessage);
        port.onDisconnect.addListener(() => {
            delete ports[name];
        });
        ports[name] = port;
        return port;
    } catch (e) {
        console.error(`Failed to connect to port ${name}`, e);
        return null;
    }
}
