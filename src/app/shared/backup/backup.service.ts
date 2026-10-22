import { DOCUMENT, inject, Service } from '@angular/core';
import { linkSets, linkSteps } from '../../models/exercise-links';
import { HistoryEntry } from '../../models/history';
import { Workout } from '../../models/workout';
import { DeletionStore } from '../state/deletion-store.service';
import { ExerciseStore } from '../state/exercise-store.service';
import { HistoryStore } from '../state/history-store.service';
import { SettingsStore } from '../state/settings-store.service';
import { WorkoutStore } from '../state/workout-store.service';
import {
    BackupProblem,
    backupFileName,
    makeBackup,
    MAX_BACKUP_BYTES,
    readBackup,
} from './backup-file';

/** What an import changed, counted by kind. */
export interface ImportCounts {
    workoutsAdded: number;
    workoutsUpdated: number;
    /** History entries: workouts done. */
    entriesAdded: number;
    entriesUpdated: number;
    /** Your own exercises. */
    exercisesAdded: number;
    exercisesUpdated: number;
    /** Workouts, history entries and exercises removed because they'd been deleted where the backup came from. */
    removed: number;
    /** Items in the file that couldn't be read. */
    skipped: number;
}

export type ImportResult =
    | ({ ok: true } & ImportCounts)
    | { ok: false; problem: BackupProblem | 'too-big' };

/** Saves everything to a file, and merges a saved file back in. */
@Service()
export class BackupService {
    private readonly workouts = inject(WorkoutStore);
    private readonly history = inject(HistoryStore);
    private readonly exercises = inject(ExerciseStore);
    private readonly deletions = inject(DeletionStore);
    private readonly settings = inject(SettingsStore);
    private readonly document = inject(DOCUMENT);

    /** Downloads a backup of everything, and returns the file's name. */
    export(): string {
        const exportedAt = Date.now();
        const backup = makeBackup(
            {
                workouts: this.workouts.workouts(),
                history: this.history.entries(),
                exercises: this.exercises.own(),
                exerciseNotes: this.exercises.notes(),
                hiddenExercises: this.exercises.hidden(),
                deleted: [...this.deletions.all()],
                settings: {
                    theme: this.settings.theme(),
                    sound: this.settings.sound(),
                    vibration: this.settings.vibration(),
                    keepScreenOn: this.settings.keepScreenOn(),
                    weightUnit: this.settings.weightUnit(),
                    bodyFigure: this.settings.bodyFigure(),
                    myEquipment: this.settings.myEquipment(),
                    onlyMyEquipment: this.settings.onlyMyEquipment(),
                },
            },
            exportedAt
        );
        const name = backupFileName(exportedAt);
        const url = URL.createObjectURL(
            new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
        );
        const link = this.document.createElement('a');
        link.href = url;
        link.download = name;
        link.click();
        // Leave the download a moment to start before letting the file go
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return name;
    }

    /**
     * Merges a backup file in: the most recent change to each workout, history entry, exercise of your
     * own, note and hidden exercise wins, and what was deleted where the backup came from is deleted here,
     * unless it's changed here since. Exercises come first, so the workouts and history entries can be
     * linked to them: steps and sets that aren't linked yet (from a file before version 3, or
     * to an exercise that isn't here) are linked by name, as saved data is. Settings in the
     * file are left out, since they're a choice for each device.
     */
    async import(file: Blob): Promise<ImportResult> {
        if (file.size > MAX_BACKUP_BYTES) {
            return { ok: false, problem: 'too-big' };
        }
        let text: string;
        try {
            text = await file.text();
        } catch {
            return { ok: false, problem: 'unreadable' };
        }
        const backup = readBackup(text);
        if (!backup.ok) {
            return backup;
        }
        const exercises = this.exercises.mergeOwn(backup.exercises, backup.deleted);
        this.exercises.mergeNotes(backup.exerciseNotes, backup.deleted);
        this.exercises.mergeHidden(backup.hiddenExercises, backup.deleted);
        const linkedWorkouts = backup.workouts.map((workout) => this.linked(workout));
        const linkedHistory = backup.history.map((entry) => this.linkedSets(entry));
        const workouts = backup.fromVersion1
            ? { added: this.workouts.importWorkouts(linkedWorkouts), updated: 0, removed: 0 }
            : this.workouts.mergeWorkouts(linkedWorkouts, backup.deleted);
        const entries = this.history.mergeEntries(linkedHistory, backup.deleted);
        return {
            ok: true,
            workoutsAdded: workouts.added,
            workoutsUpdated: workouts.updated,
            entriesAdded: entries.added,
            entriesUpdated: entries.updated,
            exercisesAdded: exercises.added,
            exercisesUpdated: exercises.updated,
            removed: workouts.removed + entries.removed + exercises.removed,
            skipped: backup.skipped,
        };
    }

    /** A workout with each step linked to an exercise that's here, linking by name if not. */
    private linked(workout: Workout): Workout {
        return { ...workout, steps: linkSteps(workout.steps, this.exercises.finder) };
    }

    private linkedSets(entry: HistoryEntry): HistoryEntry {
        return entry.sets ? { ...entry, sets: linkSets(entry.sets, this.exercises.finder) } : entry;
    }
}
