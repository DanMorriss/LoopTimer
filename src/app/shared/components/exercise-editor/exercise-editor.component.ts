import { CdkTrapFocus } from '@angular/cdk/a11y';
import { Component, computed, inject, input, linkedSignal, output } from '@angular/core';
import { form, FormField, maxLength, validate } from '@angular/forms/signals';
import { MatIconModule } from '@angular/material/icon';
import {
    Equipment,
    EQUIPMENT_CHOICES,
    equipmentLabel,
    Exercise,
    isBuiltIn,
    MAX_EXERCISE_DESCRIPTION_LENGTH,
    MAX_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_NOTE_LENGTH,
    MeasuredBy,
    MUSCLE_LABELS,
    MuscleGroup,
} from '../../../models/exercise';
import { ExerciseStore } from '../../state/exercise-store.service';
import { TimerStore } from '../../state/timer-store.service';
import { BodyMapComponent } from '../body-map/body-map.component';

/** What the editor holds: an exercise's details (used only for your own) and your note. */
interface ExerciseEditorModel {
    name: string;
    measuredBy: MeasuredBy;
    description: string;
    equipment: Equipment[];
    mainMuscles: MuscleGroup[];
    supportingMuscles: MuscleGroup[];
    note: string;
}

const MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

/**
 * An exercise's details and your note on it, in a dialog. Your own exercise can be renamed
 * (EXR-3) and given a description, equipment and muscles (EXR-9); a renamed one's steps take
 * the new name in every timer. A built-in one can't change, so it shows its description and
 * only the note can be written (EXR-10). Focus is trapped inside while it's open.
 */
@Component({
    selector: 'app-exercise-editor',
    imports: [CdkTrapFocus, FormField, MatIconModule, BodyMapComponent],
    templateUrl: './exercise-editor.component.html',
    styleUrl: './exercise-editor.component.scss',
})
export class ExerciseEditorComponent {
    readonly exercise = input.required<Exercise>();
    readonly closed = output<void>();
    /** Saved, with the exercise as it now is. */
    readonly saved = output<Exercise>();

    private readonly exercises = inject(ExerciseStore);
    private readonly timers = inject(TimerStore);

    protected readonly builtIn = computed(() => isBuiltIn(this.exercise()));
    protected readonly muscles = MUSCLES;
    protected readonly muscleLabels = MUSCLE_LABELS;
    protected readonly equipmentChoices = EQUIPMENT_CHOICES;
    protected readonly equipmentLabel = equipmentLabel;
    protected readonly maxNote = MAX_EXERCISE_NOTE_LENGTH;
    protected readonly measuredByChoices: { value: MeasuredBy; label: string }[] = [
        { value: 'reps', label: 'Reps' },
        { value: 'timed', label: 'Time' },
    ];

    private readonly model = linkedSignal<ExerciseEditorModel>(() => {
        const exercise = this.exercise();
        return {
            name: exercise.name,
            measuredBy: exercise.measuredBy,
            description: exercise.description,
            // Only single pieces can be picked; a choice of them (from a backup) stays as it is
            equipment: exercise.equipment.filter(
                (need): need is Equipment => typeof need === 'string'
            ),
            mainMuscles: [...exercise.mainMuscles],
            supportingMuscles: [...exercise.supportingMuscles],
            note: this.exercises.noteFor(exercise.id) ?? '',
        };
    });

    protected readonly editorForm = form(this.model, (editor) => {
        maxLength(editor.description, MAX_EXERCISE_DESCRIPTION_LENGTH);
        maxLength(editor.note, MAX_EXERCISE_NOTE_LENGTH);
        validate(editor.name, ({ value }) => {
            if (this.builtIn()) {
                return undefined;
            }
            if (value().trim() === '') {
                return { kind: 'required', message: 'Give it a name' };
            }
            if (value().length > MAX_EXERCISE_NAME_LENGTH) {
                return {
                    kind: 'tooLong',
                    message: `Keep it to ${MAX_EXERCISE_NAME_LENGTH} characters`,
                };
            }
            return this.exercises.nameTaken(value(), this.exercise().id)
                ? {
                      kind: 'taken',
                      message: `There's already an exercise called "${value().trim()}"`,
                  }
                : undefined;
        });
    });

    protected readonly nameError = computed(() => this.editorForm.name().errors().at(0)?.message);
    protected readonly mainMuscles = computed(() => this.model().mainMuscles);
    protected readonly supportingMuscles = computed(() => this.model().supportingMuscles);

    protected setMeasuredBy(measuredBy: MeasuredBy) {
        this.model.update((editor) => ({ ...editor, measuredBy }));
    }

    protected hasEquipment(equipment: Equipment): boolean {
        return this.model().equipment.includes(equipment);
    }

    protected toggleEquipment(equipment: Equipment) {
        this.model.update((editor) => ({
            ...editor,
            equipment: this.hasEquipment(equipment)
                ? editor.equipment.filter((e) => e !== equipment)
                : [...editor.equipment, equipment],
        }));
    }

    protected isMain(muscle: MuscleGroup): boolean {
        return this.model().mainMuscles.includes(muscle);
    }

    protected isSupporting(muscle: MuscleGroup): boolean {
        return this.model().supportingMuscles.includes(muscle);
    }

    /** Main or supporting, not both: picking one takes it out of the other. */
    protected toggleMuscle(muscle: MuscleGroup, as: 'main' | 'supporting') {
        const on = as === 'main' ? this.isMain(muscle) : this.isSupporting(muscle);
        const without = (list: MuscleGroup[]) => list.filter((m) => m !== muscle);
        this.model.update((editor) => ({
            ...editor,
            mainMuscles:
                as === 'main' && !on
                    ? [...editor.mainMuscles, muscle]
                    : without(editor.mainMuscles),
            supportingMuscles:
                as === 'supporting' && !on
                    ? [...editor.supportingMuscles, muscle]
                    : without(editor.supportingMuscles),
        }));
    }

    /**
     * Saves and closes. Handled here rather than as a form submission: the dialog closes as
     * it saves, and a form taken away mid-submission stays "submitting".
     */
    protected save(event: Event) {
        event.preventDefault();
        if (this.editorForm().invalid()) {
            // Only the name can be wrong; it's at the top, perhaps scrolled out of sight
            document.getElementById('exercise-editor-name')?.focus();
            return;
        }
        const exercise = this.exercise();
        const { note, ...details } = this.model();
        let result: Exercise = exercise;
        if (!isBuiltIn(exercise)) {
            const updated = this.exercises.updateOwn(exercise.id, {
                ...details,
                // A choice of pieces from a backup is kept, as it can't be picked here
                equipment: [
                    ...exercise.equipment.filter((need) => typeof need !== 'string'),
                    ...details.equipment,
                ],
            });
            if (!updated) {
                return;
            }
            if (updated.name !== exercise.name) {
                this.timers.renameExerciseSteps(updated.id, updated.name);
            }
            result = updated;
        }
        if (note.trim() !== (this.exercises.noteFor(exercise.id) ?? '')) {
            this.exercises.setNote(exercise.id, note);
        }
        this.saved.emit(result);
    }

    protected cancel() {
        this.closed.emit();
    }
}
