import { criticallyDampedSpring, spring, springCurve } from './spring';

describe('spring', () => {
    const points = (easing: string) =>
        easing
            .replace(/^linear\(|\)$/g, '')
            .split(', ')
            .map(Number);

    it('bounces past the end and back with a damping ratio under 1', () => {
        const curve = points(spring(0.3, { dampingRatio: 0.8 }).easing);

        expect(Math.max(...curve)).toBeGreaterThan(1);
        expect(curve.at(-1)).toBe(1);
    });

    it('bounces more the lower the damping ratio', () => {
        const peak = (dampingRatio: number) =>
            Math.max(...points(spring(0.3, { dampingRatio }).easing));

        expect(peak(0.5)).toBeGreaterThan(peak(0.8));
    });

    it('is critically damped by default', () => {
        expect(spring(0.4)).toEqual(criticallyDampedSpring(0.4));
    });
});

describe('springCurve', () => {
    it('runs from 0 and comes to rest at 1', () => {
        const { progress, settledAt } = springCurve(0.4);

        expect(progress(0)).toBe(0);
        expect(progress(settledAt)).toBeCloseTo(1, 2);
    });

    it("sets off at the speed it's handed", () => {
        const { progress } = springCurve(0.4, { velocity: 5 });

        expect(progress(0.001) / 0.001).toBeCloseTo(5, 0);
    });
});

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

    describe("handed a gesture's speed", () => {
        it('sets off faster than from rest, so the drag and the spring join without a seam', () => {
            const fromRest = points(criticallyDampedSpring(0.3).easing);
            const moving = points(criticallyDampedSpring(0.3, { velocity: 8 }).easing);

            expect(moving[1]).toBeGreaterThan(fromRest[1]);
        });

        it('can carry past the end when thrown hard, then settles on it', () => {
            const curve = points(criticallyDampedSpring(0.3, { velocity: 40 }).easing);

            expect(Math.max(...curve)).toBeGreaterThan(1);
            expect(curve.at(-1)).toBe(1);
        });
    });

    it('falls back to a curve where linear() easings are missing', () => {
        vi.spyOn(CSS, 'supports').mockReturnValue(false);

        expect(criticallyDampedSpring(0.4, { fallback: 'ease-out' }).easing).toBe('ease-out');
    });
});
