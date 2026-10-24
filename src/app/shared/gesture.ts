/**
 * Where a flick would come to rest, from how fast it was going as it let go (px/s): how far
 * on it would glide, slowing as a scrolled list does. Apple's own projection, from the
 * Designing Fluid Interfaces sample code; `decelerationRate` 0.998 is a normal scroll, 0.99
 * a snappier one. Choose where something settles from the projected point, not the release
 * point, so a flick throws it.
 */
export function project(velocity: number, decelerationRate = 0.998): number {
    return ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);
}

/**
 * How far something follows a drag past where it can go, so it resists more the further it's
 * pulled rather than stopping dead: `overshoot` px past the edge of something `dimension` px
 * long moves it this far. The same curve as iOS's rubber-banding.
 */
export function rubberband(overshoot: number, dimension: number, constant = 0.55): number {
    return (overshoot * dimension * constant) / (dimension + constant * Math.abs(overshoot));
}

/**
 * Tracks a drag's last few moves, to say how fast it was going as it let go: the speed over
 * the last 100ms, so a pause before letting go reads as still rather than as the earlier
 * flick.
 */
export class VelocityTracker {
    private samples: { at: number; position: number }[] = [];

    add(position: number, at = performance.now()) {
        this.samples.push({ at, position });
        // Keep only what the last 100ms needs
        while (this.samples.length > 2 && at - this.samples[0].at > 100) {
            this.samples.shift();
        }
    }

    /** px/s, positive in the direction positions grow. */
    velocity(at = performance.now()): number {
        const recent = this.samples.filter((sample) => at - sample.at <= 100);
        if (recent.length < 2) {
            return 0;
        }
        const first = recent[0];
        const last = recent[recent.length - 1];
        const seconds = (last.at - first.at) / 1000;
        return seconds > 0 ? (last.position - first.position) / seconds : 0;
    }
}
