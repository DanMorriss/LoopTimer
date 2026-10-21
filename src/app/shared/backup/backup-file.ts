import { ExerciseNote, OwnExercise } from '../../models/exercise';
import { HistoryEntry } from '../../models/history';
import { Deletion, isDeletion } from '../../models/sync';
import { Timer } from '../../models/timer';
import { readExerciseNote, readOwnExercise } from '../state/exercise-store.service';
import { readHistoryEntry } from '../state/history-store.service';
import { upgradeHistoryEntry, upgradeTimer } from '../state/migrate';
import { Settings } from '../state/settings-store.service';
import { readTimer } from '../state/timer-store.service';

/**
 * Goes up when the file's shape changes; older files are converted when they're read.
 * 2: random timer ids, `updatedAt` on timers and workouts, and `deleted`.
 * 3: your own exercises and notes on exercises, and steps and sets linked to exercises.
 */
export const BACKUP_VERSION = 3;

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
    /** Your own exercises (the built-in ones come with the app). */
    exercises: OwnExercise[];
    exerciseNotes: ExerciseNote[];
    /** Records deleted on the device it came from, so importing deletes them here too. */
    deleted: Deletion[];
    settings: Settings;
}

export type BackupProblem = 'unreadable' | 'not-a-backup' | 'too-new';

export type ReadBackup =
    | {
          ok: true;
          timers: Timer[];
          history: HistoryEntry[];
          /** None before version 3. */
          exercises: OwnExercise[];
          exerciseNotes: ExerciseNote[];
          deleted: Deletion[];
          /**
           * From version 1, whose timer ids were only unique on their device: its timers have
           * been given new ids, so they're matched on what they are rather than by id.
           */
          fromVersion1: boolean;
          /** Timers, workouts and exercises in the file that weren't usable, and were left out. */
          skipped: number;
      }
    | { ok: false; problem: BackupProblem };

export function makeBackup(
    contents: Pick<
        BackupFile,
        'timers' | 'history' | 'exercises' | 'exerciseNotes' | 'deleted' | 'settings'
    >,
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
 * timer formats convert, and a version 1 file is brought up to version 2 as saved data is.
 */
export function readBackup(text: string, now = Date.now()): ReadBackup {
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
    const fromVersion1 = version === 1;
    const newIds: Record<string, string> = {};
    const savedTimers: unknown[] = fromVersion1
        ? file['timers'].map((timer) => upgradeTimer(timer, newIds, now))
        : file['timers'];
    const savedHistory: unknown[] = fromVersion1
        ? file['history'].map((entry) => upgradeHistoryEntry(entry, newIds))
        : file['history'];

    const timers = savedTimers.map((item) => readTimer(item)).filter((t) => t !== null);
    const history = savedHistory
        .map((item) => readHistoryEntry(item))
        .filter((entry) => entry !== null);
    const deleted = Array.isArray(file['deleted']) ? file['deleted'].filter(isDeletion) : [];
    const savedExercises: unknown[] = Array.isArray(file['exercises']) ? file['exercises'] : [];
    const exercises = savedExercises
        .map((item) => readOwnExercise(item))
        .filter((exercise) => exercise !== null);
    const exerciseNotes = (Array.isArray(file['exerciseNotes']) ? file['exerciseNotes'] : [])
        .map((item) => readExerciseNote(item))
        .filter((note) => note !== null);
    const skipped =
        savedTimers.length -
        timers.length +
        (savedHistory.length - history.length) +
        (savedExercises.length - exercises.length);
    return {
        ok: true,
        timers,
        history,
        exercises,
        exerciseNotes,
        deleted,
        fromVersion1,
        skipped,
    };
}
