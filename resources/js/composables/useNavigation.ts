import type { PaneVisitTrigger } from '@/stores/feedbackStore';
import { inject, InjectionKey } from 'vue';

export const Views = ['home', 'summary', 'chat', 'narrate', 'avatar'] as const;
export type View = (typeof Views)[number];

export interface NavigationContext {
    // trigger feeds pane_visit telemetry (see feedbackStore); defaults to
    // 'nav' in Sidebar.vue's implementation when omitted.
    setActiveView: (view: View, trigger?: PaneVisitTrigger) => void;
    openSettings: () => void;
}

export const NavigationKey: InjectionKey<NavigationContext> = Symbol('navigation');

export function useNavigation(): NavigationContext {
    const ctx = inject(NavigationKey);
    if (!ctx) throw new Error('useNavigation must be used within a component that provides NavigationKey');
    return ctx;
}
