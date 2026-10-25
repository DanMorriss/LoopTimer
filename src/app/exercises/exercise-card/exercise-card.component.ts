import { DatePipe } from '@angular/common';
import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { Exercise } from '../../models/exercise';

/** One exercise in the list, as its card shows it. */
export interface ExerciseCard {
    exercise: Exercise;
    path: string;
    queryParams: { muscles?: string };
    own: boolean;
    mainMuscles: string[];
    /** e.g. "Barbell, rack", or empty when it lists none. */
    equipment: string;
    /** The other name a search found it by, if not its own. */
    otherName?: string;
    /** Its latest and best (PRG-3); missing until it's been done in a workout. */
    progress?: CardProgress;
}

/** e.g. latest "3 × 10 @ 60 kg" on 18 October, best "80 kg". */
export interface CardProgress {
    latest: string;
    latestSpoken: string;
    latestAt: number;
    /** The date with its year, unless it was this year. */
    dateFormat: string;
    best: string;
}

/** One exercise in the Exercises list (EXR-6): a link to its page, with its latest and best. */
@Component({
    selector: 'app-exercise-card',
    imports: [DatePipe, MatIconModule, RouterLink],
    templateUrl: './exercise-card.component.html',
    styleUrl: './exercise-card.component.scss',
})
export class ExerciseCardComponent {
    readonly card = input.required<ExerciseCard>();
}
