export type CmOpenSidebar = { action: 'openSidebar' };
export type CmGetReadability = { action: 'getReadability'; content: string };
export type CmToggleOverview = { action: 'toggleOverview'; content: string };

export type CmTabChanged = {
    action: 'tabUpdated' | 'tabActivated';
    status: string | undefined;
    url: string | undefined;
    tabId: number | undefined;
};

export type CmExtractContent = { action: 'extractContent' };
export type CmPageLoaded = {
    action: 'pageLoaded';
    title: string;
    url: string;
    content: string;
};

export type ChromeMessage = CmOpenSidebar | CmGetReadability | CmToggleOverview | CmTabChanged | CmExtractContent | CmPageLoaded;
