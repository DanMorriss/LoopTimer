import { Component, computed, inject, signal } from '@angular/core';
import { form, FormField, FormRoot, validate } from '@angular/forms/signals';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';

/**
 * The form's values. The numbers are strings because native <select> elements
 * always report their value as a string; they're converted when the timer is saved.
 */
interface TimerSetupModel {
    title: string;
    timerMinutes: string;
    timerSeconds: string;
    restMinutes: string;
    restSeconds: string;
    repeats: string;
}

interface SelectOption {
    value: string;
    label: string;
}

function selectOptions(from: number, to: number, label: (n: number) => string): SelectOption[] {
    return Array.from({ length: to - from + 1 }, (_, i) => ({ value: String(from + i), label: label(from + i) }));
}

const padded = (n: number) => n.toString().padStart(2, '0');

const EMPTY_SETUP: TimerSetupModel = {
    title: '',
    timerMinutes: '0',
    timerSeconds: '0',
    restMinutes: '0',
    restSeconds: '0',
    repeats: '1'
};

@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    imports: [FormRoot, FormField, MatButtonModule, MatFormFieldModule, MatIconModule],
})
export class TimerSetupComponent {
    private readonly timerStore = inject(TimerStore);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    protected readonly editingTimerId = signal<number | null>(null);
    // Each <option> also binds [selected] from the form value: [formField] sets the
    // <select>'s value before the @for has created its options, which the browser ignores
    protected readonly minuteOptions = selectOptions(0, 99, padded);
    protected readonly secondOptions = selectOptions(0, 59, padded);
    protected readonly repeatOptions = selectOptions(1, 30, String);

    private readonly model = signal<TimerSetupModel>({ ...EMPTY_SETUP });

    protected readonly timerForm = form(
        this.model,
        setup => {
            // The dropdowns only offer valid values, so the one rule is that there's some work time
            validate(setup, ({ value }) =>
                Number(value().timerMinutes) + Number(value().timerSeconds) > 0
                    ? undefined
                    : { kind: 'noTime', message: 'Timer must have some time' }
            );
        },
        {
            submission: {
                action: async () => {
                    await this.saveAndStart();
                    return undefined;
                }
            }
        }
    );

    protected readonly noTimeError = computed(() =>
        this.timerForm().errors().find(error => error.kind === 'noTime')
    );

    constructor() {
        const timerToEdit = this.findTimerToEdit();
        if (timerToEdit) {
            this.editingTimerId.set(timerToEdit.id);
            this.model.set({
                title: timerToEdit.title,
                timerMinutes: String(timerToEdit.timerMinutes),
                timerSeconds: String(timerToEdit.timerSeconds),
                restMinutes: String(timerToEdit.restMinutes),
                restSeconds: String(timerToEdit.restSeconds),
                repeats: String(timerToEdit.repeats)
            });
        }
    }

    private findTimerToEdit(): Timer | null {
        const rawEditId = this.route.snapshot.queryParamMap.get('editId');
        const editId = Number(rawEditId);
        if (!rawEditId || !Number.isInteger(editId) || editId <= 0) {
            return null;
        }
        return this.timerStore.findTimerById(editId);
    }

    private async saveAndStart(): Promise<void> {
        const value = this.model();
        const timer: Omit<Timer, 'id'> = {
            title: value.title,
            timerMinutes: Number(value.timerMinutes),
            timerSeconds: Number(value.timerSeconds),
            restMinutes: Number(value.restMinutes),
            restSeconds: Number(value.restSeconds),
            repeats: Number(value.repeats),
            isTimerActive: false,
            isRestActive: false,
            isComplete: false
        };

        const editingId = this.editingTimerId();
        const savedTimer = editingId
            ? this.timerStore.updateTimer(editingId, timer) ?? this.timerStore.addTimer(timer)
            : this.timerStore.addTimer(timer);

        this.model.set({ ...EMPTY_SETUP });
        this.editingTimerId.set(null);
        this.timerStore.setActiveTimer(savedTimer);
        await this.router.navigate(['/timer']);
    }
}
