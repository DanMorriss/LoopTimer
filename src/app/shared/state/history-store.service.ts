import { computed, Service, signal } from '@angular/core';
import { HistoryEntry } from '../../models/history';

const STORAGE_KEY = 'history';

/** Plenty of workouts to look back on, without letting browser storage grow forever. */
export const MAX_HISTORY = 500;

/** Completed and stopped workouts, newest first, saved in the browser. */
@Service()
export class HistoryStore {
    private readonly _entries = signal<HistoryEntry[]>(loadHistory());

    /** Newest first. */
    readonly entries = computed(() => this._entries());

    /**
     * Adds a workout. A run is only ever recorded once, so recording it again (e.g. after a
     * refresh on the "finished" screen) does nothing. The oldest entries go past MAX_HISTORY.
     */
    record(entry: HistoryEntry) {
        if (this._entries().some((existing) => existing.id === entry.id)) {
            return;
        }
        this._entries.update((entries) =>
            [entry, ...entries].sort((a, b) => b.startedAt - a.startedAt).slice(0, MAX_HISTORY)
        );
        this.save();
    }

    delete(id: string) {
        this._entries.update((entries) => entries.filter((entry) => entry.id !== id));
        this.save();
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
            ? parsed.filter(isHistoryEntry).sort((a, b) => b.startedAt - a.startedAt)
            : [];
    } catch {
        return [];
    }
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
        (entry['outcome'] === 'finished' || entry['outcome'] === 'stopped')
    );
}
