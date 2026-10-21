import { computed, inject, Service, signal } from '@angular/core';
import { HistoryEntry, isLoggedSet, MAX_NOTE_LENGTH } from '../../models/history';
import { Deletion, mergeRecords } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { migrateSavedData } from './migrate';

const STORAGE_KEY = 'history';

/** Plenty of workouts to look back on, without letting browser storage grow forever. */
export const MAX_HISTORY = 500;

/** Completed and stopped workouts, newest first, saved in the browser. */
@Service()
export class HistoryStore {
    private readonly deletions = inject(DeletionStore);
    private readonly _entries = signal<HistoryEntry[]>(loadHistory());

    /** Newest first. */
    readonly entries = computed(() => this._entries());

    /**
     * Adds a workout, or updates it if this run is already in the history. A run is logged
     * as stopped when its page closes, so if it's picked up again and later stopped or
     * finished, that replaces the earlier entry, keeping any note added to it meanwhile.
     * The oldest entries go past MAX_HISTORY. A deleted entry isn't recorded again (its run
     * may still be going when it's deleted); restore() puts one back.
     */
    record(entry: Omit<HistoryEntry, 'updatedAt'>) {
        if (this.deletions.deletedAt('history', entry.id) !== undefined) {
            return;
        }
        this._entries.update((entries) => {
            const note = entry.note ?? entries.find((existing) => existing.id === entry.id)?.note;
            const updated: HistoryEntry = {
                ...entry,
                ...(note === undefined ? {} : { note }),
                updatedAt: Date.now(),
            };
            return sortAndCap([updated, ...entries.filter((existing) => existing.id !== entry.id)]);
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
                const changed = { ...rest, updatedAt: Date.now() };
                return trimmed ? { ...changed, note: trimmed } : changed;
            })
        );
        this.save();
    }

    delete(id: string) {
        this._entries.update((entries) => entries.filter((entry) => entry.id !== id));
        this.deletions.add({ kind: 'history', id, deletedAt: Date.now() });
        this.save();
    }

    /**
     * Merges workouts from another copy (a backup), by run id: the most recent change to each
     * wins, e.g. a note added there. A deletion there removes a workout here that hasn't
     * changed since, and one deleted here doesn't come back unless it changed there after.
     * The oldest still go past MAX_HISTORY.
     */
    mergeEntries(entries: readonly HistoryEntry[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'history',
            this._entries(),
            entries,
            (id) => this.deletions.deletedAt('history', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._entries.set(sortAndCap(result.records));
            this.save();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    /** Puts a deleted entry back, e.g. on Undo. */
    restore(entry: HistoryEntry) {
        this.deletions.remove('history', entry.id);
        this.record(entry);
    }

    private save() {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this._entries()));
    }
}

function sortAndCap(entries: HistoryEntry[]): HistoryEntry[] {
    return [...entries].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_HISTORY);
}

// Corrupted or unexpected data shouldn't stop the app from starting, so drop anything
// that isn't a usable entry
function loadHistory(): HistoryEntry[] {
    migrateSavedData();
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

/**
 * Reads one saved workout, from this device or a backup, or returns null if it isn't usable.
 * A broken set is dropped, keeping the rest of the workout. One with no `updatedAt` is dated
 * by when it ended.
 */
export function readHistoryEntry(value: unknown): HistoryEntry | null {
    if (!isHistoryEntry(value)) {
        return null;
    }
    const entry = withUsableSets(value);
    return isWholeNumber(entry.updatedAt) ? entry : { ...entry, updatedAt: entry.endedAt };
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
        typeof entry['timerId'] === 'string' &&
        entry['timerId'] !== '' &&
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
