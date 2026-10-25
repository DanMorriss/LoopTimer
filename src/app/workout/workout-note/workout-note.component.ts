import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Your note on the step's exercise (EXR-10), e.g. a cue or a machine setting, under the ring. */
@Component({
    selector: 'app-workout-note',
    imports: [MatIconModule],
    template: `
        <p class="workout-note" [class.workout-note--muted]="muted()">
            <mat-icon class="workout-note__icon" aria-hidden="true">sticky_note_2</mat-icon>
            <span><span class="sr-only">Your note: </span>{{ text() }}</span>
        </p>
    `,
    styleUrl: './workout-note.component.scss',
})
export class WorkoutNoteComponent {
    readonly text = input.required<string>();
    /** Paused: it steps back with the rest of the page. */
    readonly muted = input(false);
}
