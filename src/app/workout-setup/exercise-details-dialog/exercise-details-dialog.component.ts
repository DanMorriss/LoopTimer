import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ExerciseDetailsComponent } from '../../shared/components/exercise-details/exercise-details.component';
import { Exercise } from '../../models/exercise';

/**
 * The exercise picked for a step, in full, so you can see it's the one you want (EXR-11):
 * what its page shows, without leaving the workout. Pick another takes you back to the name
 * box to choose again. Focus starts on its name and is trapped inside while it's open.
 */
@Component({
    selector: 'app-exercise-details-dialog',
    imports: [CdkTrapFocus, MatIconModule, ExerciseDetailsComponent],
    template: `
        <div
            class="details-overlay dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="closed.emit()"
        >
            <div
                class="details dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="exercise-details-title"
                (click)="$event.stopPropagation()"
            >
                <!-- Focus starts here, so it opens at the top rather than at the buttons below -->
                <h2
                    id="exercise-details-title"
                    class="details__title"
                    tabindex="-1"
                    cdkFocusInitial
                >
                    {{ exercise().name }}
                </h2>
                <app-exercise-details [exercise]="exercise()" />
                <div class="details__actions">
                    <button
                        type="button"
                        class="btn-pill details__pick-another"
                        (click)="pickAnother.emit()"
                    >
                        <mat-icon aria-hidden="true">swap_horiz</mat-icon>
                        Pick another
                    </button>
                    <button type="button" class="btn-pill details__done" (click)="closed.emit()">
                        Done
                    </button>
                </div>
            </div>
        </div>
    `,
    styleUrl: './exercise-details-dialog.component.scss',
})
export class ExerciseDetailsDialogComponent {
    readonly exercise = input.required<Exercise>();
    readonly closed = output<void>();
    /** Back to the step's name box, to choose a different exercise. */
    readonly pickAnother = output<void>();
}
