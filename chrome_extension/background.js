let sidebarPort = null;

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

chrome.action.onClicked.addListener(tab => {
    chrome.sidePanel.open({ tabId: tab.id });
});
chrome.runtime.onConnect.addListener(port => {
    if (port.name === 'sidebar-channel') {
        sidebarPort = port;
        port.onDisconnect.addListener(() => (sidebarPort = null));
    }
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (!sidebarPort) return;
    if (tab.active && (changeInfo.status || changeInfo.url)) {
        sidebarPort.postMessage({
            type: 'tab-updated',
            status: changeInfo.status,
            url: changeInfo.url || tab.url,
            tabId: tab.id,
        });
    }
});

chrome.tabs.onActivated.addListener(activeInfo => {
    if (!sidebarPort) return;
    chrome.tabs.get(activeInfo.tabId, tab => {
        sidebarPort.postMessage({
            type: 'tab-activated',
            status: tab.status,
            url: tab.url,
            tabId: tab.id,
        });
    });
});
