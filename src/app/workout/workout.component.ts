import {
    afterNextRender,
    Component,
    computed,
    ElementRef,
    inject,
    Injector,
    signal,
    viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { MAX_REPS, RepStep, runsUntilStopped, Step } from '../models/workout';
import { formatWeight, weightIn, weightOptions, weightToKg } from '../models/weight';
import { WheelPickerComponent } from '../shared/components/wheel-picker/wheel-picker.component';
import { WorkoutSummaryComponent } from './workout-summary/workout-summary.component';
import { AlarmService } from '../shared/alarms/alarm.service';
import { MatIconModule } from '@angular/material/icon';
import { formatTime } from '../shared/format-time';
import { ActiveRunService } from '../shared/run/active-run.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';

// Space on one of these already does something, e.g. presses the focused button
const SPACE_HANDLED_BY =
    'button, a, input, textarea, select, [contenteditable], [role="button"], [role="spinbutton"]';

/** "Timed", "Rest" or "Reps": what an unnamed step is called. */
function kindName(step: Step): string {
    return { work: 'Timed', rest: 'Rest', reps: 'Reps' }[step.kind];
}

// Above this many rounds, the dots under "round 2 of 20" would wrap on a phone, so only the line shows
const MAX_ROUND_DOTS = 15;

/**
 * Shows the workout in progress and takes the user's presses. The run itself (its clock,
 * alarms and history) lives in ActiveRunService, so it carries on on any page of the app.
 */
@Component({
    selector: 'app-workout',
    imports: [RouterLink, MatIconModule, WheelPickerComponent, WorkoutSummaryComponent],
    templateUrl: './workout.component.html',
    styleUrls: ['./workout.component.scss'],
    host: {
        '(document:keydown.space)': 'onSpace($event)',
        '(document:keydown.escape)': 'onEscape()',
    },
})
export class WorkoutComponent {
    workoutStore = inject(WorkoutStore);
    private readonly router = inject(Router);
    private readonly injector = inject(Injector);
    private readonly run = inject(ActiveRunService);
    workout = this.run.workout;
    isPaused = this.run.isPaused;
    /** The summary is open over the page, so its keys are left to it. */
    summaryOpen = this.run.summaryOpen;
    private readonly state = this.run.state;
    private readonly nextState = this.run.nextState;

    protected readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);
    private readonly exercises = inject(ExerciseStore);
    /** Sound is on, but the browser is waiting for a tap before it will play any. */
    soundLocked = computed(
        () => this.alarms.supported && this.settings.sound() && !this.alarms.unlocked()
    );

    isWorkActive = computed(() => this.state()?.phase === 'work');
    isRestActive = computed(() => this.state()?.phase === 'rest');
    isRepsActive = computed(() => this.state()?.phase === 'reps');
    isComplete = computed(() => this.state()?.phase === 'complete');
    /** The rep step's count, e.g. 20, or 0 when it isn't a rep step. */
    reps = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? step.reps : 0;
    });
    /** The rep step's weight, e.g. "60 kg", or '' when there's none. */
    weight = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? this.weightText(step) : '';
    });
    // Changing the reps or weight of the rep step being waited on, e.g. going up a weight
    protected readonly repOptions = Array.from({ length: MAX_REPS }, (_, i) => ({
        value: i + 1,
        label: String(i + 1),
    }));
    protected readonly weightUnit = this.settings.weightUnit;
    protected readonly weightOptions = computed(() => weightOptions(this.weightUnit()));
    /** The rep step's weight as its wheel shows it, or 0 for none. */
    protected readonly weightValue = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' && step.weight ? weightIn(step.weight, this.weightUnit()) : 0;
    });
    /** Which rep set is being changed, so the wheels close by themselves on Done. */
    private readonly changingSet = signal<string | null>(null);
    private readonly currentSet = computed(() => {
        const state = this.state();
        return state?.phase === 'reps'
            ? `${this.workoutStore.activeRunStartedAt()}-${this.workoutStore.activeRepStepsDone()}`
            : null;
    });
    protected readonly changingReps = computed(
        () => this.currentSet() !== null && this.changingSet() === this.currentSet()
    );

    /** Rounds left, including the one in progress. */
    repeats = computed(() => this.state()?.roundsLeft ?? 0);
    untilStopped = computed(() => {
        const workout = this.workout();
        return workout !== null && runsUntilStopped(workout);
    });
    /** The round in progress, counting from 1. */
    roundNumber = computed(() => (this.state()?.round ?? 0) + 1);

    /** How many steps make up a round. */
    stepCount = computed(() => this.workout()?.steps.length ?? 0);
    /**
     * Whether to say which step it is. Only for rounds with more than one work or rep step:
     * a plain work-and-rest workout doesn't need "step 1 of 2".
     */
    showStepCount = computed(
        () => (this.workout()?.steps.filter((step) => step.kind !== 'rest').length ?? 0) > 1
    );
    /** The step in progress, counting from 1. */
    stepNumber = computed(() => (this.state()?.stepIndex ?? 0) + 1);
    /**
     * The step's name, or "Rest" or "Reps" for an unnamed one. Unnamed work shows just the
     * time.
     */
    stepLabel = computed(() => {
        const step = this.state()?.step;
        return step?.name || (step && step.kind !== 'work' ? kindName(step) : '');
    });
    /** Your note on the step's exercise (EXR-10), e.g. "Pause at the bottom", or ''. */
    exerciseNote = computed(() => {
        const step = this.state()?.step;
        return step?.exerciseId ? (this.exercises.noteFor(step.exerciseId) ?? '') : '';
    });
    /** e.g. "Plank · 00:45", "Squats · 10 reps @ 60 kg", or "finish" when the workout ends after this step. */
    upNext = computed(() => {
        const next = this.nextState();
        if (!next) {
            return '';
        }
        if (!next.step) {
            return 'finish';
        }
        const step = next.step;
        const name = step.name || kindName(step);
        if (step.kind === 'reps') {
            const weight = this.weightText(step);
            return `${name} · ${step.reps} reps${weight ? ` @ ${weight}` : ''}`;
        }
        return `${name} · ${formatTime(Math.floor(step.seconds / 60), step.seconds % 60)}`;
    });

    private readonly remaining = computed(() => this.state()?.remainingSeconds ?? 0);
    private readonly time = computed(() =>
        formatTime(Math.floor(this.remaining() / 60), this.remaining() % 60)
    );
    workTime = computed(() => (this.isWorkActive() ? this.time() : ''));
    restTime = computed(() => (this.isRestActive() ? this.time() : ''));

    /** How many rounds the workout runs for (0 when it runs until stopped). */
    totalRounds = computed(() => (this.untilStopped() ? 0 : (this.workout()?.repeats ?? 0)));

    /** One dot per round, for workouts short enough for a row of them to fit on a phone. */
    roundDots = computed((): ('done' | 'current' | 'left')[] => {
        const total = this.totalRounds();
        if (total > MAX_ROUND_DOTS) {
            return [];
        }
        const current = this.roundNumber() - 1;
        return Array.from({ length: total }, (_, i) => {
            if (i === current) {
                return 'current';
            }
            return i < current ? 'done' : 'left';
        });
    });

    // The ring sweep is a CSS animation that runs for the whole step, so the browser can
    // animate it without repainting. This only changes when a new step starts, which
    // recreates the ring element and restarts the animation from the right point.
    private readonly ringSweep = computed(
        () => {
            const state = this.state();
            // A rep step has no countdown, so its ring is full and still
            if (!state || state.phase === 'complete' || state.phase === 'reps') {
                return null;
            }
            const halfMs = (state.phaseSeconds * 1000) / 2;
            return {
                key: `${this.workoutStore.activeWorkoutStartedAt()}-${state.round}-${state.stepIndex}`,
                halfDuration: `${halfMs}ms`,
                // Negative delays start part-way through, e.g. when resuming after a refresh
                firstHalfDelay: `${-state.phaseElapsedMs}ms`,
                secondHalfDelay: `${halfMs - state.phaseElapsedMs}ms`,
            };
        },
        { equal: (a, b) => a?.key === b?.key }
    );

    ringSweeps = computed(() => {
        const sweep = this.ringSweep();
        return sweep ? [sweep] : [];
    });

    progress = computed(() => {
        const state = this.state();
        if (!state) {
            return 0;
        }
        if (state.phase === 'complete') {
            return 1;
        }
        // Nothing to measure while it waits for Done
        if (state.phase === 'reps') {
            return 0;
        }
        return 1 - state.remainingSeconds / state.phaseSeconds;
    });

    progressPercent = computed(() => Math.round(this.progress() * 100));

    /**
     * What screen readers announce. It only changes when a step starts, so the live region
     * speaks at the start of each step and at the end, not every second. With several
     * steps it says which one, so back-to-back steps of the same kind are each announced.
     */
    announcement = computed(() => {
        const state = this.state();
        const workout = this.workout();
        if (!state || !workout) {
            return '';
        }
        if (this.isPaused() && state.phase !== 'complete') {
            return 'Paused';
        }
        if (!state.step) {
            return 'Finished';
        }
        const parts = [state.step.name || kindName(state.step)];
        if (state.step.kind === 'reps') {
            const weight = this.weightText(state.step);
            parts.push(`${state.step.reps} reps${weight ? ` at ${weight}` : ''}`);
        }
        if (this.exerciseNote()) {
            parts.push(`your note: ${this.exerciseNote()}`);
        }
        if (this.showStepCount()) {
            parts.push(`step ${state.stepIndex + 1} of ${workout.steps.length}`);
        }
        // The round is given as each round starts
        if (state.stepIndex === 0) {
            if (this.untilStopped()) {
                parts.push(`round ${state.round + 1}`);
            } else if (state.roundsLeft === 1 && workout.repeats > 1) {
                parts.push('last round');
            } else {
                parts.push(`round ${state.round + 1} of ${workout.repeats}`);
            }
        }
        return parts.join(', ');
    });

    /** A rep step's weight in the unit chosen in settings, e.g. "60 kg", or '' for none. */
    private weightText(step: RepStep): string {
        return step.weight ? formatWeight(step.weight, this.settings.weightUnit()) : '';
    }

    /** What was left when paused, e.g. "00:23" or "20 reps". */
    pausedOn = computed(() => (this.isRepsActive() ? `${this.reps()} reps` : this.time()));

    private readonly mainButton = viewChild<ElementRef<HTMLButtonElement>>('mainButton');
    private readonly resumeButton = viewChild<ElementRef<HTMLButtonElement>>('resumeButton');

    /**
     * Pausing swaps the controls for Resume and End workout over the ring, and resuming swaps
     * them back, so the button just pressed is gone: focus moves to the one that took its place.
     */
    togglePause() {
        this.run.togglePause();
        afterNextRender(
            () =>
                (this.isPaused() ? this.resumeButton() : this.mainButton())?.nativeElement.focus(),
            { injector: this.injector }
        );
    }

    /** Escape resumes, as it would close a menu or dialog. */
    onEscape() {
        if (this.isPaused() && !this.isComplete() && !this.summaryOpen()) {
            this.togglePause();
        }
    }

    protected toggleChangingReps() {
        const opening = !this.changingReps();
        this.changingSet.set(opening ? this.currentSet() : null);
        // On a phone the wheels open below the fold, so bring them into view
        if (opening) {
            afterNextRender(
                () =>
                    document
                        .getElementById('workout-change-panel')
                        ?.scrollIntoView?.({ block: 'nearest' }),
                { injector: this.injector }
            );
        }
    }

    protected setReps(reps: number) {
        this.run.changeReps({ reps });
    }

    protected setWeight(value: number) {
        this.run.changeReps({
            weight: value > 0 ? weightToKg(value, this.weightUnit()) : undefined,
        });
    }

    /** Done on a rep step: on to the next step, from its full time. */
    finishReps() {
        this.run.finishReps();
    }

    /** Space pauses and resumes, like most media players, or presses Done on a rep step. */
    onSpace(event: Event) {
        const target = event.target as Element | null;
        if (
            !this.workout() ||
            this.summaryOpen() ||
            this.isComplete() ||
            (event as KeyboardEvent).repeat ||
            target?.closest?.(SPACE_HANDLED_BY)
        ) {
            return;
        }
        // Otherwise Space would also scroll the page
        event.preventDefault();
        if (this.isRepsActive()) {
            this.finishReps();
        } else {
            this.togglePause();
        }
    }

    /** End workout: the summary opens over the run, which waits, paused, in case of Back. */
    end() {
        this.run.end();
    }

    /** Back from the summary to the paused run, with focus on Resume. */
    backToWorkout() {
        this.run.back();
        afterNextRender(() => this.resumeButton()?.nativeElement.focus(), {
            injector: this.injector,
        });
    }

    /** The summary's Done or View history: the run is over, on to the library or the history. */
    async closeSummary(toHistory = false) {
        const run = this.run.runId();
        this.run.stop();
        await (toHistory && run
            ? this.router.navigate(['/history'], { queryParams: { run } })
            : this.router.navigate(['/library']));
    }
}
