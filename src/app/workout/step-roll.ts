import type { AnimationCallbackEvent } from '@angular/core';
import { criticallyDampedSpring } from '../shared/spring';

/**
 * How a step's text comes and goes on the workout page (workout-motion.scss has the drum it
 * turns on): `up` rolls the new one up into the face as the last rolls away over the top;
 * `sideways` turns the drum right to left, for a new round; `rest` settles in gently from a
 * little way below; `fade` is a short cross-fade, for reduced motion.
 */
export type RollWay = 'up' | 'sideways' | 'rest' | 'fade';

/** On the app's spring, with no bounce, like everything else that moves into place. */
const SPRING = criticallyDampedSpring(0.3);

const ROLLS: Record<
    RollWay,
    { from: Keyframe; to: Keyframe; in: KeyframeAnimationOptions; out: KeyframeAnimationOptions }
> = {
    up: {
        from: { transform: 'rotateX(-75deg)', opacity: 0 },
        to: { transform: 'rotateX(75deg)', opacity: 0 },
        in: SPRING,
        out: SPRING,
    },
    sideways: {
        from: { transform: 'rotateY(75deg)', opacity: 0 },
        to: { transform: 'rotateY(-75deg)', opacity: 0 },
        in: SPRING,
        out: SPRING,
    },
    // Rest settles in slowly, and the last step goes quickly, so the two don't sit over each other
    rest: {
        from: { transform: 'translateY(15%)', opacity: 0 },
        to: { transform: 'translateY(-10%)', opacity: 0 },
        in: { duration: 900, easing: 'ease-out' },
        out: { duration: 300, easing: 'ease-in' },
    },
    fade: {
        from: { opacity: 0 },
        to: { opacity: 0 },
        in: { duration: 200, easing: 'ease-out' },
        out: { duration: 200, easing: 'ease-out' },
    },
};

/** For `(animate.enter)`: rolls the step's text in `way`. */
export function rollIn(event: AnimationCallbackEvent, way: RollWay) {
    const roll = ROLLS[way];
    const animation = event.target.animate([roll.from, { transform: 'none', opacity: 1 }], roll.in);
    whenDone(animation, event.animationComplete);
}

/**
 * For `(animate.leave)`: rolls the step's text away `way`, from wherever it is. Caught still
 * rolling in (the next step came quickly, e.g. from a quick Done), it turns on away from
 * there rather than jumping back to the middle first.
 */
export function rollOut(event: AnimationCallbackEvent, way: RollWay) {
    const roll = ROLLS[way];
    const style = getComputedStyle(event.target);
    const now = { transform: style.transform, opacity: style.opacity };
    event.target.getAnimations().forEach((animation) => animation.cancel());
    const animation = event.target.animate([now, roll.to], { ...roll.out, fill: 'forwards' });
    whenDone(animation, event.animationComplete);
}

/**
 * Calls `done` once `animation` is over, or once its time is up, whichever is first: as
 * Angular does for its own, so a page that isn't being drawn (in a background tab, say) still
 * lets the last step's text go.
 */
function whenDone(animation: Animation, done: () => void) {
    let called = false;
    const finish = () => {
        if (!called) {
            called = true;
            done();
        }
    };
    void animation.finished.catch(() => undefined).finally(finish);
    setTimeout(finish, Number(animation.effect?.getComputedTiming().endTime ?? 0));
}
