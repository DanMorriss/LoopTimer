import { Synced } from './sync';

export type TimedKind = 'work' | 'rest';
export type StepKind = TimedKind | 'reps';

/** A step that counts down, e.g. 30 seconds of squats, or a 10 second rest. */
export interface TimedStep {
    kind: TimedKind;
    /** Length in whole seconds, at least 1 (setup leaves out steps set to 0:00). */
    seconds: number;
    /** Optional, e.g. "Squats". Empty when not named. */
    name: string;
    /**
     * The exercise a named work step is, linked by its name when the workout is saved (see
     * `linkSteps()`). Missing for a rest or an unnamed step, which isn't tracked.
     */
    exerciseId?: string;
}

/**
 * A number of reps rather than a time, e.g. 20 push-ups. There's no countdown: the workout
 * waits on it until Done is pressed.
 */
export interface RepStep {
    kind: 'reps';
    /** At least 1 (setup leaves out steps set to 0). */
    reps: number;
    /** Optional, e.g. "Push-ups". Empty when not named. */
    name: string;
    /**
     * The weight lifted, in kg whatever unit it's shown in (see `models/weight.ts`), up to
     * MAX_WEIGHT_KG. Missing for none, e.g. bodyweight moves.
     */
    weight?: number;
    /** The exercise it is, as for a timed step. Missing for an unnamed step. */
    exerciseId?: string;
}

/** One step of a round. */
export type Step = TimedStep | RepStep;

/**
 * A saved workout: `steps` run in order to make one round, and the round repeats `repeats`
 * times (or until stopped). Rest steps at the end of the last round are skipped, since
 * the workout is over by then.
 */
export interface Workout extends Synced {
    title: string;
    steps: Step[];
    repeats: number;
}

/** What's set up to make a workout: everything but what the store keeps (its id and dates). */
export type WorkoutFields = Omit<Workout, 'id' | 'updatedAt'>;

/** The `repeats` value for a workout that keeps going until it's stopped. */
export const UNTIL_STOPPED = 0;

/** The longest a step can be: 99:59, the most the setup wheels go up to. */
export const MAX_STEP_SECONDS = 99 * 60 + 59;

/** The most reps a step can have, the most the setup wheel goes up to. */
export const MAX_REPS = 100;

/** A step's countdown in seconds: 0 for a rep step, which has none. */
export function stepSeconds(step: Step): number {
    return step.kind === 'reps' ? 0 : step.seconds;
}

/** How many rep steps there are in one round. */
export function repStepsPerRound(workout: Pick<Workout, 'steps'>): number {
    return workout.steps.filter((step) => step.kind === 'reps').length;
}

export function runsUntilStopped(workout: Pick<Workout, 'repeats'>): boolean {
    return workout.repeats === UNTIL_STOPPED;
}

/** Seconds of countdown in one full round (rep steps take as long as they take, so add nothing). */
export function roundSeconds(workout: Pick<Workout, 'steps'>): number {
    return workout.steps.reduce((total, step) => total + stepSeconds(step), 0);
}

/** Seconds of rest at the end of a round, which the last round skips. */
export function trailingRestSeconds(workout: Pick<Workout, 'steps'>): number {
    let total = 0;
    for (let i = workout.steps.length - 1; i >= 0; i--) {
        const step = workout.steps[i];
        if (step.kind !== 'rest') {
            break;
        }
        total += step.seconds;
    }
    return total;
}

/**
 * Seconds of countdown in the whole workout, or Infinity for one that runs until stopped.
 * Time spent on rep steps comes on top.
 */
export function workoutSeconds(workout: Workout): number {
    if (runsUntilStopped(workout)) {
        return Infinity;
    }
    return workout.repeats * roundSeconds(workout) - trailingRestSeconds(workout);
}

/** A workout needs some work in it, timed or reps, or there'd be nothing to do. */
export function hasWork(steps: readonly Step[]): boolean {
    return steps.some(
        (step) =>
            (step.kind === 'work' && step.seconds > 0) || (step.kind === 'reps' && step.reps > 0)
    );
}
