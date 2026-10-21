import { DOCUMENT, inject, Service } from '@angular/core';
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

export type ImportResult =
    | { ok: true; timersAdded: number; workoutsAdded: number; skipped: number }
    | { ok: false; problem: BackupProblem | 'too-big' };

/** Saves everything to a file, and adds a saved file's timers and workouts back in. */
@Service()
export class BackupService {
    private readonly timers = inject(TimerStore);
    private readonly history = inject(HistoryStore);
    private readonly settings = inject(SettingsStore);
    private readonly document = inject(DOCUMENT);

    /** Downloads a backup of everything, and returns the file's name. */
    export(): string {
        const exportedAt = Date.now();
        const backup = makeBackup(
            {
                timers: this.timers.timers(),
                history: this.history.entries(),
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
     * Adds what's new in a backup file: nothing already here is changed or removed. Settings
     * in the file are left out, since they're a choice for each device.
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
        return {
            ok: true,
            timersAdded: this.timers.importTimers(backup.timers),
            workoutsAdded: this.history.importEntries(backup.history),
            skipped: backup.skipped,
        };
    }
}
