import { computed, Service, signal } from '@angular/core';
import { HistoryEntry, MAX_NOTE_LENGTH } from '../../models/history';

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
     * Adds a workout, or updates it if this run is already in the history. A run is logged
     * as stopped when its page closes, so if it's picked up again and later stopped or
     * finished, that replaces the earlier entry, keeping any note added to it meanwhile.
     * The oldest entries go past MAX_HISTORY.
     */
    record(entry: HistoryEntry) {
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
        (entry['outcome'] === 'finished' || entry['outcome'] === 'stopped') &&
        (entry['note'] === undefined || typeof entry['note'] === 'string')
    );
}
