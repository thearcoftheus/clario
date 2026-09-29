import { describe, expect, it } from 'vitest';
import { decideScriptPrep, effectiveScriptStatus, type ScriptItem, type ScriptSlot } from './watchScript';

const A = 'https://x.org/a';
const B = 'https://x.org/b';

function item(overrides: Partial<ScriptItem> = {}): ScriptItem {
    return { url: A, simplifiedContent: 'summary of a', isFetching: false, isStreaming: false, ...overrides };
}

function slot(overrides: Partial<ScriptSlot> = {}): ScriptSlot {
    return { url: A, summary: 'summary of a', status: 'ready', ...overrides };
}

describe('decideScriptPrep', () => {
    it('does nothing with no article on screen', () => {
        expect(decideScriptPrep(slot(), null)).toBe('none');
    });

    it('waits for the summary to finish', () => {
        expect(decideScriptPrep(slot({ url: null, status: 'idle' }), item({ isFetching: true }))).toBe('none');
        expect(decideScriptPrep(slot({ url: null, status: 'idle' }), item({ isStreaming: true }))).toBe('none');
        expect(decideScriptPrep(slot({ url: null, status: 'idle' }), item({ simplifiedContent: '' }))).toBe('none');
    });

    it('prepares for a fresh article', () => {
        expect(decideScriptPrep({ url: null, summary: null, status: 'idle' }, item())).toBe('prepare');
    });

    it('prepares when the slot belongs to another article', () => {
        expect(decideScriptPrep(slot({ url: B, summary: 'summary of b' }), item())).toBe('prepare');
    });

    it('prepares again when the same article was regenerated', () => {
        expect(decideScriptPrep(slot(), item({ simplifiedContent: 'summary of a, easier' }))).toBe('prepare');
    });

    it('leaves a script that is preparing, ready or failed for this exact summary alone', () => {
        expect(decideScriptPrep(slot({ status: 'preparing' }), item())).toBe('none');
        expect(decideScriptPrep(slot({ status: 'ready' }), item())).toBe('none');
        expect(decideScriptPrep(slot({ status: 'error' }), item())).toBe('none');
    });
});

describe('effectiveScriptStatus', () => {
    it('reads idle for a blank tab and for any other article', () => {
        expect(effectiveScriptStatus(slot(), null)).toBe('idle');
        expect(effectiveScriptStatus(slot(), B)).toBe('idle');
        expect(effectiveScriptStatus({ url: null, summary: null, status: 'idle' }, null)).toBe('idle');
    });

    it('passes the status through for the article the slot is for', () => {
        expect(effectiveScriptStatus(slot({ status: 'preparing' }), A)).toBe('preparing');
        expect(effectiveScriptStatus(slot({ status: 'ready' }), A)).toBe('ready');
        expect(effectiveScriptStatus(slot({ status: 'error' }), A)).toBe('error');
    });
});
