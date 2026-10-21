import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import { Exercise, MeasuredBy, OwnExercise } from '../../models/exercise';
import { ExerciseFinder, findByName, linkSets, linkSteps } from '../../models/exercise-links';
import { isLoggedSet } from '../../models/history';
import { Deletion, newId } from '../../models/sync';
import { Step } from '../../models/timer';

/** Which shape the saved data is in. Missing means 1, from before this was saved. */
const VERSION_KEY = 'data-version';
export const DATA_VERSION = 3;

/** Each old timer id and the new one it was given, so a run in progress can still find it. */
export const LEGACY_TIMER_IDS_KEY = 'legacy-timer-ids';

/**
 * Brings data saved by an older version of the app up to date, once, before anything reads
 * it, a version at a time (see docs/features/data.md). Anything unreadable is left as it is:
 * the stores drop what they can't use.
 */
export function migrateSavedData(now = Date.now()) {
    const version = Number(localStorage.getItem(VERSION_KEY) ?? 1);
    if (version >= DATA_VERSION) {
        return;
    }
    if (version < 2) {
        toVersion2(now);
    }
    if (version < 3) {
        toVersion3(now);
    }
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
}

/**
 * Version 3: exercises (EXR-4). Each named work step in a timer, and each named set in the
 * history, is linked to the exercise its name means, built-in where one matches and
 * otherwise a new one of your own, one per name.
 */
function toVersion3(now: number) {
    const own = (readList('exercises') ?? []).filter(isOwnExercise);
    const finder = listFinder(own, now);
    const timers = readList('timers');
    if (timers) {
        localStorage.setItem(
            'timers',
            JSON.stringify(timers.map((timer) => withLinkedSteps(timer, finder)))
        );
    }
    const history = readList('history');
    if (history) {
        localStorage.setItem(
            'history',
            JSON.stringify(history.map((entry) => withLinkedSets(entry, finder)))
        );
    }
    if (own.length > 0) {
        localStorage.setItem('exercises', JSON.stringify(own));
    }
}

/**
 * Finds exercises among the built-in ones and `own`, and makes new ones of your own into
 * `own`, for linking saved data before the exercise store is there to do it.
 */
export function listFinder(own: OwnExercise[], now: number): ExerciseFinder {
    return {
        find: (name) => findByName(name, [...BUILT_IN_EXERCISES, ...own] as Exercise[]),
        create: (name: string, measuredBy: MeasuredBy) => {
            const exercise: OwnExercise = {
                id: newId(),
                updatedAt: now,
                name: name.trim().replace(/\s+/g, ' '),
                otherNames: [],
                equipment: [],
                measuredBy,
                mainMuscles: [],
                supportingMuscles: [],
                description: '',
                steps: [],
                tips: [],
            };
            own.push(exercise);
            return exercise;
        },
    };
}

// Only enough to find by name; the exercise store reads them properly
function isOwnExercise(value: unknown): value is OwnExercise {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const exercise = value as Record<string, unknown>;
    return (
        typeof exercise['id'] === 'string' &&
        typeof exercise['name'] === 'string' &&
        Array.isArray(exercise['otherNames'])
    );
}

const isNamedStep = (value: unknown): value is Step =>
    typeof value === 'object' &&
    value !== null &&
    typeof (value as Record<string, unknown>)['name'] === 'string' &&
    typeof (value as Record<string, unknown>)['kind'] === 'string';

/** A timer with its steps linked to exercises; a broken step is left for the store to drop. */
export function withLinkedSteps(value: unknown, finder: ExerciseFinder) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const timer = value as Record<string, unknown>;
    const steps = timer['steps'];
    if (!Array.isArray(steps) || !steps.every(isNamedStep)) {
        return value;
    }
    return { ...timer, steps: linkSteps(steps, finder) };
}

/** A history entry with its sets linked to exercises; a broken set is left for the store. */
export function withLinkedSets(value: unknown, finder: ExerciseFinder) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const entry = value as Record<string, unknown>;
    const sets = entry['sets'];
    if (!Array.isArray(sets)) {
        return value;
    }
    const linked = linkSets(sets.filter(isLoggedSet), finder);
    let next = 0;
    return { ...entry, sets: sets.map((set) => (isLoggedSet(set) ? linked[next++] : set)) };
}

/**
 * Version 2: ready for sync.
 *
 * - timers get random string ids in place of 1, 2, 3…, and an `updatedAt`
 * - history entries point to the new ids, and get an `updatedAt` (when they ended)
 * - `history-deleted` becomes deletion markers in `deleted`
 */
function toVersion2(now: number) {
    const newIds: Record<string, string> = {};
    const timers = readList('timers');
    if (timers) {
        const upgraded = timers.map((timer) => upgradeTimer(timer, newIds, now));
        localStorage.setItem('timers', JSON.stringify(upgraded));
        localStorage.setItem(LEGACY_TIMER_IDS_KEY, JSON.stringify(newIds));
    }
    const history = readList('history');
    if (history) {
        localStorage.setItem(
            'history',
            JSON.stringify(history.map((entry) => upgradeHistoryEntry(entry, newIds)))
        );
    }
    const deletedIds = readList('history-deleted');
    if (deletedIds) {
        const deletions: Deletion[] = deletedIds
            .filter((id): id is string => typeof id === 'string' && id !== '')
            .map((id) => ({ kind: 'history', id, deletedAt: now }));
        const existing = readList('deleted') ?? [];
        localStorage.setItem('deleted', JSON.stringify([...existing, ...deletions]));
        localStorage.removeItem('history-deleted');
    }
}

/**
 * A timer from version 1 (saved, or in a backup) in version 2's shape: a number id gets a new
 * random one, noted in `newIds` against the old, and it gets an `updatedAt` if it has none.
 * Anything else about it is left for the store to check.
 */
export function upgradeTimer(value: unknown, newIds: Record<string, string>, now: number) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const timer = value as Record<string, unknown>;
    const upgraded = { ...timer };
    if (typeof timer['id'] === 'number') {
        const id = newIds[String(timer['id'])] ?? newId();
        newIds[String(timer['id'])] = id;
        upgraded['id'] = id;
    }
    if (typeof timer['updatedAt'] !== 'number') {
        upgraded['updatedAt'] = now;
    }
    return upgraded;
}

/**
 * A history entry from version 1 in version 2's shape: its timer's id becomes the timer's new
 * one (or, for a timer since deleted, the old number as text), and it's dated by when it
 * ended. Its own id stays, so the same run still matches across copies.
 */
export function upgradeHistoryEntry(value: unknown, newIds: Readonly<Record<string, string>>) {
    if (typeof value !== 'object' || value === null) {
        return value;
    }
    const entry = value as Record<string, unknown>;
    const upgraded = { ...entry };
    if (typeof entry['timerId'] === 'number') {
        upgraded['timerId'] = newIds[String(entry['timerId'])] ?? String(entry['timerId']);
    }
    if (typeof entry['updatedAt'] !== 'number' && typeof entry['endedAt'] === 'number') {
        upgraded['updatedAt'] = entry['endedAt'];
    }
    return upgraded;
}

function readList(key: string): unknown[] | null {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(key) ?? 'null');
        return Array.isArray(parsed) ? parsed : null;
    } catch {
        return null;
    }
}
