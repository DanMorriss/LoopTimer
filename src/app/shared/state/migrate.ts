import { Deletion, newId } from '../../models/sync';

/** Which shape the saved data is in. Missing means 1, from before this was saved. */
const VERSION_KEY = 'data-version';
export const DATA_VERSION = 2;

/** Each old timer id and the new one it was given, so a run in progress can still find it. */
export const LEGACY_TIMER_IDS_KEY = 'legacy-timer-ids';

/**
 * Brings data saved by an older version of the app up to date, once, before anything reads
 * it. Version 2 (see docs/features/data.md):
 *
 * - timers get random string ids in place of 1, 2, 3…, and an `updatedAt`
 * - history entries point to the new ids, and get an `updatedAt` (when they ended)
 * - `history-deleted` becomes deletion markers in `deleted`
 *
 * Anything unreadable is left as it is: the stores drop what they can't use.
 */
export function migrateSavedData(now = Date.now()) {
    if (Number(localStorage.getItem(VERSION_KEY) ?? 1) >= DATA_VERSION) {
        return;
    }
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
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
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
