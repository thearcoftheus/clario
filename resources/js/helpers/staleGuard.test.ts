import { describe, expect, it } from 'vitest';
import { createStaleGuard } from './staleGuard';

describe('createStaleGuard', () => {
    it('keeps only the latest token per tab current', () => {
        const g = createStaleGuard();
        const t1 = g.next(1);
        expect(g.isCurrent(1, t1)).toBe(true);
        const t2 = g.next(1);
        expect(g.isCurrent(1, t1)).toBe(false);
        expect(g.isCurrent(1, t2)).toBe(true);
    });

    it('tracks tabs independently', () => {
        const g = createStaleGuard();
        const a = g.next(1);
        const b = g.next(2);
        g.next(2);
        expect(g.isCurrent(1, a)).toBe(true);
        expect(g.isCurrent(2, b)).toBe(false);
    });

    it('invalidate makes in-flight tokens stale without issuing a new one', () => {
        const g = createStaleGuard();
        const t = g.next(1);
        g.invalidate(1);
        expect(g.isCurrent(1, t)).toBe(false);
    });

    it('forget resets the tab', () => {
        const g = createStaleGuard();
        const t = g.next(1);
        g.forget(1);
        expect(g.isCurrent(1, t)).toBe(false);
        expect(g.next(1)).toBe(1);
    });

    it('never treats an unissued token as current', () => {
        const g = createStaleGuard();
        expect(g.isCurrent(5, 0)).toBe(false);
    });
});
