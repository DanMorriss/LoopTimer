import { ExerciseNote, OwnExercise } from '../../models/exercise';
import { HistoryEntry } from '../../models/history';
import { Deletion, isDeletion } from '../../models/sync';
import { Workout } from '../../models/workout';
import { readExerciseNote, readOwnExercise } from '../state/exercise-store.service';
import { readHistoryEntry } from '../state/history-store.service';
import {
    renameTimerDeletion,
    renameTimerId,
    upgradeHistoryEntry,
    upgradeWorkout,
} from '../state/migrate';
import { Settings } from '../state/settings-store.service';
import { readWorkout } from '../state/workout-store.service';

/**
 * Goes up when the file's shape changes; older files are converted when they're read.
 * 2: random timer ids, `updatedAt` on timers and history entries, and `deleted`.
 * 3: your own exercises and notes on exercises, and steps and sets linked to exercises.
 * 4: timers are called workouts: `workouts` in place of `timers`, and `workoutId` in place
 *    of `timerId` in the history and of the kind `timer` in `deleted`.
 */
export const BACKUP_VERSION = 4;

/** Far more than years of workouts take, so a bigger file isn't a backup. */
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024;

/** Everything the app saves, as one file (see docs/features/backup-and-sync.md). */
export interface BackupFile {
    app: 'LoopTimer';
    version: number;
    /** When it was made, in ms since the epoch. */
    exportedAt: number;
    workouts: Workout[];
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
          workouts: Workout[];
          history: HistoryEntry[];
          /** None before version 3. */
          exercises: OwnExercise[];
          exerciseNotes: ExerciseNote[];
          deleted: Deletion[];
          /**
           * From version 1, whose workout ids were only unique on their device: its workouts have
           * been given new ids, so they're matched on what they are rather than by id.
           */
          fromVersion1: boolean;
          /** Workouts, history entries and exercises in the file that weren't usable, and were left out. */
          skipped: number;
      }
    | { ok: false; problem: BackupProblem };

export function makeBackup(
    contents: Pick<
        BackupFile,
        'workouts' | 'history' | 'exercises' | 'exerciseNotes' | 'deleted' | 'settings'
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
 * Reads a backup file's text. Workouts and history entries that aren't usable are left out and
 * counted, as when the app loads its own data; the rest are read the same way, so older
 * workout formats convert, and a version 1 file is brought up to version 2 as saved data is.
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
    const version = (parsed as Record<string, unknown>)['version'];
    const file =
        (version as number) < 4 ? withWorkoutNames(parsed) : (parsed as Record<string, unknown>);
    if (
        file['app'] !== 'LoopTimer' ||
        !Number.isInteger(version) ||
        (version as number) < 1 ||
        !Array.isArray(file['workouts']) ||
        !Array.isArray(file['history'])
    ) {
        return { ok: false, problem: 'not-a-backup' };
    }
    if ((version as number) > BACKUP_VERSION) {
        return { ok: false, problem: 'too-new' };
    }
    const fromVersion1 = version === 1;
    const newIds: Record<string, string> = {};
    const savedWorkouts: unknown[] = fromVersion1
        ? file['workouts'].map((workout) => upgradeWorkout(workout, newIds, now))
        : file['workouts'];
    const savedHistory: unknown[] = fromVersion1
        ? file['history'].map((entry) => upgradeHistoryEntry(entry, newIds))
        : file['history'];

    const workouts = savedWorkouts.map((item) => readWorkout(item)).filter((t) => t !== null);
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
        savedWorkouts.length -
        workouts.length +
        (savedHistory.length - history.length) +
        (savedExercises.length - exercises.length);
    return {
        ok: true,
        workouts,
        history,
        exercises,
        exerciseNotes,
        deleted,
        fromVersion1,
        skipped,
    };
}

/** A file from before version 4 with the names it has now: workouts, not timers. */
function withWorkoutNames(parsed: object): Record<string, unknown> {
    const { timers, ...file } = parsed as Record<string, unknown>;
    const renamed = (list: unknown, rename: (value: unknown) => unknown) =>
        Array.isArray(list) ? list.map(rename) : list;
    return {
        ...file,
        workouts: timers,
        history: renamed(file['history'], renameTimerId),
        deleted: renamed(file['deleted'], renameTimerDeletion),
    };
}
