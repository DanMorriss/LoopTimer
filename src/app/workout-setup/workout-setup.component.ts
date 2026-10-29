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
    MAX_HEADING_LENGTH,
    MAX_HEADINGS,
    MAX_REPS,
    MAX_STEPS,
    RepStep,
    Step,
    stepForSet,
    StepKind,
    TimedStep,
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

/** What a row in Create is: a kind of step, or a heading (BLD-13). */
type ItemKind = StepKind | 'heading';

/**
 * One step as the form holds it: minutes and seconds for a timed step's two wheels, or
 * reps and weight for a rep step's. A step keeps them all, and only uses those for its kind.
 * A heading is a row of its own kind, with its text as its name and nothing else used.
 */
interface StepModel {
    /** Stays with the step as it moves, for tracking and element ids. */
    key: number;
    kind: ItemKind;
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
    /**
     * Vary each set (BLD-11): each set has its own row of reps and weight, or time, in
     * `setRows`, set 1's being the step's. Only with more than one set, and not for rest.
     */
    vary: boolean;
    /** A row for each set while `vary` is on, as many as `sets`; empty while it's off. */
    setRows: SetRowModel[];
}

/** One set's own amount, as a step holds its own: reps and weight, or minutes and seconds. */
interface SetRowModel {
    reps: number;
    /** In the unit chosen in settings, to the nearest half; 0 for none. */
    weight: number;
    /** As a step's `savedWeight`: the weight as saved, in kg, or null for a new row. */
    savedWeight: number | null;
    minutes: number;
    seconds: number;
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
    protected readonly maxHeadings = MAX_HEADINGS;
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
            // Long enough for a name (or a heading), short enough to fit on the workout
            applyEach(setup.steps, (step) =>
                maxLength(step.name, ({ valueOf }) =>
                    valueOf(step.kind) === 'heading' ? MAX_HEADING_LENGTH : MAX_EXERCISE_NAME_LENGTH
                )
            );
            // The wheels only offer valid times, so the one rule is that there's some work
            validate(setup, ({ value }) =>
                hasWork(allSteps({ blocks: toBlocks(value().steps, this.weightUnit) }))
                    ? undefined
                    : { kind: 'noTime', message: 'Workout needs a timed step or some reps' }
            );
            // ...that each set of a step whose sets vary has some, if the step's to be kept
            validate(setup, ({ value }) =>
                value().steps.some(
                    (step) =>
                        varies(step) &&
                        step.setRows.some((row) => !rowHasAmount(step, row)) &&
                        step.setRows.some((row) => rowHasAmount(step, row))
                )
                    ? { kind: 'noSetAmount', message: 'Each set needs some reps or time' }
                    : undefined
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

    /** Steps, which count towards MAX_STEPS; headings don't. */
    protected readonly stepCount = computed(
        () => this.model().steps.filter((step) => step.kind !== 'heading').length
    );
    protected readonly headingCount = computed(
        () => this.model().steps.filter((step) => step.kind === 'heading').length
    );
    /** Steps and headings, the rows of the list. */
    protected readonly itemCount = computed(() => this.model().steps.length);
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

    /** The set row open on its wheels (BLD-11), as `key-set`, if one is: one at a time. */
    protected readonly openSetRow = signal<string | null>(null);

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

    protected readonly noSetAmountError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noSetAmount')
    );

    protected readonly noTimeLimitError = computed(() =>
        this.workoutForm()
            .errors()
            .find((error) => error.kind === 'noTimeLimit')
    );

    // Not until something's been put in a step: a new workout opens with an empty one
    protected readonly noTimeError = computed(() =>
        this.model()
            .steps.filter((step) => step.kind !== 'heading')
            .every((step) => !step.name.trim() && !hasAmount(step))
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

    /** A step's number, counting steps only, as headings aren't steps. */
    protected stepNumber(index: number): number {
        return this.stepNumbers()[index];
    }

    /** Each row's step number, a heading having the number of the step before it. */
    private readonly stepNumbers = computed(() => {
        let count = 0;
        return this.model().steps.map((step) => (step.kind === 'heading' ? count : ++count));
    });

    /**
     * How a step is named to screen readers, e.g. "Step 2, rest" or "Step 1, Squats"; a
     * heading is "Heading, Warmup".
     */
    protected stepTitle(index: number): string {
        const step = this.model().steps[index];
        if (step.kind === 'heading') {
            return step.name.trim() ? `Heading, ${step.name.trim()}` : 'Heading';
        }
        return `Step ${this.stepNumber(index)}, ${step.name.trim() || stepKindName(step.kind).toLowerCase()}`;
    }

    /**
     * How much of a step there is, as its wheels show it: e.g. "02:15", "20 reps", or
     * "10 reps @ 60 kg", and "each side" for one done each side.
     */
    protected amountText(step: StepModel): string {
        if (step.kind === 'heading') {
            return '';
        }
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
        // As the history says sets, e.g. "3 × 10 @ 60 kg", or each set's where they vary, e.g.
        // "12, 10, 8 @ 40–50 kg", with the rest between them
        const amount = varies(step)
            ? this.variedText(step)
            : `${step.sets} × ${step.kind === 'reps' ? `${step.reps}${weight}` : time}`;
        const rest = step.restMinutes * 60 + step.restSeconds;
        const restText =
            rest > 0 ? ` · rest ${padded(step.restMinutes)}:${padded(step.restSeconds)}` : '';
        return `${amount}${eachSide}${restText}`;
    }

    /** Sets that vary, e.g. "12, 10, 8 @ 40–50 kg", or "00:30, 00:45, 01:00". */
    private variedText(step: StepModel): string {
        const rows = step.setRows;
        if (step.kind !== 'reps') {
            return rows.map(rowTime).join(', ');
        }
        const weights = rows.map((row) => row.weight).filter((weight) => weight > 0);
        const low = Math.min(...weights);
        const high = Math.max(...weights);
        const weight =
            weights.length === 0
                ? ''
                : ` @ ${low === high ? low : `${low}–${high}`} ${this.weightUnit}`;
        return `${rows.map((row) => row.reps).join(', ')}${weight}`;
    }

    /** A set's row, e.g. "Set 2 · 10 × 45 kg", "Set 2 · 10 reps" or "Set 2 · 00:45". */
    protected setRowText(step: StepModel, set: number): string {
        const row = step.setRows[set];
        if (step.kind !== 'reps') {
            return `Set ${set + 1} · ${rowTime(row)}`;
        }
        if (row.weight > 0) {
            return `Set ${set + 1} · ${row.reps} × ${row.weight} ${this.weightUnit}`;
        }
        return `Set ${set + 1} · ${row.reps === 1 ? '1 rep' : `${row.reps} reps`}`;
    }

    /**
     * The Sets wheel. With Vary each set on, a set added copies the last one's row, and one
     * taken away goes from the end; down to 1 set, there's nothing to vary, so it goes off.
     */
    protected setSets(index: number, sets: number) {
        const changed = this.model().steps[index];
        if (changed.sets === sets) {
            return;
        }
        if (!changed.vary) {
            this.updateStep(changed.key, (step) => ({ ...step, sets }));
            return;
        }
        if (sets < 2) {
            this.updateStep(changed.key, (step) => ({ ...varyOff(step), sets }));
            return;
        }
        this.smoothChange(() =>
            this.updateStep(changed.key, (step) => ({
                ...step,
                sets,
                setRows: Array.from(
                    { length: sets },
                    // A copy of its fields, not a spread: the form tracks a row by the object
                    (_, i) => step.setRows[i] ?? rowOf(step.setRows.at(-1)!)
                ),
            }))
        );
    }

    /**
     * The Vary each set switch: on, every set starts as the step is, a row each; off, every
     * set goes back to set 1's.
     */
    protected setVary(index: number, on: boolean) {
        const changed = this.model().steps[index];
        this.openSetRow.set(null);
        this.smoothChange(() =>
            this.updateStep(changed.key, (step) =>
                on
                    ? {
                          ...step,
                          vary: true,
                          setRows: Array.from({ length: step.sets }, () => rowOf(step)),
                      }
                    : varyOff(step)
            )
        );
    }

    protected isSetRowOpen(key: number, set: number): boolean {
        return this.openSetRow() === `${key}-${set}`;
    }

    /** Opens a set's row on its wheels, closing any other; or closes it. Rows slide to fit. */
    protected toggleSetRow(key: number, set: number) {
        const id = `${key}-${set}`;
        this.smoothChange(() => this.openSetRow.update((open) => (open === id ? null : id)));
    }

    private updateStep(key: number, change: (step: StepModel) => StepModel) {
        this.updateSteps((steps) => steps.map((step) => (step.key === key ? change(step) : step)));
    }

    /**
     * The exercise a work or rep step is: the one picked for it, or else the one its name
     * means, as it would be linked when saved. Undefined for a rest step, an unnamed one, or
     * a name no exercise has yet.
     */
    protected exerciseFor(step: StepModel): Exercise | undefined {
        if (step.kind === 'rest' || step.kind === 'heading') {
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
                        step.kind !== 'heading' &&
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
        changeSmoothly(
            this.host.nativeElement,
            'form > *, .step, .wheel-row',
            this.injector,
            change
        );
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

    /**
     * Adds a heading at the end, e.g. "Warmup", opened with the cursor in its box. Headings
     * aren't steps, so they have a limit of their own.
     */
    protected addHeading() {
        if (this.headingCount() >= MAX_HEADINGS) {
            return;
        }
        const heading: StepModel = { ...this.newStep(), kind: 'heading' };
        this.updateSteps((steps) => [...steps, heading]);
        this.expandedKeys.set(new Set([heading.key]));
        this.stepAnnouncement.set('Added a heading');
        this.focusAfterRender(`step-${heading.key}-name`);
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
        const atEnd = by === -1 ? target === 0 : target === this.itemCount() - 1;
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
        if (moved.kind === 'heading') {
            // Said by what's after it now, as a heading isn't numbered
            const after = steps.slice(to + 1).findIndex((step) => step.kind !== 'heading');
            const place =
                after === -1 ? 'the end' : `before step ${this.stepNumber(to + 1 + after)}`;
            this.stepAnnouncement.set(`Moved ${this.stepTitle(to).toLowerCase()} to ${place}`);
            return moved;
        }
        this.stepAnnouncement.set(
            `Moved ${moved.name.trim() || stepKindName(moved.kind).toLowerCase()} to step ${this.stepNumber(to)}`
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
                this.stepAnnouncement.set(
                    step.kind === 'heading'
                        ? `${this.stepTitle(index)} is back`
                        : `Step ${this.stepNumber(index)} is back`
                );
                this.focusAfterRender(
                    `step-${step.key}-${this.isExpanded(step.key) ? 'delete' : 'toggle'}`
                );
            },
            dismissed: () => this.focusAfterDelete(index),
        });
    }

    private removeStep(index: number) {
        const deleted = this.model().steps[index];
        const said =
            deleted.kind === 'heading'
                ? 'Deleted a heading'
                : `Deleted step ${this.stepNumber(index)}`;
        this.updateSteps((all) => all.filter((step) => step.key !== deleted.key));
        this.stepAnnouncement.set(said);
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
     * A saved workout's steps and headings as the form holds them, each step with its group's
     * sets and rest. A group of one step is an exercise and its sets; one of several (only from
     * a file, until supersets can be made here) has its rounds given to each of them.
     */
    private stepModels(workout: Workout): StepModel[] {
        return workout.blocks.flatMap((block) =>
            block.kind === 'group'
                ? block.steps.map((step) => ({
                      ...this.stepModel(
                          step,
                          block.rounds,
                          block.rounds > 1 ? block.restSeconds : 60
                      ),
                      ...this.setRowModels(step),
                  }))
                : [{ ...this.newStep(), kind: 'heading' as const, name: block.text }]
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
            vary: false,
            setRows: [],
        };
    }

    /** A step's sets as rows, where they vary (BLD-11). */
    private setRowModels(step: Step): Pick<StepModel, 'vary' | 'setRows'> {
        if (step.kind === 'rest' || !step.sets) {
            return { vary: false, setRows: [] };
        }
        return {
            vary: true,
            setRows: step.sets.map((_, set) => rowOf(this.stepModel(stepForSet(step, set)))),
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

/** Whether a step has a time, reps or a weight, as its kind uses. A heading has none. */
function hasAmount(step: StepModel): boolean {
    if (step.kind === 'heading') {
        return false;
    }
    // Where its sets vary, its rows have them, and its own are left as they were
    return (varies(step) ? step.setRows : [step]).some((row) =>
        step.kind === 'reps' ? row.reps > 0 || row.weight > 0 : row.minutes > 0 || row.seconds > 0
    );
}

/** Whether a step's sets each have their own row (BLD-11): only with more than one set. */
function varies(step: StepModel): boolean {
    return step.vary && step.sets > 1 && (step.kind === 'reps' || step.kind === 'work');
}

/**
 * A row for a set as the step (or another row) has it. Its fields only: a spread would copy
 * the hidden key the form tracks an array's rows by, and two rows can't share one.
 */
function rowOf({ reps, weight, savedWeight, minutes, seconds }: SetRowModel): SetRowModel {
    return { reps, weight, savedWeight, minutes, seconds };
}

/** Vary each set off: every set back to set 1's, which is the step's own again. */
function varyOff(step: StepModel): StepModel {
    const [first] = step.setRows;
    return { ...step, ...(first ? rowOf(first) : {}), vary: false, setRows: [] };
}

/** Whether a set's row has reps, or a time, as its step's kind uses. */
function rowHasAmount(step: StepModel, row: SetRowModel): boolean {
    return step.kind === 'reps' ? row.reps > 0 : row.minutes > 0 || row.seconds > 0;
}

function rowTime(row: SetRowModel): string {
    return `${padded(row.minutes)}:${padded(row.seconds)}`;
}

function timeLimitSeconds(setup: WorkoutSetupModel): number {
    return setup.limitMinutes * 60 + setup.limitSeconds;
}

/**
 * The workout to save, a group for each step with its sets and the rest between them, and its
 * headings, trimmed, in their places. Steps left at 0:00 or 0 reps are left out, and so are
 * headings left empty. A run of steps of one set runs as a circuit's round always has, each
 * straight after the last.
 */
function toBlocks(steps: readonly StepModel[], unit: WeightUnit): Block[] {
    return steps.flatMap((model): Block[] => {
        if (model.kind === 'heading') {
            const text = model.name.trim();
            return text ? [{ kind: 'heading', text }] : [];
        }
        const step = toStep({ ...model, kind: model.kind }, unit);
        if (step.kind === 'reps' ? step.reps === 0 : step.seconds === 0) {
            return [];
        }
        // A set row left at 0 reps or 00:00 is stopped by the form's check before saving
        const sets = step.kind === 'rest' ? 1 : model.sets;
        return [
            {
                kind: 'group',
                rounds: sets,
                restSeconds: sets > 1 ? model.restMinutes * 60 + model.restSeconds : 0,
                steps: [step],
            },
        ];
    });
}

/**
 * A step to save: whole seconds, a trimmed name, a weight in kg, any exercise picked, and
 * each side if it's done each side.
 */
function toStep(model: StepModel & { kind: StepKind }, unit: WeightUnit): Step {
    if (varies(model)) {
        // Set 1's is the step's own, so it reads as a whole step
        const rows = model.setRows.map((row) => toStep({ ...model, ...row, vary: false }, unit));
        const first = rows[0];
        return first.kind === 'reps'
            ? {
                  ...first,
                  sets: rows.map((row) => {
                      const { reps, weight } = row as RepStep;
                      return { reps, ...(weight === undefined ? {} : { weight }) };
                  }),
              }
            : { ...first, sets: rows.map((row) => ({ seconds: (row as TimedStep).seconds })) };
    }
    const step = model;
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
