import {
    ChangeDetectionStrategy,
    Component,
    inject,
    signal
} from '@angular/core';
import {
    AbstractControl,
    FormBuilder,
    ReactiveFormsModule,
    ValidationErrors,
    Validators
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';


@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    imports: [
        ReactiveFormsModule, 
        MatButtonModule, 
        MatFormFieldModule, 
        MatIconModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerSetupComponent {
    timerStore = inject(TimerStore);
    router = inject(Router);
    route = inject(ActivatedRoute);
    protected editingTimerId = signal<number | null>(null);
    minuteOptions = Array.from({ length: 100 }, (_, index) => index);
    secondOptions = Array.from({ length: 60 }, (_, index) => index);
    repeatOptions = Array.from({ length: 30 }, (_, index) => index + 1);

    timerForm = inject(FormBuilder).nonNullable.group({
        title: [''],
        timerMinutes: [0, Validators.min(0)],
        timerSeconds: [0, Validators.min(0)],
        restMinutes: [0, Validators.min(0)],
        restSeconds: [0, Validators.min(0)],
        repeats: [1, Validators.min(1)]
    }, {
        validators: [this.timerTimeValidator.bind(this)]
    });

    private timerTimeValidator(group: AbstractControl): ValidationErrors | null {
        const minutes = this.toNumber(group.get('timerMinutes')?.value);
        const seconds = this.toNumber(group.get('timerSeconds')?.value);
        return (minutes + seconds) > 0 ? null : { noTime: true };
    }

    private toNumber(value: unknown): number {
        return typeof value === 'number' ? value : Number(value ?? 0);
    }

    constructor() {
        const rawEditId = this.route.snapshot.queryParamMap.get('editId');
        if (!rawEditId) {
            return;
        }

        const editId = Number(rawEditId);
        if (!Number.isInteger(editId) || editId <= 0) {
            return;
        }

        const timerToEdit = this.timerStore.findTimerById(editId);
        if (!timerToEdit) {
            return;
        }

        this.editingTimerId.set(editId);
        this.timerForm.setValue({
            title: timerToEdit.title,
            timerMinutes: timerToEdit.timerMinutes,
            timerSeconds: timerToEdit.timerSeconds,
            restMinutes: timerToEdit.restMinutes,
            restSeconds: timerToEdit.restSeconds,
            repeats: timerToEdit.repeats
        });
    }

    addTimer() {
        if (!this.timerForm.valid) {
            return;
        }

        const formValue = this.timerForm.getRawValue();

        const newTimer: Omit<Timer, 'id'> = {
            title: formValue.title,
            timerMinutes: this.toNumber(formValue.timerMinutes),
            timerSeconds: this.toNumber(formValue.timerSeconds),
            restMinutes: this.toNumber(formValue.restMinutes),
            restSeconds: this.toNumber(formValue.restSeconds),
            repeats: this.toNumber(formValue.repeats),
            isTimerActive: false,
            isRestActive: false, 
            isComplete: false
        };

        const editingId = this.editingTimerId();
        const savedTimer = editingId
            ? this.timerStore.updateTimer(editingId, newTimer) ?? this.timerStore.addTimer(newTimer)
            : this.timerStore.addTimer(newTimer);

        this.timerForm.reset({
            title: '',
            timerMinutes: 0,
            timerSeconds: 0,
            restMinutes: 0,
            restSeconds: 0,
            repeats: 1
        });
        this.editingTimerId.set(null);
        this.timerStore.setActiveTimer(savedTimer);
        this.router.navigate(['/timer']);
    }
}
