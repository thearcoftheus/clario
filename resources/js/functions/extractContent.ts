export async function extractContent(): Promise<string> {
    return new Promise(async (resolve, reject) => {
        try {
            // Get the current active tab in the window
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

            if (!tab || tab.id === undefined) {
                console.error('Error: No active tab found.');
                reject();
            }

            // Send message to the content script
            chrome.tabs.sendMessage(tab.id!, { action: 'extractContent' }, response => {
                if (chrome.runtime.lastError) {
                    console.error('Error: ' + chrome.runtime.lastError.message);
                    reject();
                }

                if (response && response.content) {
                    resolve(response.content);
                } else {
                    console.error('No content could be extracted.');
                    reject();
                }
            });
        } catch (error) {
            console.error('Error: ' + error);
            reject();
        }
    });
}
