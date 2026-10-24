import { project, rubberband, VelocityTracker } from './gesture';

describe('gesture helpers', () => {
    describe('project', () => {
        it('glides a flick on in the direction it was going, further the faster it was', () => {
            expect(project(1000)).toBeCloseTo(499, 0);
            expect(project(-1000)).toBeCloseTo(-499, 0);
            expect(project(2000)).toBeGreaterThan(project(1000));
            expect(project(0)).toBe(0);
        });

        it('glides less with a snappier deceleration', () => {
            expect(project(1000, 0.99)).toBeLessThan(project(1000));
        });
    });

    describe('rubberband', () => {
        it('follows a little drag past the edge almost all the way, a long one less and less', () => {
            const near = rubberband(10, 800) / 10;
            const far = rubberband(400, 800) / 400;

            expect(near).toBeGreaterThan(far);
            expect(rubberband(400, 800)).toBeLessThan(400);
        });

        it('pulls the same way as the drag, either way', () => {
            expect(rubberband(-100, 800)).toBe(-rubberband(100, 800));
        });
    });

    describe('VelocityTracker', () => {
        it('measures the speed over the last moves, in px/s', () => {
            const tracker = new VelocityTracker();
            tracker.add(0, 0);
            tracker.add(10, 20);
            tracker.add(20, 40);

            expect(tracker.velocity(40)).toBe(500);
        });

        it('reads a pause before letting go as still', () => {
            const tracker = new VelocityTracker();
            tracker.add(0, 0);
            tracker.add(50, 50);

            expect(tracker.velocity(300)).toBe(0);
        });
    });
});
