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
 * Steps that run in order a number of times: an exercise and its sets, with one step, or a
 * superset's rounds, with two or more (see docs/features/sets-and-supersets.md).
 */
export interface StepGroup {
    kind: 'group';
    /** How many times its steps run, 1 to MAX_REPEATS: an exercise's sets, a superset's rounds. */
    rounds: number;
    /** Rest between its rounds, never after the last, in whole seconds; 0 for none. */
    restSeconds: number;
    /** At least one. */
    steps: Step[];
}

/** A label in a workout, e.g. "Warmup". It doesn't loop and takes no time. */
export interface Heading {
    kind: 'heading';
    /** Trimmed, 1 to MAX_HEADING_LENGTH characters. */
    text: string;
}

/** One part of a workout, in order. */
export type Block = StepGroup | Heading;

/**
 * A saved workout: its `blocks` run in order to make one round, and the round repeats
 * `repeats` times (or until stopped). Rest steps at the end of the last round are skipped,
 * since the workout is over by then.
 *
 * With a time limit, rounds repeat as many times as fit in it (`repeats` is UNTIL_STOPPED,
 * so an app from before time limits runs it until stopped), and it's over when time's up,
 * part-way through a step or not.
 */
export interface Workout extends Synced {
    title: string;
    blocks: Block[];
    repeats: number;
    /** The time limit, in whole seconds, rep steps and rests included. Missing for none. */
    timeLimitSeconds?: number;
}

/** What's set up to make a workout: everything but what the store keeps (its id and dates). */
export type WorkoutFields = Omit<Workout, 'id' | 'updatedAt'>;

/** The `repeats` value for a workout that keeps going until it's stopped. */
export const UNTIL_STOPPED = 0;

/** The longest a step can be: 99:59, the most the setup wheels go up to. */
export const MAX_STEP_SECONDS = 99 * 60 + 59;

/** The longest time limit, the most the same wheels go up to. */
export const MAX_TIME_LIMIT_SECONDS = MAX_STEP_SECONDS;

/** The most reps a step can have, the most the setup wheel goes up to. */
export const MAX_REPS = 100;

/** The most rounds the setup wheel goes up to, before ∞. */
export const MAX_REPEATS = 30;

/** Enough for a long circuit, while keeping the setup page manageable. */
export const MAX_STEPS = 20;

/** The longest a heading can be, as for a step's name. */
export const MAX_HEADING_LENGTH = 40;

/** A step's countdown in seconds: 0 for a rep step, which has none. */
export function stepSeconds(step: Step): number {
    return step.kind === 'reps' ? 0 : step.seconds;
}

/** Steps as a workout's blocks: one group, run once a round, as workouts were before groups. */
export function asOneGroup(steps: Step[]): Block[] {
    return [{ kind: 'group', rounds: 1, restSeconds: 0, steps }];
}

/**
 * Every step of a workout, each once however many rounds its group has, in order. A step's
 * place in this list is its number in the history (`LoggedSet.step`).
 */
export function allSteps(workout: Pick<Workout, 'blocks'>): Step[] {
    return workout.blocks.flatMap((block) => (block.kind === 'group' ? block.steps : []));
}

/**
 * The blocks with their steps replaced, in order, by `steps` (one for each of `allSteps()`),
 * e.g. linked to exercises or with one changed.
 */
export function withSteps(blocks: readonly Block[], steps: readonly Step[]): Block[] {
    let next = 0;
    return blocks.map((block) =>
        block.kind === 'group' ? { ...block, steps: block.steps.map(() => steps[next++]) } : block
    );
}

/** Where a step of the run comes from: its number in `allSteps()`, and its group's round. */
export interface StepPlace {
    step: number;
    /** Which round of its group (set of its exercise) it is, from 0. */
    set: number;
}

/**
 * One round of a workout as it runs: each group's steps, round after round, with its rest
 * between them. What the clock, the alarms and the sets are worked out from.
 */
export interface RunPlan {
    steps: Step[];
    /** Where each of `steps` comes from; null for a rest between a group's rounds. */
    places: (StepPlace | null)[];
}

// Workouts don't change once made (a change makes a new one), so each one's plan is made once
const plans = new WeakMap<Pick<Workout, 'blocks'>, RunPlan>();

/** A workout's round as it runs (see `RunPlan`). */
export function runPlan(workout: Pick<Workout, 'blocks'>): RunPlan {
    const saved = plans.get(workout);
    if (saved) {
        return saved;
    }
    const plan: RunPlan = { steps: [], places: [] };
    let first = 0;
    for (const block of workout.blocks) {
        if (block.kind !== 'group') {
            continue;
        }
        for (let set = 0; set < block.rounds; set++) {
            if (set > 0 && block.restSeconds > 0) {
                plan.steps.push({ kind: 'rest', seconds: block.restSeconds, name: '' });
                plan.places.push(null);
            }
            block.steps.forEach((step, i) => {
                plan.steps.push(step);
                plan.places.push({ step: first + i, set });
            });
        }
        first += block.steps.length;
    }
    plans.set(workout, plan);
    return plan;
}

/** How many rep steps there are in one round. */
export function repStepsPerRound(workout: Pick<Workout, 'blocks'>): number {
    return runPlan(workout).steps.filter((step) => step.kind === 'reps').length;
}

/** Rounds go on until it's stopped by hand: no number of rounds, and no time limit. */
export function runsUntilStopped(workout: Pick<Workout, 'repeats' | 'timeLimitSeconds'>): boolean {
    return endlessRounds(workout) && workout.timeLimitSeconds === undefined;
}

/**
 * Rounds don't end by being counted: it runs until stopped, or until its time limit. What
 * the clock goes by, where `runsUntilStopped()` is what the workout is shown as.
 */
export function endlessRounds(workout: Pick<Workout, 'repeats'>): boolean {
    return workout.repeats === UNTIL_STOPPED;
}

/** Seconds of countdown in one full round (rep steps take as long as they take, so add nothing). */
export function roundSeconds(workout: Pick<Workout, 'blocks'>): number {
    return runPlan(workout).steps.reduce((total, step) => total + stepSeconds(step), 0);
}

/** Seconds of rest at the end of a round, which the last round skips. */
export function trailingRestSeconds(workout: Pick<Workout, 'blocks'>): number {
    const { steps } = runPlan(workout);
    let total = 0;
    for (let i = steps.length - 1; i >= 0; i--) {
        const step = steps[i];
        if (step.kind !== 'rest') {
            break;
        }
        total += step.seconds;
    }
    return total;
}

/**
 * Seconds of countdown in the whole workout, or Infinity for one whose rounds don't end by
 * being counted (until stopped, or a time limit). Time spent on rep steps comes on top.
 */
export function workoutSeconds(workout: Workout): number {
    if (endlessRounds(workout)) {
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

/** What a kind of step is called, e.g. on its pill in Create. */
export function stepKindName(kind: StepKind): string {
    return { work: 'Timed', rest: 'Rest', reps: 'Reps' }[kind];
}
