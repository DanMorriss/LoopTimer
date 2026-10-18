import { roundSeconds, runsUntilStopped, Step, Timer, workoutSeconds } from '../models/timer';

export type TimerPhase = 'work' | 'rest' | 'complete';

export interface TimerState {
    phase: TimerPhase;
    /** The step in progress (null once complete). */
    step: Step | null;
    /** Which step of the round is in progress, starting at 0 (0 once complete). */
    stepIndex: number;
    /** Whole seconds left in the current step (0 once complete). */
    remainingSeconds: number;
    /** Length of the current step in seconds (0 once complete). */
    phaseSeconds: number;
    /** Rounds left, counting the one in progress (0 once complete, Infinity until stopped). */
    roundsLeft: number;
    /** Which round is in progress, starting at 0 (equal to repeats once complete). */
    round: number;
    /** Exact time spent in the current step so far, in ms (0 once complete). */
    phaseElapsedMs: number;
}

/**
 * Works out where a timer is from how long it has been running.
 *
 * Each round runs the timer's steps in order, and rounds repeat `repeats` times. Rest at
 * the end of the last round is skipped, and a timer that runs until stopped never
 * completes.
 *
 * Deriving this from elapsed time, rather than counting interval ticks, keeps it correct
 * when the browser slows timers down in a background tab or on a locked phone.
 */
export function timerStateAt(timer: Timer, elapsedMs: number): TimerState {
    const elapsedMsClamped = Math.max(0, elapsedMs);
    const elapsed = Math.floor(elapsedMsClamped / 1000);

    if (elapsed >= workoutSeconds(timer)) {
        return {
            phase: 'complete',
            step: null,
            stepIndex: 0,
            remainingSeconds: 0,
            phaseSeconds: 0,
            roundsLeft: 0,
            round: timer.repeats,
            phaseElapsedMs: 0,
        };
    }

    const roundLength = roundSeconds(timer);
    const round = Math.floor(elapsed / roundLength);
    const intoRound = elapsed % roundLength;

    // Find the step that this second of the round falls in
    let stepStart = 0;
    let stepIndex = 0;
    while (intoRound >= stepStart + timer.steps[stepIndex].seconds) {
        stepStart += timer.steps[stepIndex].seconds;
        stepIndex++;
    }
    const step = timer.steps[stepIndex];
    const stepStartMs = (round * roundLength + stepStart) * 1000;

    return {
        phase: step.kind,
        step,
        stepIndex,
        remainingSeconds: stepStart + step.seconds - intoRound,
        phaseSeconds: step.seconds,
        roundsLeft: runsUntilStopped(timer) ? Infinity : timer.repeats - round,
        round,
        phaseElapsedMs: elapsedMsClamped - stepStartMs,
    };
}
