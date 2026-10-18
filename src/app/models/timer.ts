export type StepKind = 'work' | 'rest';

/** One step of a round, e.g. 30 seconds of squats, or a 10 second rest. */
export interface Step {
    kind: StepKind;
    /** Length in whole seconds, at least 1 (setup leaves out steps set to 0:00). */
    seconds: number;
    /** Optional, e.g. "Squats". Empty when not named. */
    name: string;
}

/**
 * A saved timer: `steps` run in order to make one round, and the round repeats `repeats`
 * times (or until stopped). Rest steps at the end of the last round are skipped, since
 * the workout is over by then.
 */
export interface Timer {
    id: number;
    title: string;
    steps: Step[];
    repeats: number;
}

/** The `repeats` value for a timer that keeps going until it's stopped. */
export const UNTIL_STOPPED = 0;

/** The longest a step can be: 99:59, the most the setup wheels go up to. */
export const MAX_STEP_SECONDS = 99 * 60 + 59;

export function runsUntilStopped(timer: Pick<Timer, 'repeats'>): boolean {
    return timer.repeats === UNTIL_STOPPED;
}

/** Seconds in one full round. */
export function roundSeconds(timer: Pick<Timer, 'steps'>): number {
    return timer.steps.reduce((total, step) => total + step.seconds, 0);
}

/** Seconds of rest at the end of a round, which the last round skips. */
export function trailingRestSeconds(timer: Pick<Timer, 'steps'>): number {
    let total = 0;
    for (let i = timer.steps.length - 1; i >= 0 && timer.steps[i].kind === 'rest'; i--) {
        total += timer.steps[i].seconds;
    }
    return total;
}

/** Seconds in the whole workout, or Infinity for one that runs until stopped. */
export function workoutSeconds(timer: Timer): number {
    if (runsUntilStopped(timer)) {
        return Infinity;
    }
    return timer.repeats * roundSeconds(timer) - trailingRestSeconds(timer);
}

/** A timer needs some work in it, or there'd be nothing to count down. */
export function hasWork(steps: readonly Step[]): boolean {
    return steps.some((step) => step.kind === 'work' && step.seconds > 0);
}
