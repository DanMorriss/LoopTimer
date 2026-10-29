import {
    afterNextRender,
    Component,
    computed,
    effect,
    ElementRef,
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
import { StepDragPreviewComponent } from './step-drag-preview/step-drag-preview.component';
import { StepKindMenuComponent } from './step-kind-menu/step-kind-menu.component';
import {
    hasWork,
    MAX_REPEATS,
    allSteps,
    Block,
    MAX_REPS,
    MAX_STEPS,
    Step,
    StepKind,
    stepKindName,
    Workout,
    WorkoutFields,
    UNTIL_STOPPED,
} from '../models/workout';
import { WeightUnit, weightIn, weightOptions, weightToKg } from '../models/weight';
import { Exercise, isBuiltIn, MAX_EXERCISE_NAME_LENGTH } from '../models/exercise';
import { findByName } from '../models/exercise-links';
import { ExerciseEditorComponent } from '../shared/components/exercise-editor/exercise-editor.component';
import { ExerciseDetailsDialogComponent } from '../shared/components/exercise-details-dialog/exercise-details-dialog.component';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { ExercisePickerComponent } from './exercise-picker/exercise-picker.component';
import { InfinitySwitchComponent } from '../shared/components/infinity-switch/infinity-switch.component';
import { ToggleSwitchComponent } from '../shared/components/toggle-switch/toggle-switch.component';
import { UndoService } from '../shared/undo/undo.service';
import { changeSmoothly } from '../shared/layout-change';
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
    /** How many times a work or rep step runs, 1 to MAX_REPEATS. A rest step runs once. */
    sets: number;
    /**
     * The rest between sets, for its two wheels: used once there's more than one set, and
     * 1:00 until it's set, so it starts there the first time Sets goes above 1.
     */
    restMinutes: number;
    restSeconds: number;
    /** Done one side at a time, each set running both sides (BLD-10). Not for a rest step. */
    eachSide: boolean;
}

/** How a workout goes on: a number of rounds (or until stopped), or a time limit. */
export type RepeatMode = 'rounds' | 'time';

/** The form's values. */
interface WorkoutSetupModel {
    title: string;
    steps: StepModel[];
    repeats: number;
    repeatMode: RepeatMode;
    /** The time limit, kept while Rounds is picked, so going back to Time limit finds it. */
    limitMinutes: number;
    limitSeconds: number;
}

/** A new time limit, until one's picked: a common length for as many rounds as possible. */
const DEFAULT_TIME_LIMIT_MINUTES = 20;

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
    host: {
        '(document:click)': 'closePopups($event)',
    },
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
        ToggleSwitchComponent,
        ExercisePickerComponent,
        ExerciseEditorComponent,
        ExerciseDetailsDialogComponent,
        StepDragPreviewComponent,
        StepKindMenuComponent,
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
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly exercises = inject(ExerciseStore);
    /** Weights are shown and picked in this, and saved in kg. */
    protected readonly weightUnit = inject(SettingsStore).weightUnit();

    protected readonly maxSteps = MAX_STEPS;
    /** In the order the kind menu lists them. */
    protected readonly editingWorkoutId = signal<string | null>(null);
    protected readonly minuteOptions = pickerOptions(0, 99, padded);
    protected readonly secondOptions = pickerOptions(0, 59, padded);
    protected readonly repOptions = pickerOptions(0, MAX_REPS, String);
    protected readonly setOptions = pickerOptions(1, MAX_REPEATS, String);
    protected readonly weightOptions = weightOptions(this.weightUnit);
    protected readonly nameExamples = NAME_EXAMPLES;
    protected readonly isBuiltIn = isBuiltIn;
    // 1-30, then ∞ at the end of the wheel
    protected readonly repeatOptions: WheelPickerOption[] = [
        ...pickerOptions(1, MAX_REPEATS, String),
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
                hasWork(allSteps({ blocks: toBlocks(value().steps, this.weightUnit) }))
                    ? undefined
                    : { kind: 'noTime', message: 'Workout needs a timed step or some reps' }
            );
            // ...and that a time limit has some time in it
            validate(setup, ({ value }) =>
                value().repeatMode === 'time' && timeLimitSeconds(value()) === 0
                    ? { kind: 'noTimeLimit', message: 'Time limit needs to be longer than 00:00' }
                    : undefined
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
    protected readonly repeatMode = computed(() => this.model().repeatMode);
    protected readonly repeatModes: { value: RepeatMode; label: string }[] = [
        { value: 'rounds', label: 'Rounds' },
        { value: 'time', label: 'Time limit' },
    ];
    protected readonly chosenRepeatIndex = computed(() =>
        this.repeatModes.findIndex((mode) => mode.value === this.repeatMode())
    );
    // The last number of rounds picked, so turning the switch off goes back to it
    private lastRounds = 1;

    /** Whether the tooltip by the Steps heading is showing. */
    protected readonly infoOpen = signal(false);

    /** The key of the step whose kind menu is open, if one is. */
    protected readonly kindMenuFor = signal<number | null>(null);

    /** Read out by screen readers after a step is added, moved, changed or deleted. */
    protected readonly stepAnnouncement = signal('');
    private readonly undo = inject(UndoService);

    /** The exercise open in the editor, and the step it was opened from. */
    /** The exercise whose details are showing, and the step they were opened from. */
    protected readonly exerciseInDetails = signal<{ exercise: Exercise; stepKey: number } | null>(
        null
    );
    protected readonly exerciseInEditor = signal<{ exercise: Exercise; stepKey: number } | null>(
        null
    );

    protected readonly noTimeLimitError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noTimeLimit')
    );

    // Not until something's been put in a step: a new workout opens with an empty one
    protected readonly noTimeError = computed(() =>
        this.model().steps.every((step) => !step.name.trim() && !hasAmount(step))
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
        this.kindMenuFor.set(null);
        if (workoutToEdit) {
            const limit = workoutToEdit.timeLimitSeconds;
            this.model.set({
                title: workoutToEdit.title,
                steps: this.stepModels(workoutToEdit),
                // A time limit is saved with UNTIL_STOPPED, which Rounds shouldn't start on
                repeats: limit === undefined ? workoutToEdit.repeats : 1,
                repeatMode: limit === undefined ? 'rounds' : 'time',
                limitMinutes:
                    limit === undefined ? DEFAULT_TIME_LIMIT_MINUTES : Math.floor(limit / 60),
                limitSeconds: limit === undefined ? 0 : limit % 60,
            });
            // A saved workout opens as a list of summaries, so the whole workout fits on screen
            this.expandedKeys.set(new Set());
        } else {
            this.model.set(this.emptySetup());
            this.expandedKeys.set(this.allKeys());
        }
    }

    protected setRepeatMode(repeatMode: RepeatMode) {
        this.model.update((setup) => ({ ...setup, repeatMode }));
    }

    protected setUntilStopped(on: boolean) {
        const repeats = on ? UNTIL_STOPPED : this.lastRounds;
        this.model.update((setup) => ({ ...setup, repeats }));
    }

    /** How a step is named to screen readers, e.g. "Step 2, rest" or "Step 1, Squats". */
    protected stepTitle(index: number): string {
        const step = this.model().steps[index];
        return `Step ${index + 1}, ${step.name.trim() || stepKindName(step.kind).toLowerCase()}`;
    }

    /**
     * How much of a step there is, as its wheels show it: e.g. "02:15", "20 reps", or
     * "10 reps @ 60 kg", and "each side" for one done each side.
     */
    protected amountText(step: StepModel): string {
        const sets = step.kind !== 'rest' && step.sets > 1;
        const eachSide = step.kind !== 'rest' && step.eachSide ? ' each side' : '';
        const weight = step.weight > 0 ? ` @ ${step.weight} ${this.weightUnit}` : '';
        const time = `${padded(step.minutes)}:${padded(step.seconds)}`;
        if (!sets) {
            if (step.kind === 'reps') {
                return `${step.reps === 1 ? '1 rep' : `${step.reps} reps`}${weight}${eachSide}`;
            }
            return `${time}${eachSide}`;
        }
        // As the history says sets, e.g. "3 × 10 @ 60 kg", with the rest between them
        const amount = step.kind === 'reps' ? `${step.reps}${weight}` : time;
        const rest = step.restMinutes * 60 + step.restSeconds;
        const restText =
            rest > 0 ? ` · rest ${padded(step.restMinutes)}:${padded(step.restSeconds)}` : '';
        return `${step.sets} × ${amount}${eachSide}${restText}`;
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
        this.smoothChange(() =>
            this.expandedKeys.update((keys) => {
                const next = new Set(keys);
                if (!next.delete(key)) {
                    next.add(key);
                }
                return next;
            })
        );
    }

    protected setAllExpanded(expanded: boolean) {
        this.smoothChange(() => this.expandedKeys.set(expanded ? this.allKeys() : new Set()));
    }

    /**
     * Opens or closes steps with the steps and everything under them sliding to their new
     * places, rather than the page jumping (and rather than animating a step's height, which
     * would lay the page out again every frame).
     */
    private smoothChange(change: () => void) {
        changeSmoothly(this.host.nativeElement, 'form > *, .step', this.injector, change);
    }

    /** Adds a rep step, the most common kind; its kind pill changes it. */
    protected addStep() {
        if (this.stepCount() >= MAX_STEPS) {
            return;
        }
        const step = this.newStep();
        this.updateSteps((steps) => [...steps, step]);
        // Only the new step is opened, keeping the rest of the list short
        this.expandedKeys.set(new Set([step.key]));
        this.stepAnnouncement.set(`Added a rep step, step ${this.stepCount()}`);
        this.focusAfterRender(`step-${step.key}-name`);
    }

    protected toggleKindMenu(key: number) {
        this.kindMenuFor.update((open) => (open === key ? null : key));
    }

    /**
     * Changes a step's kind. Its name, exercise and numbers stay, so changing it back
     * finds them again; only those for its new kind are used.
     */
    protected setStepKind(index: number, kind: StepKind) {
        const changed = this.model().steps[index];
        this.kindMenuFor.set(null);
        this.focusAfterRender(`step-${changed.key}-kind`);
        if (changed.kind === kind) {
            return;
        }
        this.updateSteps((steps) =>
            steps.map((step) => (step.key === changed.key ? { ...step, kind } : step))
        );
        this.stepAnnouncement.set(`Step ${index + 1} is now ${stepKindName(kind).toLowerCase()}`);
    }

    /** A click anywhere outside the open kind menu or the tooltip closes it. */
    protected closePopups(event: MouseEvent) {
        const target = event.target instanceof Element ? event.target : null;
        if (!target?.closest('app-step-kind-menu')) {
            this.kindMenuFor.set(null);
        }
        if (!target?.closest('.info')) {
            this.infoOpen.set(false);
        }
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

    /**
     * Where a step's handle was grabbed, from the step's top left (px). The CDK puts a custom
     * preview's top left corner at the pointer, so the preview is moved back by this much,
     * keeping the pointer where it took hold rather than jumping to the corner.
     */
    protected readonly grabbedAt = signal({ x: 0, y: 0 });

    protected grabStep(event: PointerEvent) {
        const step = (event.currentTarget as Element).closest('.step')?.getBoundingClientRect();
        if (step) {
            this.grabbedAt.set({ x: event.clientX - step.left, y: event.clientY - step.top });
        }
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
            `Moved ${moved.name.trim() || stepKindName(moved.kind).toLowerCase()} to step ${to + 1}`
        );
        return moved;
    }

    /**
     * The X button: deletes the step straight away. One with anything in it can be put back:
     * the Undo bar offers it (UndoService), rather than a question first.
     */
    protected deleteStep(index: number) {
        const step = this.model().steps[index];
        const isSet = hasAmount(step);
        const title = this.stepTitle(index);
        if (!step.name.trim() && !isSet) {
            this.removeStep(index);
            this.focusAfterDelete(index);
            return;
        }
        this.removeStep(index);
        const time = isSet ? `, ${this.amountText(step)}` : '';
        this.undo.offerUndo({
            message: `Deleted ${title}${time}`,
            undo: () => {
                this.updateSteps((all) => [...all.slice(0, index), step, ...all.slice(index)]);
                this.stepAnnouncement.set(`Step ${index + 1} is back`);
                this.focusAfterRender(
                    `step-${step.key}-${this.isExpanded(step.key) ? 'delete' : 'toggle'}`
                );
            },
            dismissed: () => this.focusAfterDelete(index),
        });
    }

    private removeStep(index: number) {
        const deleted = this.model().steps[index];
        this.updateSteps((all) => all.filter((step) => step.key !== deleted.key));
        this.stepAnnouncement.set(`Deleted step ${index + 1}`);
    }

    /**
     * After step `index` goes, focus the step that took its place, or the one before if it was
     * last: its delete button, or its open button if it's collapsed (and so has no delete
     * button). With none left, the Add button.
     */
    private focusAfterDelete(index: number) {
        const remaining = this.model().steps;
        const next = remaining[Math.min(index, remaining.length - 1)];
        if (!next) {
            this.focusAfterRender('add-step');
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

    /**
     * A saved workout's steps as the form holds them, each with its group's sets and rest.
     * A group of one step is an exercise and its sets; one of several (only from a file, until
     * supersets can be made here) has its rounds given to each of them.
     */
    private stepModels(workout: Workout): StepModel[] {
        return workout.blocks.flatMap((block) =>
            block.kind === 'group'
                ? block.steps.map((step) =>
                      this.stepModel(step, block.rounds, block.rounds > 1 ? block.restSeconds : 60)
                  )
                : []
        );
    }

    private stepModel(step: Step, sets = 1, rest = 60): StepModel {
        const seconds = step.kind === 'reps' ? 0 : step.seconds;
        return {
            sets: step.kind === 'rest' ? 1 : sets,
            eachSide: step.kind !== 'rest' && step.eachSide === true,
            restMinutes: Math.floor(rest / 60),
            restSeconds: rest % 60,
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

    private newStep(): StepModel {
        return this.stepModel({ kind: 'reps', reps: 0, name: '' });
    }

    // A new workout starts with one rep step, ready to fill in or change to another kind
    private emptySetup(): WorkoutSetupModel {
        return {
            title: '',
            steps: [this.newStep()],
            repeats: 1,
            repeatMode: 'rounds',
            limitMinutes: DEFAULT_TIME_LIMIT_MINUTES,
            limitSeconds: 0,
        };
    }

    private findWorkoutToEdit(params: ParamMap): Workout | null {
        const editId = params.get('editId');
        return editId ? this.workoutStore.findWorkoutById(editId) : null;
    }

    private async saveAndStart(): Promise<void> {
        const setup = this.model();
        const { title, steps } = setup;
        // A time limit runs as many rounds as fit, so its rounds are UNTIL_STOPPED
        const workout: WorkoutFields =
            setup.repeatMode === 'time'
                ? {
                      title,
                      blocks: toBlocks(steps, this.weightUnit),
                      repeats: UNTIL_STOPPED,
                      timeLimitSeconds: timeLimitSeconds(setup),
                  }
                : {
                      title,
                      blocks: toBlocks(steps, this.weightUnit),
                      repeats: setup.repeats,
                  };

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

/** Whether a step has a time, reps or a weight, as its kind uses. */
function hasAmount(step: StepModel): boolean {
    return step.kind === 'reps'
        ? step.reps > 0 || step.weight > 0
        : step.minutes > 0 || step.seconds > 0;
}

function timeLimitSeconds(setup: WorkoutSetupModel): number {
    return setup.limitMinutes * 60 + setup.limitSeconds;
}

/**
 * The workout to save, a group for each step with its sets and the rest between them, leaving
 * out steps left at 0:00 or 0 reps. A run of steps of one set runs as a circuit's round
 * always has, each straight after the last.
 */
function toBlocks(steps: readonly StepModel[], unit: WeightUnit): Block[] {
    return steps
        .map((model) => ({ model, step: toStep(model, unit) }))
        .filter(({ step }) => (step.kind === 'reps' ? step.reps > 0 : step.seconds > 0))
        .map(({ model, step }) => {
            const sets = step.kind === 'rest' ? 1 : model.sets;
            return {
                kind: 'group',
                rounds: sets,
                restSeconds: sets > 1 ? model.restMinutes * 60 + model.restSeconds : 0,
                steps: [step],
            };
        });
}

/**
 * A step to save: whole seconds, a trimmed name, a weight in kg, any exercise picked, and
 * each side if it's done each side.
 */
function toStep(step: StepModel, unit: WeightUnit): Step {
    const eachSide = step.kind !== 'rest' && step.eachSide ? { eachSide: true as const } : {};
    return step.kind === 'reps'
        ? {
              kind: 'reps',
              reps: step.reps,
              name: step.name.trim(),
              ...(step.weight > 0 ? { weight: savedWeight(step, unit) } : {}),
              ...(step.exerciseId ? { exerciseId: step.exerciseId } : {}),
              ...eachSide,
          }
        : {
              kind: step.kind,
              seconds: step.minutes * 60 + step.seconds,
              name: step.name.trim(),
              ...(step.kind === 'work' && step.exerciseId ? { exerciseId: step.exerciseId } : {}),
              ...eachSide,
          };
}

/** A rep step's weight in kg: as it was saved, if the wheel hasn't moved, so it isn't rounded. */
function savedWeight(step: StepModel, unit: WeightUnit): number {
    return step.savedWeight !== null && weightIn(step.savedWeight, unit) === step.weight
        ? step.savedWeight
        : weightToKg(step.weight, unit);
}
