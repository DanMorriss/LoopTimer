import {
    afterNextRender,
    Component,
    computed,
    effect,
    inject,
    Injector,
    signal,
} from '@angular/core';
import { applyEach, form, FormField, FormRoot, maxLength, validate } from '@angular/forms/signals';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import {
    CdkDrag,
    CdkDragDrop,
    CdkDragHandle,
    CdkDragPlaceholder,
    CdkDragPreview,
    CdkDropList,
    moveItemInArray,
} from '@angular/cdk/drag-drop';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import {
    hasWork,
    MAX_REPS,
    Step,
    StepKind,
    Workout,
    WorkoutFields,
    UNTIL_STOPPED,
} from '../models/workout';
import { WeightUnit, weightIn, weightOptions, weightToKg } from '../models/weight';
import { Exercise, isBuiltIn, MAX_EXERCISE_NAME_LENGTH } from '../models/exercise';
import { findByName } from '../models/exercise-links';
import { ExerciseEditorComponent } from '../shared/components/exercise-editor/exercise-editor.component';
import { ExerciseDetailsDialogComponent } from './exercise-details-dialog/exercise-details-dialog.component';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { ExercisePickerComponent } from './exercise-picker/exercise-picker.component';
import { InfinitySwitchComponent } from '../shared/components/infinity-switch/infinity-switch.component';
import { ConfirmDialogComponent } from '../shared/components/confirm-dialog/confirm-dialog.component';
import {
    WheelPickerComponent,
    WheelPickerOption,
} from '../shared/components/wheel-picker/wheel-picker.component';
import { ActiveRunService } from '../shared/run/active-run.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';

/**
 * One step as the form holds it: minutes and seconds for a timed step's two wheels, or
 * reps and weight for a rep step's. A step keeps them all, and only uses those for its kind.
 */
interface StepModel {
    /** Stays with the step as it moves, for tracking and element ids. */
    key: number;
    kind: StepKind;
    name: string;
    minutes: number;
    seconds: number;
    reps: number;
    /** In the unit chosen in settings, to the nearest half; 0 for none. */
    weight: number;
    /**
     * The exercise picked for a work or rep step, or '' if none has been: it then goes by
     * its name when saved (see `linkSteps()`).
     */
    exerciseId: string;
    /**
     * The weight as saved, in kg, kept as it was unless the wheel moves, so rounding it
     * for the wheel doesn't change it. Null for a new step.
     */
    savedWeight: number | null;
}

/** The form's values. */
interface WorkoutSetupModel {
    title: string;
    steps: StepModel[];
    repeats: number;
}

/** Enough for a long circuit, while keeping the page manageable. */
export const MAX_STEPS = 20;

function pickerOptions(
    from: number,
    to: number,
    label: (n: number) => string
): WheelPickerOption[] {
    return Array.from({ length: to - from + 1 }, (_, i) => ({
        value: from + i,
        label: label(from + i),
    }));
}

const padded = (n: number) => n.toString().padStart(2, '0');
const kindName = (kind: StepKind) => ({ work: 'Timed', rest: 'Rest', reps: 'Reps' })[kind];

/** What the name box suggests for each kind of step. */
const NAME_EXAMPLES: Record<StepKind, string> = {
    work: 'e.g. Squats',
    rest: 'e.g. Catch your breath',
    reps: 'e.g. Push-ups',
};

@Component({
    selector: 'app-workout-setup',
    templateUrl: './workout-setup.component.html',
    styleUrl: './workout-setup.component.scss',
    imports: [
        CdkDropList,
        CdkDrag,
        CdkDragHandle,
        CdkDragPreview,
        CdkDragPlaceholder,
        FormRoot,
        FormField,
        WheelPickerComponent,
        InfinitySwitchComponent,
        ConfirmDialogComponent,
        ExercisePickerComponent,
        ExerciseEditorComponent,
        ExerciseDetailsDialogComponent,
        MatFormFieldModule,
        MatIconModule,
    ],
})
export class WorkoutSetupComponent {
    private readonly workoutStore = inject(WorkoutStore);
    private readonly run = inject(ActiveRunService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);
    private readonly injector = inject(Injector);
    private readonly exercises = inject(ExerciseStore);
    /** Weights are shown and picked in this, and saved in kg. */
    protected readonly weightUnit = inject(SettingsStore).weightUnit();

    protected readonly maxSteps = MAX_STEPS;
    protected readonly kindName = kindName;
    protected readonly editingWorkoutId = signal<string | null>(null);
    protected readonly minuteOptions = pickerOptions(0, 99, padded);
    protected readonly secondOptions = pickerOptions(0, 59, padded);
    protected readonly repOptions = pickerOptions(0, MAX_REPS, String);
    protected readonly weightOptions = weightOptions(this.weightUnit);
    protected readonly nameExamples = NAME_EXAMPLES;
    protected readonly isBuiltIn = isBuiltIn;
    // 1-30, then ∞ at the end of the wheel
    protected readonly repeatOptions: WheelPickerOption[] = [
        ...pickerOptions(1, 30, String),
        { value: UNTIL_STOPPED, label: '∞', spokenLabel: 'until stopped' },
    ];

    private nextKey = 1;
    private readonly model = signal<WorkoutSetupModel>(this.emptySetup());
    /** Keys of the steps showing their name box and wheels; the rest show a one-line summary. */
    private readonly expandedKeys = signal<ReadonlySet<number>>(this.allKeys());

    protected readonly workoutForm = form(
        this.model,
        (setup) => {
            // Long enough for a name, short enough to fit on the workout
            applyEach(setup.steps, (step) => maxLength(step.name, MAX_EXERCISE_NAME_LENGTH));
            // The wheels only offer valid times, so the one rule is that there's some work
            validate(setup, ({ value }) =>
                hasWork(toSteps(value().steps, this.weightUnit))
                    ? undefined
                    : { kind: 'noTime', message: 'Workout needs a timed step or some reps' }
            );
        },
        {
            submission: {
                action: async () => {
                    await this.saveAndStart();
                    return undefined;
                },
            },
        }
    );

    protected readonly stepCount = computed(() => this.model().steps.length);
    protected readonly anyExpanded = computed(() => {
        const expanded = this.expandedKeys();
        return this.model().steps.some((step) => expanded.has(step.key));
    });
    protected readonly untilStopped = computed(() => this.model().repeats === UNTIL_STOPPED);
    // The last number of rounds picked, so turning the switch off goes back to it
    private lastRounds = 1;

    /** Read out by screen readers after a step is added, moved or deleted. */
    protected readonly stepAnnouncement = signal('');

    /** A step with something in it, waiting for the user to confirm deleting it. */
    protected readonly stepPendingDelete = signal<{
        index: number;
        description: string;
    } | null>(null);

    /** The exercise open in the editor, and the step it was opened from. */
    /** The exercise whose details are showing, and the step they were opened from. */
    protected readonly exerciseInDetails = signal<{ exercise: Exercise; stepKey: number } | null>(
        null
    );
    protected readonly exerciseInEditor = signal<{ exercise: Exercise; stepKey: number } | null>(
        null
    );

    // With no steps yet, the hint to add one says enough
    protected readonly noTimeError = computed(() =>
        this.stepCount() === 0
            ? undefined
            : this.workoutForm()
                  .errors()
                  .find((error) => error.kind === 'noTime')
    );

    constructor() {
        // An effect rather than a derived signal, so the number is caught even when nothing
        // reads it before the wheel moves on to ∞
        effect(() => {
            const repeats = this.model().repeats;
            if (repeats !== UNTIL_STOPPED) {
                this.lastRounds = repeats;
            }
        });

        // Not just the snapshot: the page stays open when only the query changes, e.g. Create
        // from the menu while editing, which goes from ?editId=1 to a new workout
        this.route.queryParamMap
            .pipe(takeUntilDestroyed())
            .subscribe((params) => this.load(this.findWorkoutToEdit(params)));
    }

    /** Fills the form from a saved workout, or empties it for a new one. */
    private load(workoutToEdit: Workout | null) {
        this.editingWorkoutId.set(workoutToEdit?.id ?? null);
        this.stepPendingDelete.set(null);
        if (workoutToEdit) {
            this.model.set({
                title: workoutToEdit.title,
                steps: workoutToEdit.steps.map((step) => this.stepModel(step)),
                repeats: workoutToEdit.repeats,
            });
            // A saved workout opens as a list of summaries, so the whole workout fits on screen
            this.expandedKeys.set(new Set());
        } else {
            this.model.set(this.emptySetup());
            this.expandedKeys.set(this.allKeys());
        }
    }

    protected setUntilStopped(on: boolean) {
        const repeats = on ? UNTIL_STOPPED : this.lastRounds;
        this.model.update((setup) => ({ ...setup, repeats }));
    }

    /** How a step is named to screen readers, e.g. "Step 2, rest" or "Step 1, Squats". */
    protected stepTitle(index: number): string {
        const step = this.model().steps[index];
        return `Step ${index + 1}, ${step.name.trim() || kindName(step.kind).toLowerCase()}`;
    }

    /**
     * How much of a step there is, as its wheels show it: e.g. "02:15", "20 reps", or
     * "10 reps @ 60 kg".
     */
    protected amountText(step: StepModel): string {
        if (step.kind === 'reps') {
            const reps = step.reps === 1 ? '1 rep' : `${step.reps} reps`;
            return step.weight > 0 ? `${reps} @ ${step.weight} ${this.weightUnit}` : reps;
        }
        return `${padded(step.minutes)}:${padded(step.seconds)}`;
    }

    /**
     * The exercise a work or rep step is: the one picked for it, or else the one its name
     * means, as it would be linked when saved. Undefined for a rest step, an unnamed one, or
     * a name no exercise has yet.
     */
    protected exerciseFor(step: StepModel): Exercise | undefined {
        if (step.kind === 'rest') {
            return undefined;
        }
        return (
            (step.exerciseId ? this.exercises.byId(step.exerciseId) : undefined) ??
            findByName(step.name, this.exercises.exercises())
        );
    }

    protected noteFor(exercise: Exercise): string | undefined {
        return this.exercises.noteFor(exercise.id);
    }

    protected showDetails(exercise: Exercise, stepKey: number) {
        this.exerciseInDetails.set({ exercise, stepKey });
    }

    protected closeDetails() {
        const opened = this.exerciseInDetails();
        this.exerciseInDetails.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-details`);
        }
    }

    /** Back to the step's name box with its name selected, so typing replaces it. */
    protected pickAnother() {
        const opened = this.exerciseInDetails();
        this.exerciseInDetails.set(null);
        if (opened) {
            afterNextRender(
                () => {
                    const box = document.getElementById(`step-${opened.stepKey}-name`);
                    if (box instanceof HTMLInputElement) {
                        box.focus();
                        box.select();
                    }
                },
                { injector: this.injector }
            );
        }
    }

    protected openExercise(exercise: Exercise, stepKey: number) {
        this.exerciseInEditor.set({ exercise, stepKey });
    }

    /**
     * The editor saved: the step it was opened from is linked to the exercise, and every step
     * that is the exercise takes its name, in case it was renamed (EXR-3). Saved workouts have
     * been renamed by then; this does the same for the one being set up.
     */
    protected exerciseSaved(saved: Exercise) {
        const opened = this.exerciseInEditor();
        if (!opened) {
            return;
        }
        this.updateSteps((steps) =>
            steps.map((step) => {
                const isIt =
                    step.key === opened.stepKey ||
                    step.exerciseId === saved.id ||
                    (step.kind !== 'rest' &&
                        !step.exerciseId &&
                        findByName(step.name, [opened.exercise]) !== undefined);
                return isIt ? { ...step, name: saved.name, exerciseId: saved.id } : step;
            })
        );
        this.closeExercise();
    }

    protected closeExercise() {
        const opened = this.exerciseInEditor();
        this.exerciseInEditor.set(null);
        if (opened) {
            this.focusAfterRender(`step-${opened.stepKey}-exercise`);
        }
    }

    protected isExpanded(key: number): boolean {
        return this.expandedKeys().has(key);
    }

    /** Opens or closes one step. Its button stays in place, so focus stays on it. */
    protected toggleStep(key: number) {
        this.expandedKeys.update((keys) => {
            const next = new Set(keys);
            if (!next.delete(key)) {
                next.add(key);
            }
            return next;
        });
    }

    protected setAllExpanded(expanded: boolean) {
        this.expandedKeys.set(expanded ? this.allKeys() : new Set());
    }

    protected addStep(kind: StepKind) {
        if (this.stepCount() >= MAX_STEPS) {
            return;
        }
        const step = this.stepModel(
            kind === 'reps' ? { kind, reps: 0, name: '' } : { kind, seconds: 0, name: '' }
        );
        this.updateSteps((steps) => [...steps, step]);
        // Only the new step is opened, keeping the rest of the list short
        this.expandedKeys.set(new Set([step.key]));
        this.stepAnnouncement.set(
            `Added a ${{ work: 'timed', rest: 'rest', reps: 'rep' }[kind]} step, step ${this.stepCount()}`
        );
        this.focusAfterRender(`step-${step.key}-name`);
    }

    /** The up and down buttons, for keyboard and screen reader users (and anyone else). */
    protected moveStep(index: number, by: -1 | 1) {
        const target = index + by;
        const moved = this.moveStepTo(index, target);
        if (!moved) {
            return;
        }
        // Focus follows the step to its new place: the same button, or the other move
        // button if that one has just been disabled (at the top or bottom)
        const atEnd = by === -1 ? target === 0 : target === this.stepCount() - 1;
        const button = by === -1 ? (atEnd ? 'down' : 'up') : atEnd ? 'up' : 'down';
        this.focusAfterRender(`step-${moved.key}-${button}`);
    }

    /** A step dragged by its handle and dropped in a new place. */
    protected dropStep(event: CdkDragDrop<unknown>) {
        this.moveStepTo(event.previousIndex, event.currentIndex);
    }

    /** Moves a step to a new position and says so. Returns the step, or null if it can't move. */
    private moveStepTo(from: number, to: number): StepModel | null {
        const steps = [...this.model().steps];
        if (from === to || to < 0 || to >= steps.length) {
            return null;
        }
        moveItemInArray(steps, from, to);
        this.updateSteps(() => steps);
        const moved = steps[to];
        this.stepAnnouncement.set(
            `Moved ${moved.name.trim() || kindName(moved.kind).toLowerCase()} to step ${to + 1}`
        );
        return moved;
    }

    /** The X button: deletes an empty step straight away, and asks first about anything else. */
    protected deleteStep(index: number) {
        const step = this.model().steps[index];
        const isSet =
            step.kind === 'reps'
                ? step.reps > 0 || step.weight > 0
                : step.minutes > 0 || step.seconds > 0;
        if (!step.name.trim() && !isSet) {
            this.removeStep(index);
        } else {
            const time = isSet ? `, set to ${this.amountText(step)}` : '';
            this.stepPendingDelete.set({
                index,
                description: `This will remove ${this.stepTitle(index)}${time}.`,
            });
        }
    }

    protected confirmDeleteStep() {
        const pending = this.stepPendingDelete();
        this.stepPendingDelete.set(null);
        if (pending) {
            this.removeStep(pending.index);
        }
    }

    protected cancelDeleteStep() {
        const pending = this.stepPendingDelete();
        this.stepPendingDelete.set(null);
        if (pending) {
            this.focusAfterRender(`step-${this.model().steps[pending.index].key}-delete`);
        }
    }

    private removeStep(index: number) {
        const deleted = this.model().steps[index];
        this.updateSteps((all) => all.filter((step) => step.key !== deleted.key));
        this.stepAnnouncement.set(`Deleted step ${index + 1}`);
        // Focus the step that took its place, or the one before if it was last: its delete
        // button, or its open button if it's collapsed (and so has no delete button). With
        // none left, the first Add button.
        const remaining = this.model().steps;
        const next = remaining[Math.min(index, remaining.length - 1)];
        if (!next) {
            this.focusAfterRender('add-timed');
            return;
        }
        this.focusAfterRender(
            `step-${next.key}-${this.isExpanded(next.key) ? 'delete' : 'toggle'}`
        );
    }

    private updateSteps(change: (steps: StepModel[]) => StepModel[]) {
        this.model.update((setup) => ({ ...setup, steps: change(setup.steps) }));
    }

    private focusAfterRender(id: string) {
        afterNextRender(() => document.getElementById(id)?.focus(), { injector: this.injector });
    }

    private allKeys(): Set<number> {
        return new Set(this.model().steps.map((step) => step.key));
    }

    private stepModel(step: Step): StepModel {
        const seconds = step.kind === 'reps' ? 0 : step.seconds;
        return {
            key: this.nextKey++,
            kind: step.kind,
            name: step.name,
            minutes: Math.floor(seconds / 60),
            seconds: seconds % 60,
            reps: step.kind === 'reps' ? step.reps : 0,
            weight:
                step.kind === 'reps' && step.weight ? weightIn(step.weight, this.weightUnit) : 0,
            savedWeight: (step.kind === 'reps' && step.weight) || null,
            exerciseId: step.exerciseId ?? '',
        };
    }

    // A new workout starts with no steps, just the Add buttons
    private emptySetup(): WorkoutSetupModel {
        return { title: '', steps: [], repeats: 1 };
    }

    private findWorkoutToEdit(params: ParamMap): Workout | null {
        const editId = params.get('editId');
        return editId ? this.workoutStore.findWorkoutById(editId) : null;
    }

    private async saveAndStart(): Promise<void> {
        const { title, steps, repeats } = this.model();
        const workout: WorkoutFields = { title, steps: toSteps(steps, this.weightUnit), repeats };

        const editingId = this.editingWorkoutId();
        const savedWorkout = editingId
            ? (this.workoutStore.updateWorkout(editingId, workout) ??
              this.workoutStore.addWorkout(workout))
            : this.workoutStore.addWorkout(workout);

        this.load(null);
        this.run.start(savedWorkout);
        await this.router.navigate(['/workout']);
    }
}

/**
 * The steps to save: whole seconds, trimmed names, weights in kg and any exercise picked,
 * leaving out any left at 0:00 or 0 reps.
 */
function toSteps(steps: readonly StepModel[], unit: WeightUnit): Step[] {
    return steps
        .map(
            (step): Step =>
                step.kind === 'reps'
                    ? {
                          kind: 'reps',
                          reps: step.reps,
                          name: step.name.trim(),
                          ...(step.weight > 0 ? { weight: savedWeight(step, unit) } : {}),
                          ...(step.exerciseId ? { exerciseId: step.exerciseId } : {}),
                      }
                    : {
                          kind: step.kind,
                          seconds: step.minutes * 60 + step.seconds,
                          name: step.name.trim(),
                          ...(step.kind === 'work' && step.exerciseId
                              ? { exerciseId: step.exerciseId }
                              : {}),
                      }
        )
        .filter((step) => (step.kind === 'reps' ? step.reps > 0 : step.seconds > 0));
}

/** A rep step's weight in kg: as it was saved, if the wheel hasn't moved, so it isn't rounded. */
function savedWeight(step: StepModel, unit: WeightUnit): number {
    return step.savedWeight !== null && weightIn(step.savedWeight, unit) === step.weight
        ? step.savedWeight
        : weightToKg(step.weight, unit);
}
