import { Component, inject, input, signal } from '@angular/core';
import { BackupService, ImportResult } from '../../shared/backup/backup.service';
import { planPrompt } from '../../shared/backup/plan-prompt';
import { ClearDeviceComponent } from '../../shared/components/clear-device/clear-device.component';

/**
 * Account → Your data: Export backup and Import backup (SYN-1, SYN-2), Copy AI prompt for
 * bringing in a plan (SYN-6), and Clear this device (SYN-9).
 */
@Component({
    selector: 'app-your-data',
    imports: [ClearDeviceComponent],
    templateUrl: './your-data.component.html',
    styleUrl: './your-data.component.scss',
})
export class YourDataComponent {
    /** Someone is signed in, so clearing the device signs it out too. */
    readonly signedIn = input(false);

    private readonly backup = inject(BackupService);

    /** What the last export or import did, read out as it changes. */
    protected readonly status = signal('');

    protected async exportBackup() {
        this.status.set(`Backup saved as ${await this.backup.export()}.`);
    }

    protected async importBackup(input: HTMLInputElement) {
        const file = input.files?.[0];
        // Cleared so choosing the same file again still counts as a change
        input.value = '';
        if (!file) {
            return;
        }
        this.status.set(importMessage(await this.backup.import(file)));
    }

    /** Copies the prompt for turning a plan into a file to import (see `planPrompt()`). */
    protected async copyPlanPrompt() {
        try {
            await navigator.clipboard.writeText(planPrompt());
            this.status.set('Prompt copied. Paste it into an AI chat, then add your plan.');
        } catch {
            this.status.set("The prompt couldn't be copied. Try again, or another browser.");
        }
    }
}

function count(n: number, thing: string, things = `${thing}s`): string {
    return `${n} ${n === 1 ? thing : things}`;
}

/** "2 workouts, 3 exercises and 14 history entries", leaving out any there are none of. */
function listOf(workouts: number, exercises: number, entries: number): string {
    const items = [
        ...(workouts > 0 ? [count(workouts, 'workout')] : []),
        ...(exercises > 0 ? [count(exercises, 'exercise')] : []),
        ...(entries > 0 ? [count(entries, 'history entry', 'history entries')] : []),
    ];
    return items.length > 1
        ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
        : (items[0] ?? '');
}

/** e.g. "Added 2 workouts and 14 history entries. Updated 1 workout." */
export function importMessage(result: ImportResult): string {
    if (!result.ok) {
        switch (result.problem) {
            case 'too-new':
                return 'That backup is from a newer version of Loop Workouts. Update the app and try again.';
            case 'too-big':
            case 'not-a-backup':
                return "That file isn't a Loop Workouts backup.";
            case 'unreadable':
                return "That file couldn't be read. Is it a Loop Workouts backup?";
        }
    }
    const added = listOf(result.workoutsAdded, result.exercisesAdded, result.entriesAdded);
    const updated = listOf(result.workoutsUpdated, result.exercisesUpdated, result.entriesUpdated);
    const parts = [
        ...(added ? [`Added ${added}.`] : []),
        ...(updated ? [`Updated ${updated}.`] : []),
        ...(result.removed > 0
            ? [`Removed ${count(result.removed, 'item')} deleted since on the other device.`]
            : []),
    ];
    const summary =
        parts.length > 0
            ? parts.join(' ')
            : 'Nothing new: everything in that backup is already here.';
    if (result.skipped === 0) {
        return summary;
    }
    return `${summary} ${count(result.skipped, 'item')} in it couldn't be read, so ${result.skipped === 1 ? 'it was' : 'they were'} left out.`;
}
