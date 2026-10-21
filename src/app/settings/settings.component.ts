import { ApplicationRef, Component, computed, DOCUMENT, inject, signal } from '@angular/core';
import { BodyFigure } from '../models/exercise';
import { WeightUnit } from '../models/weight';
import { AlarmService } from '../shared/alarms/alarm.service';
import { BackupService, ImportResult } from '../shared/backup/backup.service';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { KeepAwakeService } from '../shared/run/keep-awake.service';
import { SettingsStore, Theme } from '../shared/state/settings-store.service';
import { AlarmKind } from '../timer/alarm-schedule';

interface AlarmPreview {
    kind: AlarmKind;
    name: string;
    description: string;
}

/** On <html> while the theme changes, so the picker's highlight can leave the sliding to the fade. */
const SWITCHING_CLASS = 'theme-switching';

@Component({
    selector: 'app-settings',
    imports: [ToggleSwitchComponent],
    templateUrl: './settings.component.html',
    styleUrl: './settings.component.scss',
})
export class SettingsComponent {
    protected readonly settings = inject(SettingsStore);
    protected readonly alarms = inject(AlarmService);
    protected readonly keepAwake = inject(KeepAwakeService);
    private readonly backup = inject(BackupService);
    private readonly appRef = inject(ApplicationRef);
    private readonly document = inject(DOCUMENT);
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** The theme fade in progress, if any. */
    private transition: ViewTransition | null = null;

    protected readonly themes: { value: Theme; label: string }[] = [
        { value: 'dark', label: 'Dark' },
        { value: 'light', label: 'Light' },
        { value: 'system', label: 'System' },
    ];
    /** Where the picker's highlight sits: 0, 1 or 2. */
    protected readonly chosenIndex = computed(() =>
        this.themes.findIndex((option) => option.value === this.settings.theme())
    );

    protected readonly weightUnits: { value: WeightUnit; label: string }[] = [
        { value: 'kg', label: 'Kilograms (kg)' },
        { value: 'lb', label: 'Pounds (lb)' },
    ];
    protected readonly chosenUnitIndex = computed(() =>
        this.weightUnits.findIndex((option) => option.value === this.settings.weightUnit())
    );

    protected readonly figures: { value: BodyFigure; label: string }[] = [
        { value: 'male', label: 'Male' },
        { value: 'female', label: 'Female' },
    ];
    protected readonly chosenFigureIndex = computed(() =>
        this.figures.findIndex((option) => option.value === this.settings.bodyFigure())
    );

    protected readonly previews: AlarmPreview[] = [
        { kind: 'work', name: 'Timed', description: 'Two short high beeps' },
        { kind: 'rest', name: 'Rest', description: 'One long low tone' },
        { kind: 'finish', name: 'Finish', description: 'Three rising notes' },
    ];

    /** What the last export or import did, read out as it changes. */
    protected readonly backupStatus = signal('');

    protected exportBackup() {
        this.backupStatus.set(`Backup saved as ${this.backup.export()}.`);
    }

    protected async importBackup(input: HTMLInputElement) {
        const file = input.files?.[0];
        // Cleared so choosing the same file again still counts as a change
        input.value = '';
        if (!file) {
            return;
        }
        this.backupStatus.set(importMessage(await this.backup.import(file)));
    }

    /**
     * Saves the theme, fading the whole page from the old colours to the new with a view
     * transition where the browser has them. The picker's highlight slides across as part of
     * the same fade. With reduced motion, or no view transitions, it changes at once.
     */
    protected chooseTheme(theme: Theme) {
        const root = this.document.documentElement;
        if (this.reducedMotion() || !this.document.startViewTransition) {
            this.settings.update({ theme });
            return;
        }
        root.classList.add(SWITCHING_CLASS);
        const transition = this.document.startViewTransition(() => {
            this.settings.update({ theme });
            // Render now, so the new colours and the highlight's new place are what fades in
            this.appRef.tick();
        });
        this.transition = transition;
        // Choosing again mid-fade skips this one (the setting is still saved), which rejects `ready`
        transition.ready.catch(() => undefined);
        transition.finished.finally(() => {
            // Leave the class for a fade that has taken over from this one
            if (this.transition === transition) {
                root.classList.remove(SWITCHING_CLASS);
                this.transition = null;
            }
        });
    }
}

function count(n: number, thing: string): string {
    return `${n} ${thing}${n === 1 ? '' : 's'}`;
}

/** "2 timers, 3 exercises and 14 workouts", leaving out any there are none of. */
function listOf(timers: number, exercises: number, workouts: number): string {
    const items = [
        ...(timers > 0 ? [count(timers, 'timer')] : []),
        ...(exercises > 0 ? [count(exercises, 'exercise')] : []),
        ...(workouts > 0 ? [count(workouts, 'workout')] : []),
    ];
    return items.length > 1
        ? `${items.slice(0, -1).join(', ')} and ${items.at(-1)}`
        : (items[0] ?? '');
}

/** e.g. "Added 2 timers and 14 workouts to the history. Updated 1 workout." */
export function importMessage(result: ImportResult): string {
    if (!result.ok) {
        switch (result.problem) {
            case 'too-new':
                return 'That backup is from a newer version of LoopTimer. Update the app and try again.';
            case 'too-big':
            case 'not-a-backup':
                return "That file isn't a LoopTimer backup.";
            case 'unreadable':
                return "That file couldn't be read. Is it a LoopTimer backup?";
        }
    }
    const added = listOf(result.timersAdded, result.exercisesAdded, result.workoutsAdded);
    const updated = listOf(result.timersUpdated, result.exercisesUpdated, result.workoutsUpdated);
    const parts = [
        ...(added ? [`Added ${added}${result.workoutsAdded > 0 ? ' to the history' : ''}.`] : []),
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
