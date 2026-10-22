import {
    repStepsPerRound,
    roundSeconds,
    runsUntilStopped,
    Step,
    stepSeconds,
    Workout,
    workoutSeconds,
} from '../models/workout';

export type WorkoutPhase = 'work' | 'rest' | 'reps' | 'complete';

export interface WorkoutState {
    phase: WorkoutPhase;
    /** The step in progress (null once complete). */
    step: Step | null;
    /** Which step of the round is in progress, starting at 0 (0 once complete). */
    stepIndex: number;
    /** Whole seconds left in the current step (0 for reps, and once complete). */
    remainingSeconds: number;
    /** Length of the current step in seconds (0 for reps, and once complete). */
    phaseSeconds: number;
    /** Rounds left, counting the one in progress (0 once complete, Infinity until stopped). */
    roundsLeft: number;
    /** Which round is in progress, starting at 0 (equal to repeats once complete). */
    round: number;
    /** Exact time spent in the current step so far, in ms (0 once complete). */
    phaseElapsedMs: number;
}

/**
 * Works out where a workout is from how long it has been running, and how many rep steps
 * have been done.
 *
 * Each round runs the workout's steps in order, and rounds repeat `repeats` times. Rest at
 * the end of the last round is skipped, and a workout that runs until stopped never
 * completes.
 *
 * A rep step takes no time on this clock: the workout stops at the first one not yet done
 * and stays there however long it runs, until Done adds it to `repStepsDone` and moves the
 * start time on (see `WorkoutStore.finishRepStep()`), so the clock picks up where it stopped.
 *
 * Deriving this from elapsed time, rather than counting interval ticks, keeps it correct
 * when the browser slows timers down in a background tab or on a locked phone.
 */
export function workoutStateAt(
    workout: Workout,
    elapsedMs: number,
    repStepsDone = 0
): WorkoutState {
    const elapsedMsClamped = Math.max(0, elapsedMs);
    const elapsed = Math.floor(elapsedMsClamped / 1000);
    const roundLength = roundSeconds(workout);

    // Waiting on a rep step, once the clock has reached it
    const repStep = nextRepStep(workout, repStepsDone);
    if (repStep && elapsedMsClamped >= repStep.atMs) {
        return {
            phase: 'reps',
            step: workout.steps[repStep.stepIndex],
            stepIndex: repStep.stepIndex,
            remainingSeconds: 0,
            phaseSeconds: 0,
            roundsLeft: runsUntilStopped(workout) ? Infinity : workout.repeats - repStep.round,
            round: repStep.round,
            phaseElapsedMs: elapsedMsClamped - repStep.atMs,
        };
    }

    if (elapsed >= workoutSeconds(workout)) {
        return {
            phase: 'complete',
            step: null,
            stepIndex: 0,
            remainingSeconds: 0,
            phaseSeconds: 0,
            roundsLeft: 0,
            round: workout.repeats,
            phaseElapsedMs: 0,
        };
    }

    // Short of the next rep step (if any), so every rep step passed is done and takes no
    // time. A round of only rep steps never gets here: the next one is always waiting.
    const round = Math.floor(elapsed / roundLength);
    const intoRound = elapsed % roundLength;

    // Find the step that this second of the round falls in
    let stepStart = 0;
    let stepIndex = 0;
    while (intoRound >= stepStart + stepSeconds(workout.steps[stepIndex])) {
        stepStart += stepSeconds(workout.steps[stepIndex]);
        stepIndex++;
    }
    const step = workout.steps[stepIndex];
    const length = stepSeconds(step);
    const stepStartMs = (round * roundLength + stepStart) * 1000;

    return {
        phase: step.kind,
        step,
        stepIndex,
        remainingSeconds: stepStart + length - intoRound,
        phaseSeconds: length,
        roundsLeft: runsUntilStopped(workout) ? Infinity : workout.repeats - round,
        round,
        phaseElapsedMs: elapsedMsClamped - stepStartMs,
    };
}

/**
 * The first rep step not yet done: its round, its place in the round, and where it falls
 * on the clock (ms of countdown before it). Null if there are none left.
 */
export function nextRepStep(
    workout: Workout,
    repStepsDone: number
): { round: number; stepIndex: number; atMs: number } | null {
    const perRound = repStepsPerRound(workout);
    if (perRound === 0) {
        return null;
    }
    const round = Math.floor(repStepsDone / perRound);
    if (!runsUntilStopped(workout) && round >= workout.repeats) {
        return null;
    }
    // Which rep step of the round it is, then which step of the round that is
    let repsToSkip = repStepsDone % perRound;
    let atSeconds = round * roundSeconds(workout);
    for (const [stepIndex, step] of workout.steps.entries()) {
        if (step.kind === 'reps') {
            if (repsToSkip === 0) {
                return { round, stepIndex, atMs: atSeconds * 1000 };
            }
            repsToSkip--;
        }
        atSeconds += stepSeconds(step);
    }
    return null;
}
