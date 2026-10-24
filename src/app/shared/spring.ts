/** An easing and a duration to animate with, e.g. for `Element.animate()`. */
export interface SpringTiming {
    easing: string;
    /** ms until it has settled to within 0.1% of where it's going. */
    duration: number;
}

export interface SpringOptions {
    /**
     * How fast it's already moving as it starts, as a fraction of the distance to go per
     * second: e.g. a finger moving 500px/s with 250px left is 2. Hands a gesture's speed on to
     * the spring, so there's no seam where the drag lets go. A fast enough start carries it a
     * little past the end before it settles.
     */
    velocity?: number;
    /** The easing for browsers without `linear()` easings, over the same time. */
    fallback?: string;
}

/** Where the curve counts as settled: 0.1% from its end, and all but still. */
const SETTLED = 0.001;

/** Points along the curve: plenty for a smooth line, few enough to keep the easing short. */
const SAMPLES = 40;

/**
 * A spring as a CSS `linear()` easing, for motion that should settle like something real
 * rather than follow a fixed curve. Critically damped, so from rest it never overshoots:
 * Apple's default for moving things about (damping 1). `response` is how quickly it gets
 * there, in seconds (Apple uses 0.4 to reposition something); it has no fixed length, so the
 * duration is when it has settled.
 */
export function criticallyDampedSpring(
    response = 0.4,
    { velocity = 0, fallback = 'cubic-bezier(0.22, 1, 0.36, 1)' }: SpringOptions = {}
): SpringTiming {
    // A spring with mass 1 and stiffness (2π / response)², critically damped, starting at 0
    // and moving at `velocity`: p(t) = 1 - (1 + (ω - v)t)e^(-ωt), so p'(0) = v
    const omega = (2 * Math.PI) / response;
    const a = omega - velocity;
    const progress = (t: number) => 1 - (1 + a * t) * Math.exp(-omega * t);
    const speed = (t: number) => (velocity + omega * a * t) * Math.exp(-omega * t);

    // Step out until it's close to the end and all but still (with a start fast enough to
    // carry it past, it's close to the end on the way through too)
    let settledAt = 0;
    while (
        Math.abs(1 - progress(settledAt)) > SETTLED ||
        Math.abs(speed(settledAt)) > SETTLED * omega
    ) {
        settledAt += 0.001;
    }

    const points = Array.from({ length: SAMPLES + 1 }, (_, i) =>
        i === SAMPLES ? 1 : Number(progress((settledAt * i) / SAMPLES).toFixed(4))
    );
    const easing = supportsLinearEasing() ? `linear(${points.join(', ')})` : fallback;
    return { easing, duration: Math.round(settledAt * 1000) };
}

function supportsLinearEasing(): boolean {
    return (
        typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)')
    );
}
