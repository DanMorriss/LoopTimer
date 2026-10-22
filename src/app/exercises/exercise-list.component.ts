import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { Router, RouterLink } from '@angular/router';
import { ExerciseEditorComponent } from '../shared/components/exercise-editor/exercise-editor.component';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import {
    canDoWith,
    capitalise,
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    equipmentPhrases,
    Exercise,
    exercisePath,
    isBuiltIn,
    MUSCLE_LABELS,
    MuscleGroup,
} from '../models/exercise';
import { searchExercises } from '../models/exercise-links';
import { blankOwnExercise, ExerciseStore } from '../shared/state/exercise-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';

/** One exercise in the list, as its card shows it. */
interface ExerciseCard {
    exercise: Exercise;
    path: string;
    own: boolean;
    mainMuscles: string[];
    /** e.g. "Barbell, rack", or empty when it lists none. */
    equipment: string;
    /** The other name a search found it by, if not its own. */
    otherName?: string;
}

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

/**
 * Every exercise, built-in and your own, to browse and search (EXR-6). The list can be cut
 * down to one main muscle, and to what you can do with your equipment, which is remembered.
 * Hidden exercises are kept apart at the end. New makes an exercise of your own.
 */
@Component({
    selector: 'app-exercise-list',
    imports: [
        MatIconModule,
        NgTemplateOutlet,
        RouterLink,
        ToggleSwitchComponent,
        ExerciseEditorComponent,
    ],
    templateUrl: './exercise-list.component.html',
    styleUrl: './exercise-list.component.scss',
})
export class ExerciseListComponent {
    private readonly exercises = inject(ExerciseStore);
    private readonly settings = inject(SettingsStore);
    private readonly router = inject(Router);

    protected readonly muscles = MUSCLES;
    protected readonly muscleLabels = MUSCLE_LABELS;
    protected readonly equipmentChoices = EQUIPMENT_CHOICES;
    protected readonly equipmentLabel = equipmentLabel;

    protected readonly query = signal('');
    /** The main muscle the list is cut down to, or null for all. */
    protected readonly muscle = signal<MuscleGroup | null>(null);
    protected readonly kitOpen = signal(false);
    protected readonly hiddenOpen = signal(false);
    /** A blank exercise of your own in the editor, made when it's saved. */
    protected readonly drafting = signal(false);
    protected readonly draft = blankOwnExercise();

    protected readonly myEquipment = this.settings.myEquipment;
    protected readonly onlyMyEquipment = this.settings.onlyMyEquipment;

    /** Best match first while searching, otherwise A to Z. */
    private readonly found = computed(() => {
        const muscle = this.muscle();
        const kit = this.myEquipment();
        const typed = this.query().trim();
        const all = this.exercises.exercises();
        const matches = typed
            ? searchExercises(typed, all, Infinity)
            : [...all]
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((exercise) => ({ exercise, otherName: undefined }));
        return matches
            .filter(
                ({ exercise }) =>
                    (muscle === null || exercise.mainMuscles.includes(muscle)) &&
                    (!this.onlyMyEquipment() || canDoWith(exercise, kit))
            )
            .map(({ exercise, otherName }) => card(exercise, otherName));
    });

    protected readonly shown = computed(() =>
        this.found().filter((c) => !this.exercises.isHidden(c.exercise.id))
    );
    protected readonly hidden = computed(() =>
        this.found().filter((c) => this.exercises.isHidden(c.exercise.id))
    );
    protected readonly filtered = computed(
        () => this.query().trim() !== '' || this.muscle() !== null || this.onlyMyEquipment()
    );
    protected readonly kitSummary = computed(() => {
        const count = this.myEquipment().length;
        if (count === 0) {
            return 'none';
        }
        return count === 1 ? '1 piece' : `${count} pieces`;
    });

    protected onSearch(event: Event) {
        this.query.set((event.target as HTMLInputElement).value);
    }

    protected pickMuscle(muscle: MuscleGroup | null) {
        this.muscle.set(muscle);
    }

    protected setOnlyMine(only: boolean) {
        this.settings.update({ onlyMyEquipment: only });
    }

    protected hasEquipment(equipment: Equipment): boolean {
        return this.myEquipment().includes(equipment);
    }

    protected toggleEquipment(equipment: Equipment) {
        const mine = this.hasEquipment(equipment)
            ? this.myEquipment().filter((e) => e !== equipment)
            : [...this.myEquipment(), equipment];
        // In the order it's offered, as it's saved
        this.settings.update({ myEquipment: EQUIPMENT_CHOICES.filter((e) => mine.includes(e)) });
    }

    protected clearFilters() {
        this.query.set('');
        this.muscle.set(null);
        this.setOnlyMine(false);
    }

    protected made(exercise: Exercise) {
        this.drafting.set(false);
        void this.router.navigateByUrl(exercisePath(exercise));
    }

    protected closeDraft() {
        this.drafting.set(false);
        document.getElementById('exercise-list-new')?.focus();
    }
}

function card(exercise: Exercise, otherName?: string): ExerciseCard {
    return {
        exercise,
        path: exercisePath(exercise),
        own: !isBuiltIn(exercise),
        mainMuscles: exercise.mainMuscles.map((muscle) => MUSCLE_LABELS[muscle]),
        equipment: capitalise(equipmentPhrases(exercise.equipment).join(', ')),
        otherName,
    };
}
