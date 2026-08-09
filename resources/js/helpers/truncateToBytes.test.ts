import { describe, expect, it } from 'vitest';
import { truncateToBytes } from './truncateToBytes';

const byteLength = (text: string) => new TextEncoder().encode(text).length;

describe('truncateToBytes', () => {
    it('leaves text under the cap untouched', () => {
        const result = truncateToBytes('hello', 100);

        expect(result.text).toBe('hello');
        expect(result.truncated).toBe(false);
    });

    it('leaves text exactly at the cap untouched', () => {
        const result = truncateToBytes('abcde', 5);

        expect(result.text).toBe('abcde');
        expect(result.truncated).toBe(false);
    });

    it('handles empty text', () => {
        expect(truncateToBytes('', 10)).toEqual({ text: '', truncated: false });
    });

    it('cuts ASCII text to the byte cap and flags it', () => {
        const result = truncateToBytes('abcdefghij', 4);

        expect(result.text).toBe('abcd');
        expect(result.truncated).toBe(true);
    });

    it('measures in bytes, not characters', () => {
        // 'é' is two bytes, so five of them exceed a 5-byte cap even though
        // there are only five characters.
        const result = truncateToBytes('ééééé', 5);

        expect(result.truncated).toBe(true);
        expect(byteLength(result.text)).toBeLessThanOrEqual(5);
    });

    it('drops a two-byte character rather than splitting it', () => {
        // Cap lands in the middle of the second 'é'.
        const result = truncateToBytes('éé', 3);

        expect(result.text).toBe('é');
        expect(result.truncated).toBe(true);
        expect(byteLength(result.text)).toBe(2);
    });

    it('drops a four-byte emoji rather than splitting it', () => {
        // '👍' is four bytes; a 2-byte cap can hold none of it.
        const result = truncateToBytes('👍👍', 6);

        expect(result.text).toBe('👍');
        expect(result.truncated).toBe(true);
    });

    it('never leaves a replacement character at the end', () => {
        for (let cap = 1; cap <= 12; cap++) {
            const result = truncateToBytes('aé👍bc', cap);

            expect(result.text.endsWith('�')).toBe(false);
            expect(byteLength(result.text)).toBeLessThanOrEqual(cap);
        }
    });

    it('preserves a replacement character that was already in the text', () => {
        // A genuine U+FFFD in the source must survive when no cut happens —
        // the trailing-FFFD strip is only meant to clean up our own cut.
        const result = truncateToBytes('ok�', 100);

        expect(result.text).toBe('ok�');
        expect(result.truncated).toBe(false);
    });
});
