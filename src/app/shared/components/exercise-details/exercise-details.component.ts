import { Component, computed, inject, input } from '@angular/core';
import { capitalise, equipmentPhrases, Exercise, isBuiltIn } from '../../../models/exercise';
import { ExerciseStore } from '../../state/exercise-store.service';
import { BodyMapComponent } from '../body-map/body-map.component';
import { ExerciseDemoComponent } from '../exercise-demo/exercise-demo.component';

let nextId = 0;

/**
 * What an exercise is (EXR-7, EXR-8, EXR-13): its other names, what it needs and how it's
 * measured as chips, its description and your note on it, then the muscles it works on the
 * body map, how to do it (with its animated demo, where it has one) and tips. Everything but
 * its name, which goes in whatever holds it: its page, or the details dialog in Create. Buttons for it (e.g. Edit) can be put inside, and show
 * under the description and note.
 */
@Component({
    selector: 'app-exercise-details',
    imports: [BodyMapComponent, ExerciseDemoComponent],
    templateUrl: './exercise-details.component.html',
    styleUrl: './exercise-details.component.scss',
})
export class ExerciseDetailsComponent {
    readonly exercise = input.required<Exercise>();
    /** Said when it has no how-to steps or tips, or nothing for empty. */
    readonly emptyHint = input('');

    private readonly exercises = inject(ExerciseStore);
    protected readonly id = `exercise-details-${nextId++}`;

    protected readonly builtIn = computed(() => isBuiltIn(this.exercise()));
    /** Its description, steps and tips: a built-in one's once they've loaded. */
    protected readonly text = computed(() => this.exercises.textOf(this.exercise()));
    protected readonly note = computed(() => this.exercises.noteFor(this.exercise().id));
    protected readonly hidden = computed(() => this.exercises.isHidden(this.exercise().id));
    protected readonly equipment = computed(() =>
        equipmentPhrases(this.exercise().equipment).map(capitalise)
    );

    constructor() {
        void this.exercises.loadText();
    }
}
