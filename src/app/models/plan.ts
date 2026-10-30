import { HistoryEntry } from './history';

/** The days of the week, Monday first: a plan's days, and the order This week shows them in. */
export const WEEKDAYS = [
    'Monday',
    'Tuesday',
    'Wednesday',
    'Thursday',
    'Friday',
    'Saturday',
    'Sunday',
] as const;

/** At most this many workouts on one day, which is more than anyone does. */
export const MAX_WORKOUTS_A_DAY = 10;

/**
 * The weekly plan (PLN-1): which workouts are done on which days, the same every week. Synced
 * as one record of its own, like the library's order, so planning on one device and editing a
 * workout on another don't overwrite each other.
 */
export interface WeekPlan {
    /** For each day, Monday first, the ids of the workouts planned on it, in order. */
    days: string[][];
    /** When it last changed, in ms since the epoch, or 0 if it never has. */
    updatedAt: number;
}

export const EMPTY_PLAN: WeekPlan = { days: WEEKDAYS.map(() => []), updatedAt: 0 };

/** Whether a saved value is a usable plan: seven days of workout ids, and when it changed. */
export function isWeekPlan(value: unknown): value is WeekPlan {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const plan = value as Record<string, unknown>;
    return (
        Array.isArray(plan['days']) &&
        plan['days'].length === WEEKDAYS.length &&
        plan['days'].every(
            (day) =>
                Array.isArray(day) &&
                day.length <= MAX_WORKOUTS_A_DAY &&
                day.every((id) => typeof id === 'string' && id !== '')
        ) &&
        Number.isSafeInteger(plan['updatedAt']) &&
        (plan['updatedAt'] as number) >= 0
    );
}

/** A copy of a plan, so a saved or fetched one shares nothing with what's kept. */
export function copyPlan(plan: WeekPlan): WeekPlan {
    return { days: plan.days.map((day) => [...day]), updatedAt: plan.updatedAt };
}

/** Which day of the week `time` is on the device's calendar, from 0 for Monday. */
export function weekdayOf(time: number): number {
    return (new Date(time).getDay() + 6) % 7;
}

/** The start of `time`'s day on the device's calendar, in ms since the epoch. */
export function startOfDay(time: number): number {
    const date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** The start of the Monday of `time`'s week, on the device's calendar. */
export function startOfWeek(time: number): number {
    const date = new Date(startOfDay(time));
    date.setDate(date.getDate() - weekdayOf(time));
    return date.getTime();
}

/**
 * Where a planned workout is this week (PLN-3): done (it was run that day, finished or
 * stopped), missed (its day has gone by without it), due today, or still to come.
 */
export type PlannedStatus = 'done' | 'missed' | 'today' | 'to come';

export interface PlannedWorkout {
    workoutId: string;
    status: PlannedStatus;
}

/**
 * This week's plan, day by day from Monday, with where each workout planned is (see
 * `PlannedStatus`). Workouts no longer in the library are left out (`exists`).
 */
export function thisWeek(
    plan: WeekPlan,
    entries: readonly Pick<HistoryEntry, 'workoutId' | 'startedAt'>[],
    now: number,
    exists: (workoutId: string) => boolean
): PlannedWorkout[][] {
    const today = weekdayOf(now);
    const monday = startOfWeek(now);
    // Which workouts were run on which day this week
    const ran = new Set<string>();
    for (const entry of entries) {
        if (entry.startedAt >= monday && entry.startedAt <= now) {
            ran.add(`${weekdayOf(entry.startedAt)}/${entry.workoutId}`);
        }
    }
    return plan.days.map((ids, day) =>
        ids.filter(exists).map((workoutId) => ({
            workoutId,
            status: ran.has(`${day}/${workoutId}`)
                ? 'done'
                : day < today
                  ? 'missed'
                  : day === today
                    ? 'today'
                    : 'to come',
        }))
    );
}

/** The workouts planned for today and not yet run today (PLN-2), in the plan's order. */
export function dueToday(
    plan: WeekPlan,
    entries: readonly Pick<HistoryEntry, 'workoutId' | 'startedAt'>[],
    now: number,
    exists: (workoutId: string) => boolean
): string[] {
    return thisWeek(plan, entries, now, exists)
        [weekdayOf(now)].filter((planned) => planned.status === 'today')
        .map((planned) => planned.workoutId);
}
