import { computed, Service, signal } from '@angular/core';
import { HistoryEntry, isLoggedSet, MAX_NOTE_LENGTH } from '../../models/history';

const STORAGE_KEY = 'history';
const DELETED_KEY = 'history-deleted';

/** Plenty of workouts to look back on, without letting browser storage grow forever. */
export const MAX_HISTORY = 500;

/**
 * Deleted ids remembered, so a run still going can't log itself back in. Only the latest
 * run's matters, so a few is plenty.
 */
const MAX_DELETED = 20;

/** Completed and stopped workouts, newest first, saved in the browser. */
@Service()
export class HistoryStore {
    private readonly _entries = signal<HistoryEntry[]>(loadHistory());
    /** Newest last. */
    private deletedIds = loadDeletedIds();

    /** Newest first. */
    readonly entries = computed(() => this._entries());

    /**
     * Adds a workout, or updates it if this run is already in the history. A run is logged
     * as stopped when its page closes, so if it's picked up again and later stopped or
     * finished, that replaces the earlier entry, keeping any note added to it meanwhile.
     * The oldest entries go past MAX_HISTORY. A deleted entry isn't recorded again (its run
     * may still be going when it's deleted); restore() puts one back.
     */
    record(entry: HistoryEntry) {
        if (this.deletedIds.includes(entry.id)) {
            return;
        }
        this._entries.update((entries) => {
            const note = entry.note ?? entries.find((existing) => existing.id === entry.id)?.note;
            const updated = note === undefined ? entry : { ...entry, note };
            return [updated, ...entries.filter((existing) => existing.id !== entry.id)]
                .sort((a, b) => b.startedAt - a.startedAt)
                .slice(0, MAX_HISTORY);
        });
        this.save();
    }

    /**
     * Sets a workout's note, trimmed and cut to MAX_NOTE_LENGTH. An empty note removes it.
     */
    setNote(id: string, note: string) {
        const trimmed = note.trim().slice(0, MAX_NOTE_LENGTH);
        this._entries.update((entries) =>
            entries.map((entry) => {
                if (entry.id !== id) {
                    return entry;
                }
                const { note: _old, ...rest } = entry;
                return trimmed ? { ...rest, note: trimmed } : rest;
            })
        );
        this.save();
    }

    delete(id: string) {
        this._entries.update((entries) => entries.filter((entry) => entry.id !== id));
        this.setDeletedIds([...this.deletedIds.filter((d) => d !== id), id].slice(-MAX_DELETED));
        this.save();
    }

    /**
     * Adds workouts from a backup. One already here (the same run) is left as it is, and a
     * deleted one comes back, since importing is asked for. Returns how many were added; the
     * oldest still go past MAX_HISTORY.
     */
    importEntries(imported: readonly HistoryEntry[]): number {
        const existing = new Set(this._entries().map((entry) => entry.id));
        const added = imported.filter((entry, i) => {
            const firstOfItsRun = imported.findIndex((other) => other.id === entry.id) === i;
            return firstOfItsRun && !existing.has(entry.id);
        });
        if (added.length === 0) {
            return 0;
        }
        const addedIds = new Set(added.map((entry) => entry.id));
        this.setDeletedIds(this.deletedIds.filter((id) => !addedIds.has(id)));
        this._entries.update((entries) =>
            [...entries, ...added].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_HISTORY)
        );
        this.save();
        return added.length;
    }

    /** Puts a deleted entry back, e.g. on Undo. */
    restore(entry: HistoryEntry) {
        this.setDeletedIds(this.deletedIds.filter((id) => id !== entry.id));
        this.record(entry);
    }

    private setDeletedIds(ids: string[]) {
        this.deletedIds = ids;
        localStorage.setItem(DELETED_KEY, JSON.stringify(ids));
    }

    private save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries()));
    }
}

// Corrupted or unexpected data shouldn't stop the app from starting, so drop anything
// that isn't a usable entry
function loadHistory(): HistoryEntry[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed
                  .map((item) => readHistoryEntry(item))
                  .filter((entry) => entry !== null)
                  .sort((a, b) => b.startedAt - a.startedAt)
            : [];
    } catch {
        return [];
    }
}

function loadDeletedIds(): string[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(DELETED_KEY) ?? '[]');
        return Array.isArray(parsed)
            ? parsed.filter((id): id is string => typeof id === 'string')
            : [];
    } catch {
        return [];
    }
}

/**
 * Reads one saved workout, from this device or a backup, or returns null if it isn't usable.
 * A broken set is dropped, keeping the rest of the workout.
 */
export function readHistoryEntry(value: unknown): HistoryEntry | null {
    return isHistoryEntry(value) ? withUsableSets(value) : null;
}

// A broken set is dropped rather than the whole workout; with none left, so are the sets
function withUsableSets(entry: HistoryEntry): HistoryEntry {
    const { sets, ...rest } = entry;
    const usable = Array.isArray(sets) ? sets.filter(isLoggedSet) : [];
    return usable.length > 0 ? { ...rest, sets: usable } : rest;
}

function isWholeNumber(value: unknown, min = 0): value is number {
    return Number.isInteger(value) && (value as number) >= min;
}

function isHistoryEntry(value: unknown): value is HistoryEntry {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const entry = value as Record<string, unknown>;
    return (
        typeof entry['id'] === 'string' &&
        isWholeNumber(entry['timerId'], 1) &&
        typeof entry['title'] === 'string' &&
        isWholeNumber(entry['startedAt'], 1) &&
        isWholeNumber(entry['endedAt'], 1) &&
        (entry['endedAt'] as number) >= (entry['startedAt'] as number) &&
        isWholeNumber(entry['activeSeconds']) &&
        isWholeNumber(entry['roundsCompleted']) &&
        isWholeNumber(entry['totalRounds']) &&
        (entry['outcome'] === 'finished' || entry['outcome'] === 'stopped') &&
        (entry['note'] === undefined || typeof entry['note'] === 'string')
    );
}
