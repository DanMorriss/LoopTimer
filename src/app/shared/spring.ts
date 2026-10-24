/** An easing and a duration to animate with, e.g. for `Element.animate()`. */
export interface SpringTiming {
    easing: string;
    /** ms until it has settled to within 0.1% of where it's going. */
    duration: number;
}

/** Where the curve counts as settled: 0.1% from its end. */
const SETTLED = 0.001;

/** Points along the curve: plenty for a smooth line, few enough to keep the easing short. */
const SAMPLES = 40;

/**
 * A spring as a CSS `linear()` easing, for motion that should settle like something real
 * rather than follow a fixed curve. Critically damped, so it never overshoots: Apple's
 * default for moving things about (damping 1). `response` is how quickly it gets there, in
 * seconds (Apple uses 0.4 to reposition something); it has no fixed length, so the duration
 * is when it has settled.
 *
 * Browsers without `linear()` easings get `fallback` over the same time.
 */
export function criticallyDampedSpring(
    response = 0.4,
    fallback = 'cubic-bezier(0.22, 1, 0.36, 1)'
): SpringTiming {
    // A spring with mass 1 and stiffness (2π / response)², critically damped
    const omega = (2 * Math.PI) / response;
    const progress = (t: number) => 1 - (1 + omega * t) * Math.exp(-omega * t);

    // Step out until it's within SETTLED of the end
    let settledAt = 0;
    while (1 - progress(settledAt) > SETTLED) {
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
