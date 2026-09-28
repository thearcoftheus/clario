import { describe, expect, it } from 'vitest';
import { settingsSignature } from './settingsSignature';

const base = { simplificationLevel: 'Moderate', summaryLength: 'Medium', emoji: false } as const;

describe('settingsSignature', () => {
    it('changes when a content-affecting setting changes', () => {
        const s = settingsSignature(base);
        expect(settingsSignature({ ...base, simplificationLevel: 'Easy' })).not.toBe(s);
        expect(settingsSignature({ ...base, summaryLength: 'Short' })).not.toBe(s);
        expect(settingsSignature({ ...base, emoji: true })).not.toBe(s);
    });

    it('is stable for identical content settings, whatever else is on the object', () => {
        const withExtras = { ...base, textSize: 'Large', playbackSpeed: 1.5, adaptiveDifficulty: true };
        expect(settingsSignature(withExtras)).toBe(settingsSignature(base));
    });
});
