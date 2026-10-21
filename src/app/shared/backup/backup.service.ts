import { DOCUMENT, inject, Service } from '@angular/core';
import { DeletionStore } from '../state/deletion-store.service';
import { HistoryStore } from '../state/history-store.service';
import { SettingsStore } from '../state/settings-store.service';
import { TimerStore } from '../state/timer-store.service';
import {
    BackupProblem,
    backupFileName,
    makeBackup,
    MAX_BACKUP_BYTES,
    readBackup,
} from './backup-file';

/** What an import changed, counted by kind. */
export interface ImportCounts {
    timersAdded: number;
    timersUpdated: number;
    workoutsAdded: number;
    workoutsUpdated: number;
    /** Timers and workouts removed because they'd been deleted where the backup came from. */
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
    private readonly timers = inject(TimerStore);
    private readonly history = inject(HistoryStore);
    private readonly deletions = inject(DeletionStore);
    private readonly settings = inject(SettingsStore);
    private readonly document = inject(DOCUMENT);

    /** Downloads a backup of everything, and returns the file's name. */
    export(): string {
        const exportedAt = Date.now();
        const backup = makeBackup(
            {
                timers: this.timers.timers(),
                history: this.history.entries(),
                deleted: [...this.deletions.all()],
                settings: {
                    theme: this.settings.theme(),
                    sound: this.settings.sound(),
                    vibration: this.settings.vibration(),
                    keepScreenOn: this.settings.keepScreenOn(),
                    weightUnit: this.settings.weightUnit(),
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
     * Merges a backup file in: the most recent change to each timer and workout wins, and
     * what was deleted where the backup came from is deleted here, unless it's changed here
     * since. Settings in the file are left out, since they're a choice for each device.
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
        const timers = backup.fromVersion1
            ? { added: this.timers.importTimers(backup.timers), updated: 0, removed: 0 }
            : this.timers.mergeTimers(backup.timers, backup.deleted);
        const workouts = this.history.mergeEntries(backup.history, backup.deleted);
        return {
            ok: true,
            timersAdded: timers.added,
            timersUpdated: timers.updated,
            workoutsAdded: workouts.added,
            workoutsUpdated: workouts.updated,
            removed: timers.removed + workouts.removed,
            skipped: backup.skipped,
        };
    }
}
