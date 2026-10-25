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
    /**
     * How much it bounces: 1 (the default) settles without going past the end from rest;
     * below 1 it overshoots and swings back, more the lower it goes. Apple uses 0.8 for
     * something thrown, such as a sheet let go mid-flick.
     */
    dampingRatio?: number;
    /** The easing for browsers without `linear()` easings, over the same time. */
    fallback?: string;
}

/** A spring's path from 0 to 1, for driving motion frame by frame. */
export interface SpringCurve {
    /** How far along it is (0 to 1, past 1 while it overshoots) `t` seconds in. */
    progress(t: number): number;
    /** Seconds until it has settled. */
    settledAt: number;
}

/** Where the curve counts as settled: 0.1% from its end, and all but still. */
const SETTLED = 0.001;

/** Points along the curve: plenty for a smooth line, few enough to keep the easing short. */
const SAMPLES = 40;

/**
 * A spring from 0 to 1, as Apple describes one: `response` is how quickly it gets there, in
 * seconds (Apple uses 0.4 to reposition something), and `dampingRatio` how much it bounces.
 * It has no fixed length; `settledAt` is when it has come to rest.
 */
export function springCurve(
    response = 0.4,
    { velocity = 0, dampingRatio = 1 }: Pick<SpringOptions, 'velocity' | 'dampingRatio'> = {}
): SpringCurve {
    // Mass 1, stiffness (2π / response)² and damping 2ζω, starting at 0 and moving at
    // `velocity`, so p(0) = 0 and p'(0) = velocity
    const omega = (2 * Math.PI) / response;
    const zeta = Math.min(1, Math.max(0.05, dampingRatio));
    let progress: (t: number) => number;
    if (zeta >= 1) {
        // Critically damped: p(t) = 1 - (1 + (ω - v)t)e^(-ωt)
        const a = omega - velocity;
        progress = (t) => 1 - (1 + a * t) * Math.exp(-omega * t);
    } else {
        // Under-damped: it swings either side of the end, less each time
        const damped = omega * Math.sqrt(1 - zeta * zeta);
        const b = (zeta * omega - velocity) / damped;
        progress = (t) =>
            1 - Math.exp(-zeta * omega * t) * (Math.cos(damped * t) + b * Math.sin(damped * t));
    }
    const speed = (t: number) => (progress(t + 0.0005) - progress(t)) / 0.0005;

    // Step out until it's close to the end and all but still (with a start fast enough to
    // carry it past, it's close to the end on the way through too)
    let settledAt = 0;
    while (
        Math.abs(1 - progress(settledAt)) > SETTLED ||
        Math.abs(speed(settledAt)) > SETTLED * omega
    ) {
        settledAt += 0.001;
    }
    return { progress, settledAt };
}

/**
 * A spring as a CSS `linear()` easing, for motion that should settle like something real
 * rather than follow a fixed curve. See `springCurve` for `response` and the options.
 */
export function spring(
    response = 0.4,
    { fallback = 'cubic-bezier(0.22, 1, 0.36, 1)', ...options }: SpringOptions = {}
): SpringTiming {
    const { progress, settledAt } = springCurve(response, options);
    const points = Array.from({ length: SAMPLES + 1 }, (_, i) =>
        i === SAMPLES ? 1 : Number(progress((settledAt * i) / SAMPLES).toFixed(4))
    );
    const easing = supportsLinearEasing() ? `linear(${points.join(', ')})` : fallback;
    return { easing, duration: Math.round(settledAt * 1000) };
}

/**
 * A critically damped spring, so from rest it never overshoots: Apple's default for moving
 * things about (damping 1).
 */
export function criticallyDampedSpring(
    response = 0.4,
    options: Omit<SpringOptions, 'dampingRatio'> = {}
): SpringTiming {
    return spring(response, { ...options, dampingRatio: 1 });
}

function supportsLinearEasing(): boolean {
    return (
        typeof CSS !== 'undefined' && CSS.supports?.('transition-timing-function', 'linear(0, 1)')
    );
}
