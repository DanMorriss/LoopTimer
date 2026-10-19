import { HistoryEntry } from '../models/history';

/** e.g. 75 → "1:15", 3725 → "1:02:05" */
export function formatDuration(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = String(seconds % 60).padStart(2, '0');
    return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
}

/** e.g. "3 rounds", "2 of 5 rounds · stopped", "12 rounds · until stopped" */
export function describeRounds(entry: HistoryEntry): string {
    const rounds = (n: number) => `${n} ${n === 1 ? 'round' : 'rounds'}`;
    if (entry.totalRounds === 0) {
        return `${rounds(entry.roundsCompleted)} · until stopped`;
    }
    if (entry.outcome === 'stopped') {
        return `${entry.roundsCompleted} of ${rounds(entry.totalRounds)} · stopped`;
    }
    return rounds(entry.roundsCompleted);
}

/** The timer's title as it ran, or "Untitled timer". */
export function entryName(entry: HistoryEntry): string {
    return entry.title.trim() || 'Untitled timer';
}
