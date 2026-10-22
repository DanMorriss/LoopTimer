import { Synced } from './sync';
import { MAX_WEIGHT_KG } from './weight';

/** One workout in the history: a workout run that finished, or was stopped part-way. */
export interface HistoryEntry extends Synced {
    /** Unique per run: the run's start time and the workout's id. */
    id: string;
    workoutId: string;
    /** The workout's title when it ran (it may be renamed or deleted later). */
    title: string;
    /** When the run began, in ms since the epoch. */
    startedAt: number;
    /** When it finished or was stopped, in ms since the epoch. */
    endedAt: number;
    /** Time spent running, in whole seconds; pauses don't count. */
    activeSeconds: number;
    /** Full rounds done. */
    roundsCompleted: number;
    /** Rounds the workout was set to, or 0 for one that runs until stopped. */
    totalRounds: number;
    outcome: 'finished' | 'stopped';
    /** A short line of the user's own, e.g. "felt strong". Missing when there isn't one. */
    note?: string;
    /** The sets of its rep steps, in the order they were done. Missing when there were none. */
    sets?: LoggedSet[];
}

/** Long enough for a line about how it went, short enough to sit under the entry. */
export const MAX_NOTE_LENGTH = 120;

export function historyId(startedAt: number, workoutId: string): string {
    return `${startedAt}-${workoutId}`;
}

/** One set of a rep step, logged when Done is pressed. */
export interface LoggedSet {
    /** Which round it was in, from 0. */
    round: number;
    /** Which step of the round it was, from 0. */
    step: number;
    /** The step's name as it ran; empty when it has none. */
    name: string;
    reps: number;
    /** In kg, as on the step. Missing for none. */
    weight?: number;
    /** The exercise it was, so its history can be followed. Missing for an unnamed step. */
    exerciseId?: string;
}

/** Whether a saved value is a usable set: whole rounds, steps and reps, and a sane weight. */
export function isLoggedSet(value: unknown): value is LoggedSet {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const set = value as Record<string, unknown>;
    const whole = (n: unknown, min: number) => Number.isInteger(n) && (n as number) >= min;
    const weight = set['weight'];
    return (
        whole(set['round'], 0) &&
        whole(set['step'], 0) &&
        typeof set['name'] === 'string' &&
        whole(set['reps'], 1) &&
        (weight === undefined ||
            (typeof weight === 'number' && weight > 0 && weight <= MAX_WEIGHT_KG)) &&
        (set['exerciseId'] === undefined || typeof set['exerciseId'] === 'string')
    );
}
