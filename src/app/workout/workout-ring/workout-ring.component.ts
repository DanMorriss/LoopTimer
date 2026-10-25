import { Component, input } from '@angular/core';

/** One fill of the ring, timed for the step it's showing. */
export interface RingSweep {
    /** A new key starts the fill again. */
    key: string;
    halfDuration: string;
    /** Negative delays start part-way through, e.g. when resuming after a refresh. */
    firstHalfDelay: string;
    secondHalfDelay: string;
}

/**
 * The workout's progress ring around its face (the content): it fills clockwise in the work
 * colour, anticlockwise in the rest colour, and is a full ring in the rep colour while a rep
 * step waits for Done. Paused, it freezes and greys out.
 */
@Component({
    selector: 'app-workout-ring',
    templateUrl: './workout-ring.component.html',
    styleUrl: './workout-ring.component.scss',
})
export class WorkoutRingComponent {
    /** What's running, or null when the workout's finished. */
    readonly phase = input<'work' | 'rest' | 'reps' | null>(null);
    readonly paused = input(false);
    /** The fill under way, if one is: kept in a list so a new key starts it again. */
    readonly sweeps = input<readonly RingSweep[]>([]);
    /** How far through the step it is, 0–100. */
    readonly percent = input(0);
}
