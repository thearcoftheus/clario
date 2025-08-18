import { ChromeMessage } from '@/types/messages';

const ports: Record<string, chrome.runtime.Port> = {};

type PortOptions = {
    onMessage?: (message: ChromeMessage, port: chrome.runtime.Port) => void;
    onDisconnect?: (port: chrome.runtime.Port) => void;
};

export default function getChromePort(name: string, options: PortOptions = {}): chrome.runtime.Port | null {
    if (name in ports) return ports[name];

    try {
        const port = chrome.runtime.connect({ name });
        if (options.onMessage) port.onMessage.addListener(options.onMessage);
        port.onDisconnect.addListener(port => {
            delete ports[name];
            if (options.onDisconnect) options.onDisconnect(port);
        });
        ports[name] = port;
        return port;
    } catch (e) {
        console.error(`Failed to connect to port ${name}`, e);
        return null;
    }
}
