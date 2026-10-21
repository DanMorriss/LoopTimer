import { HistoryEntry } from '../../models/history';
import { Timer } from '../../models/timer';
import { readHistoryEntry } from '../state/history-store.service';
import { Settings } from '../state/settings-store.service';
import { readTimer } from '../state/timer-store.service';

/** Goes up when the file's shape changes; older files are converted when they're read. */
export const BACKUP_VERSION = 1;

/** Far more than years of workouts take, so a bigger file isn't a backup. */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

/** Everything the app saves, as one file (see docs/features/backup-and-sync.md). */
export interface BackupFile {
    app: 'LoopTimer';
    version: number;
    /** When it was made, in ms since the epoch. */
    exportedAt: number;
    timers: Timer[];
    history: HistoryEntry[];
    settings: Settings;
}

export type BackupProblem = 'unreadable' | 'not-a-backup' | 'too-new';

export type ReadBackup =
    | {
          ok: true;
          timers: Timer[];
          history: HistoryEntry[];
          /** Timers and workouts in the file that weren't usable, and were left out. */
          skipped: number;
      }
    | { ok: false; problem: BackupProblem };

export function makeBackup(
    contents: Pick<BackupFile, 'timers' | 'history' | 'settings'>,
    exportedAt: number
): BackupFile {
    return { app: 'LoopTimer', version: BACKUP_VERSION, exportedAt, ...contents };
}

/** e.g. "looptimer-2026-10-21.json", dated by the device's own calendar. */
export function backupFileName(exportedAt: number): string {
    const date = new Date(exportedAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `looptimer-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.json`;
}

/**
 * Reads a backup file's text. Timers and workouts that aren't usable are left out and
 * counted, as when the app loads its own data; the rest are read the same way, so older
 * timer formats convert.
 */
export function readBackup(text: string): ReadBackup {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return { ok: false, problem: 'unreadable' };
    }
    if (typeof parsed !== 'object' || parsed === null) {
        return { ok: false, problem: 'not-a-backup' };
    }
    const file = parsed as Record<string, unknown>;
    const version = file['version'];
    if (
        file['app'] !== 'LoopTimer' ||
        !Number.isInteger(version) ||
        (version as number) < 1 ||
        !Array.isArray(file['timers']) ||
        !Array.isArray(file['history'])
    ) {
        return { ok: false, problem: 'not-a-backup' };
    }
    if ((version as number) > BACKUP_VERSION) {
        return { ok: false, problem: 'too-new' };
    }
    const timers = file['timers'].map((item) => readTimer(item)).filter((t) => t !== null);
    const history = file['history']
        .map((item) => readHistoryEntry(item))
        .filter((entry) => entry !== null);
    const skipped =
        file['timers'].length - timers.length + (file['history'].length - history.length);
    return { ok: true, timers, history, skipped };
}
