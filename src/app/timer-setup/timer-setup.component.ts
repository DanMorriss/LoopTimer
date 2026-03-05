import {
    ChangeDetectionStrategy,
    Component,
    inject
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
import { MatInputModule } from '@angular/material/input';
import { Router } from '@angular/router';
import { Timer } from '../models/timer';
import { TimerStore } from '../shared/state/timer-store.service';


@Component({
    selector: 'app-timer-setup',
    templateUrl: './timer-setup.component.html',
    styleUrl: './timer-setup.component.scss',
    imports: [
        ReactiveFormsModule, 
        MatButtonModule, 
        MatInputModule, 
        MatFormFieldModule, 
        MatIconModule,
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TimerSetupComponent {
    timerStore = inject(TimerStore);
    router = inject(Router);

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
        const minutes = group.get('timerMinutes')?.value ?? 0;
        const seconds = group.get('timerSeconds')?.value ?? 0;
        return (minutes + seconds) > 0 ? null : { noTime: true };
    }

    addTimer() {
        if (!this.timerForm.valid) {
            return;
        }

        const formValue = this.timerForm.getRawValue();

        const newTimer: Omit<Timer, 'id'> = {
            title: formValue.title,
            timerMinutes: formValue.timerMinutes,
            timerSeconds: formValue.timerSeconds,
            restMinutes: formValue.restMinutes,
            restSeconds: formValue.restSeconds,
            repeats: formValue.repeats,
            isTimerActive: false,
            isRestActive: false, 
            isComplete: false
        };

        const savedTimer = this.timerStore.addTimer(newTimer);
        this.timerForm.reset({ repeats: 1 });
        this.timerStore.setActiveTimer(savedTimer);
        this.router.navigate(['/timer']);
    }
}
