/** One workout in the history: a timer run that finished, or was stopped part-way. */
export interface HistoryEntry {
    /** Unique per run: the run's start time and the timer's id. */
    id: string;
    timerId: number;
    /** The timer's title when it ran (it may be renamed or deleted later). */
    title: string;
    /** When the run began, in ms since the epoch. */
    startedAt: number;
    /** When it finished or was stopped, in ms since the epoch. */
    endedAt: number;
    /** Time spent running, in whole seconds; pauses don't count. */
    activeSeconds: number;
    /** Full rounds done. */
    roundsCompleted: number;
    /** Rounds the timer was set to, or 0 for one that runs until stopped. */
    totalRounds: number;
    outcome: 'finished' | 'stopped';
    /** A short line of the user's own, e.g. "felt strong". Missing when there isn't one. */
    note?: string;
}

/** Long enough for a line about how it went, short enough to sit under the entry. */
export const MAX_NOTE_LENGTH = 120;

export function historyId(startedAt: number, timerId: number): string {
    return `${startedAt}-${timerId}`;
}
