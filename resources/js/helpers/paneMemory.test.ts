import { describe, expect, it } from 'vitest';
import { forgetView, rememberView, viewForTab } from './paneMemory';

describe('viewForTab', () => {
    it('defaults to home for a tab never seen and for no tab at all', () => {
        expect(viewForTab(new Map(), 1)).toBe('home');
        expect(viewForTab(new Map([[1, 'narrate']]), 2)).toBe('home');
        expect(viewForTab(new Map([[1, 'narrate']]), null)).toBe('home');
    });

    it('returns the remembered pane', () => {
        const views = rememberView(new Map(), 1, 'narrate');
        expect(viewForTab(views, 1)).toBe('narrate');
    });
});

describe('rememberView', () => {
    it('does not mutate the map it is given', () => {
        const original = new Map();
        rememberView(original, 1, 'summary');
        expect(original.size).toBe(0);
    });

    it('never remembers chat, which is a modal over the current pane', () => {
        const views = rememberView(new Map([[1, 'summary' as const]]), 1, 'chat');
        expect(viewForTab(views, 1)).toBe('summary');
        expect(viewForTab(rememberView(new Map(), 2, 'chat'), 2)).toBe('home');
    });

    it('ignores a null tab', () => {
        expect(rememberView(new Map(), null, 'avatar').size).toBe(0);
    });

    it('overwrites the previous pane for the same tab and leaves other tabs alone', () => {
        let views = rememberView(new Map(), 1, 'summary');
        views = rememberView(views, 2, 'avatar');
        views = rememberView(views, 1, 'narrate');
        expect(viewForTab(views, 1)).toBe('narrate');
        expect(viewForTab(views, 2)).toBe('avatar');
    });
});

describe('forgetView', () => {
    it('returns the tab to home and leaves other tabs alone', () => {
        let views = rememberView(new Map(), 1, 'narrate');
        views = rememberView(views, 2, 'avatar');
        views = forgetView(views, 1);
        expect(viewForTab(views, 1)).toBe('home');
        expect(viewForTab(views, 2)).toBe('avatar');
    });

    it('is a no-op for an unknown tab', () => {
        const views = rememberView(new Map(), 1, 'narrate');
        expect(forgetView(views, 9)).toEqual(views);
    });
});
