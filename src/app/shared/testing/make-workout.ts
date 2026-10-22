import { Step, Workout } from '../../models/workout';

/** A workout described the simple way: one work time and one rest time. */
export interface SimpleWorkout {
    id: string;
    updatedAt: number;
    title: string;
    workMinutes: number;
    workSeconds: number;
    restMinutes: number;
    restSeconds: number;
    repeats: number;
    /** Use these steps instead of the work and rest times. */
    steps: Step[];
}

/**
 * Builds a workout for tests. Most tests only care about one work and one rest time, so
 * those can be given as before steps existed (`workSeconds: 3, restSeconds: 2`), and
 * become a work step and, if there's any rest, a rest step, the same as saved workouts do.
 * Defaults: "Intervals" (id workout-1), 30s work, 10s rest, 3 rounds.
 */
export function makeWorkout(overrides: Partial<SimpleWorkout> = {}): Workout {
    const simple: SimpleWorkout = {
        id: 'workout-1',
        updatedAt: 1,
        title: 'Intervals',
        workMinutes: 0,
        workSeconds: 30,
        restMinutes: 0,
        restSeconds: 10,
        repeats: 3,
        steps: [],
        ...overrides,
    };
    const work = simple.workMinutes * 60 + simple.workSeconds;
    const rest = simple.restMinutes * 60 + simple.restSeconds;
    const steps: Step[] = overrides.steps ?? [
        { kind: 'work', seconds: work, name: '' },
        ...(rest > 0 ? [{ kind: 'rest' as const, seconds: rest, name: '' }] : []),
    ];
    return {
        id: simple.id,
        title: simple.title,
        steps,
        repeats: simple.repeats,
        updatedAt: simple.updatedAt,
    };
}

/** A step for tests: `work(30)`, `rest(10, 'Breathe')`. */
export const work = (seconds: number, name = ''): Step => ({ kind: 'work', seconds, name });
export const rest = (seconds: number, name = ''): Step => ({ kind: 'rest', seconds, name });
export const reps = (count: number, name = ''): Step => ({ kind: 'reps', reps: count, name });

/** Steps without their exercise links, for tests that check what the steps are. */
export const unlinked = (steps: readonly Step[]): Step[] =>
    steps.map(({ exerciseId: _id, ...step }) => step as Step);

/** A workout without its steps' exercise links. */
export const unlinkedWorkout = (workout: Workout | null): Workout | null =>
    workout && { ...workout, steps: unlinked(workout.steps) };
