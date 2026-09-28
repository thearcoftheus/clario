export type CmOpenSidebar = {
    action: 'openSidebar';
};
export type CmGetReadability = {
    action: 'getReadability';
    content: string;
};

export type CmToggleOverview = {
    action: 'toggleOverview';
    content: string;
};

export type CmExtractContent = {
    action: 'extractContent';
};

export type CmPageLoaded = {
    action: 'pageLoaded';
    title: string;
    url: string;
    content: string;
    image?: string;
    description?: string;
};

export type CmSidebarState = {
    action: 'sidebarState';
    isOpen: boolean;
};

export type CmGetSidebarState = {
    action: 'getSidebarState';
};

export type CmOverviewResponse = {
    action: 'overviewResponse';
    content: string;
};

export type CmOverviewError = {
    action: 'overviewError';
    errorMessage: string;
    error: any;
};

export type ChromeMessage =
    | CmOpenSidebar
    | CmGetReadability
    | CmToggleOverview
    | CmExtractContent
    | CmPageLoaded
    | CmSidebarState
    | CmGetSidebarState
    | CmOverviewResponse
    | CmOverviewError;
