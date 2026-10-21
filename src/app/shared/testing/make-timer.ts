import { Step, Timer } from '../../models/timer';

/** A timer described the simple way: one work time and one rest time. */
export interface SimpleTimer {
    id: string;
    updatedAt: number;
    title: string;
    timerMinutes: number;
    timerSeconds: number;
    restMinutes: number;
    restSeconds: number;
    repeats: number;
    /** Use these steps instead of the work and rest times. */
    steps: Step[];
}

/**
 * Builds a timer for tests. Most tests only care about one work and one rest time, so
 * those can be given as before steps existed (`timerSeconds: 3, restSeconds: 2`), and
 * become a work step and, if there's any rest, a rest step, the same as saved timers do.
 * Defaults: "Intervals" (id timer-1), 30s work, 10s rest, 3 rounds.
 */
export function makeTimer(overrides: Partial<SimpleTimer> = {}): Timer {
    const simple: SimpleTimer = {
        id: 'timer-1',
        updatedAt: 1,
        title: 'Intervals',
        timerMinutes: 0,
        timerSeconds: 30,
        restMinutes: 0,
        restSeconds: 10,
        repeats: 3,
        steps: [],
        ...overrides,
    };
    const work = simple.timerMinutes * 60 + simple.timerSeconds;
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

/** A timer without its steps' exercise links. */
export const unlinkedTimer = (timer: Timer | null): Timer | null =>
    timer && { ...timer, steps: unlinked(timer.steps) };
