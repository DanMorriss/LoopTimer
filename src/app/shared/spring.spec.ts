import { criticallyDampedSpring } from './spring';

describe('criticallyDampedSpring', () => {
    const points = (easing: string) =>
        easing
            .replace(/^linear\(|\)$/g, '')
            .split(', ')
            .map(Number);

    it('settles in about 0.6s for a 0.4s response, as Apple moves things about', () => {
        const { duration } = criticallyDampedSpring(0.4);

        expect(duration).toBeGreaterThan(550);
        expect(duration).toBeLessThan(650);
    });

    it('settles sooner for a snappier response', () => {
        expect(criticallyDampedSpring(0.3).duration).toBeLessThan(
            criticallyDampedSpring(0.4).duration
        );
    });

    it('runs from 0 to 1 without ever going past it (no bounce)', () => {
        const curve = points(criticallyDampedSpring().easing);

        expect(curve[0]).toBe(0);
        expect(curve.at(-1)).toBe(1);
        curve.forEach((point, i) => {
            expect(point).toBeLessThanOrEqual(1);
            if (i > 0) {
                expect(point).toBeGreaterThanOrEqual(curve[i - 1]);
            }
        });
    });

    it('covers most of the way early, like a spring let go', () => {
        const curve = points(criticallyDampedSpring().easing);

        // A third of the way through its time, it's most of the way there
        expect(curve[Math.round(curve.length / 3)]).toBeGreaterThan(0.75);
    });

    it('falls back to a curve where linear() easings are missing', () => {
        vi.spyOn(CSS, 'supports').mockReturnValue(false);

        expect(criticallyDampedSpring(0.4, 'ease-out').easing).toBe('ease-out');
    });
});
