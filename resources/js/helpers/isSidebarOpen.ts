import chromeMessage from '@/helpers/chromeMessage';
import { CmSidebarState } from '@/types/messages';

export default function isSidebarOpen(): Promise<boolean> {
    return new Promise(resolve => {
        chrome.runtime.sendMessage(
            chromeMessage({
                action: 'getSidebarState',
            }),
            (response: CmSidebarState) => {
                resolve(response.isOpen);
            },
        );
    });
}
