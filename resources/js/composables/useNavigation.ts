import { inject, InjectionKey } from 'vue';

export type View = 'home' | 'summary' | 'chat' | 'narrate' | 'avatar';

export interface NavigationContext {
    setActiveView: (view: View) => void;
    openSettings: () => void;
}

export const NavigationKey: InjectionKey<NavigationContext> = Symbol('navigation');

export function useNavigation(): NavigationContext {
    const ctx = inject(NavigationKey);
    if (!ctx) throw new Error('useNavigation must be used within a component that provides NavigationKey');
    return ctx;
}
