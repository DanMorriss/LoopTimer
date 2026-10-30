import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    input,
    output,
    viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Exercise } from '../../../models/exercise';
import { allSteps, MAX_STEPS } from '../../../models/workout';
import { growFromClick } from '../../../shared/dialog-origin';
import { WorkoutStore } from '../../../shared/state/workout-store.service';

/** A workout in the list: its name, how many steps it has, and whether there's room. */
interface Choice {
    id: string;
    name: string;
    steps: number;
    full: boolean;
}

/**
 * Where to add an exercise from its page (EXR-12): a new workout, or one in the library, in
 * the library's order. Picking one opens it in Create with the exercise at the end; a
 * workout already at MAX_STEPS can't be picked. Focus is trapped inside while it's open, and
 * ✕, Escape or a click outside close it.
 */
@Component({
    selector: 'app-add-to-workout-dialog',
    imports: [CdkTrapFocus, MatIconModule],
    template: `
        <div
            class="add-overlay dialog-overlay"
            role="presentation"
            (click)="closed.emit()"
            (keydown.escape)="closed.emit()"
        >
            <div
                #card
                class="add dialog-card"
                cdkTrapFocus
                [cdkTrapFocusAutoCapture]="true"
                role="dialog"
                aria-modal="true"
                aria-labelledby="add-to-workout-title"
                aria-describedby="add-to-workout-hint"
                (click)="$event.stopPropagation()"
            >
                <div class="add__header">
                    <h2 id="add-to-workout-title" class="add__title">
                        Add {{ exercise().name }} to
                    </h2>
                    <button
                        type="button"
                        class="btn-icon add__close"
                        aria-label="Close"
                        (click)="closed.emit()"
                    >
                        <mat-icon aria-hidden="true">close</mat-icon>
                    </button>
                </div>
                <p id="add-to-workout-hint" class="add__hint">
                    It goes at the end with 3 sets, to change before you save.
                </p>
                <ul class="add__choices">
                    <li>
                        <button
                            type="button"
                            class="menu__item add__choice"
                            cdkFocusInitial
                            (click)="picked.emit(null)"
                        >
                            <mat-icon aria-hidden="true">add</mat-icon>
                            <span class="add__name">New workout</span>
                        </button>
                    </li>
                    @for (choice of choices(); track choice.id) {
                        <li>
                            <button
                                type="button"
                                class="menu__item add__choice"
                                [disabled]="choice.full"
                                (click)="picked.emit(choice.id)"
                            >
                                <mat-icon aria-hidden="true">view_list</mat-icon>
                                <span class="add__name">{{ choice.name }}</span>
                                <span class="add__steps">
                                    @if (choice.full) {
                                        Full, {{ choice.steps }} steps
                                    } @else {
                                        {{ choice.steps }}
                                        {{ choice.steps === 1 ? 'step' : 'steps' }}
                                    }
                                </span>
                            </button>
                        </li>
                    }
                </ul>
            </div>
        </div>
    `,
    styleUrl: './add-to-workout-dialog.component.scss',
})
export class AddToWorkoutDialogComponent {
    readonly exercise = input.required<Exercise>();
    readonly closed = output<void>();
    /** The workout picked, or null for a new one. */
    readonly picked = output<string | null>();

    private readonly workouts = inject(WorkoutStore);
    protected readonly choices = computed((): Choice[] =>
        this.workouts.workouts().map((workout) => {
            const steps = allSteps(workout).length;
            return {
                id: workout.id,
                name: workout.title.trim() || 'Untitled workout',
                steps,
                full: steps >= MAX_STEPS,
            };
        })
    );

    private readonly card = viewChild.required<ElementRef<HTMLElement>>('card');

    constructor() {
        // Grows out of the button that opened it, and shrinks back into it
        afterNextRender(() => growFromClick(this.card().nativeElement));
    }
}
