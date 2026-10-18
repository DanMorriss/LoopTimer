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
}

export function historyId(startedAt: number, timerId: number): string {
    return `${startedAt}-${timerId}`;
}
