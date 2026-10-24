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
import { ClockDigitsComponent } from './clock-digits/clock-digits.component';
import { AlarmService } from '../shared/alarms/alarm.service';
import { MatIconModule } from '@angular/material/icon';
import { formatTime } from '../shared/format-time';
import { ActiveRunService } from '../shared/run/active-run.service';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { WorkoutStore } from '../shared/state/workout-store.service';
import { ExerciseStore } from '../shared/state/exercise-store.service';
import { describeSets } from '../history/history-format';
import { injectPrefersReducedMotion } from '../shared/reduced-motion';
import { criticallyDampedSpring } from '../shared/spring';

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
    imports: [
        RouterLink,
        MatIconModule,
        WheelPickerComponent,
        WorkoutSummaryComponent,
        ClockDigitsComponent,
    ],
    templateUrl: './workout.component.html',
    styleUrls: ['./workout.component.scss', './workout-motion.scss', './workout-type.scss'],
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
    private readonly history = inject(HistoryStore);
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
    /**
     * The sets from the most recent workout with this exercise, in the same format as history
     * (PRG-1). Not this run's: it's in the history too once it's been ended or the page closed.
     */
    lastTime = computed(() => {
        const step = this.state()?.step;
        if (step?.kind !== 'reps' || step.exerciseId === undefined) {
            return '';
        }
        const runId = this.run.runId();
        for (const entry of this.history.entries()) {
            if (entry.id === runId) {
                continue;
            }
            const sets = (entry.sets ?? []).filter(
                (set) => !('seconds' in set) && set.exerciseId === step.exerciseId
            );
            if (sets.length === 0) {
                continue;
            }
            const summary = describeSets(
                sets,
                this.settings.weightUnit(),
                (id) => this.exercises.byId(id)?.name
            )
                .map((line) => line.text)
                .join(' + ');
            return summary ? `Last time: ${summary}` : '';
        }
        return '';
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
    /** As many rounds as fit in a time limit, rather than a number of them. */
    timeLimited = computed(() => this.workout()?.timeLimitSeconds !== undefined);
    /** Time left of the time limit, e.g. "12:34", or '' without one. */
    timeLeft = computed(() => {
        const ms = this.run.timeLeftMs();
        if (ms === null) {
            return '';
        }
        const seconds = Math.ceil(ms / 1000);
        return formatTime(Math.floor(seconds / 60), seconds % 60);
    });
    /** The last 10 seconds of a time limit, as the countdown beeps. */
    timeNearlyUp = computed(() => {
        const ms = this.run.timeLeftMs();
        return ms !== null && ms <= 10_000;
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

    /**
     * A timed step is nearly over, so "Next:" pulses to get ready: its last 5 seconds, or
     * its last 3 for a step under 15 seconds. Not on a rep step (Done is the cue) or paused.
     */
    nextSoon = computed(() => {
        const state = this.state();
        if (!state || this.isPaused() || (state.phase !== 'work' && state.phase !== 'rest')) {
            return false;
        }
        return state.remainingSeconds <= (state.phaseSeconds < 15 ? 3 : 5);
    });
    /** What comes next, for the colour of the "Next:" pulse: a step's kind, or finish. */
    nextKind = computed(() => this.nextState()?.step?.kind ?? 'finish');

    // The face's text is keyed by step, so a new step's text slides in as the last one's
    // slides out; a new round slides right to left, with the round line, rather than up.
    // Each is a snapshot of what it shows, so the text sliding out keeps its last values
    // rather than showing the new step's.
    faceSlides = computed(() => {
        const state = this.state();
        const complete = !state || state.phase === 'complete';
        return [
            {
                key: complete
                    ? 'complete'
                    : `${this.workoutStore.activeRunStartedAt()}-${state.round}-${state.stepIndex}`,
                complete,
                label: this.stepLabel(),
                reps: this.isRepsActive() ? this.reps() : null,
                weight: this.weight(),
                time: this.time(),
                step: this.showStepCount()
                    ? `step ${this.stepNumber()} of ${this.stepCount()}`
                    : '',
            },
        ];
    });
    roundSlides = computed(() => [
        {
            key: `${this.workoutStore.activeRunStartedAt()}-${this.roundNumber()}`,
            round: this.roundNumber(),
            untilStopped: this.untilStopped(),
            timeLimited: this.timeLimited(),
            timeLeft: this.timeLeft(),
            timeNearlyUp: this.timeNearlyUp(),
            totalRounds: this.totalRounds(),
            last: this.repeats() === 1,
            dots: this.roundDots(),
        },
    ]);
    /** The step in progress began a new round, so it slides in sideways. */
    newRound = computed(() => {
        const state = this.state();
        return !!state && state.phase !== 'complete' && state.stepIndex === 0 && state.round > 0;
    });

    private readonly remaining = computed(() => this.state()?.remainingSeconds ?? 0);
    private readonly time = computed(() =>
        formatTime(Math.floor(this.remaining() / 60), this.remaining() % 60)
    );

    /** How many rounds the workout runs for (0 when it runs until stopped or to a time limit). */
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
            if (this.timeLimited()) {
                parts.push(`round ${state.round + 1}, ${this.timeLeft()} left`);
            } else if (this.untilStopped()) {
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
    private readonly sidePauseButton = viewChild<ElementRef<HTMLButtonElement>>('sidePauseButton');
    private readonly resumeButton = viewChild<ElementRef<HTMLButtonElement>>('resumeButton');
    private readonly reducedMotion = injectPrefersReducedMotion();
    /** Apple's spring for moving something about: no bounce, a 0.4s response. */
    private readonly glide = criticallyDampedSpring(0.4);

    /** The button that pauses: the big one, or on a rep step the smaller one beside Done. */
    private pauseButton(): HTMLElement | undefined {
        return (this.isRepsActive() ? this.sidePauseButton() : this.mainButton())?.nativeElement;
    }

    /**
     * Pausing swaps the controls for Resume and End workout over the ring, and resuming swaps
     * them back, so the button just pressed is gone: focus moves to the one that took its
     * place, and that one glides there from where the pressed one was.
     */
    togglePause() {
        // Where it is on screen now, mid-glide included, so a press mid-glide turns it round
        const pressed = this.isPaused() ? this.resumeButton()?.nativeElement : this.pauseButton();
        const from = pressed?.getBoundingClientRect();
        this.run.togglePause();
        afterNextRender(
            () => {
                (this.isPaused() ? this.resumeButton() : this.mainButton())?.nativeElement.focus();
                const arrived = this.isPaused()
                    ? this.resumeButton()?.nativeElement
                    : this.pauseButton();
                if (from && arrived) {
                    this.glideFrom(arrived, from);
                }
            },
            { injector: this.injector }
        );
    }

    /**
     * Moves a button that has just appeared from where `from` was to its own place: Pause
     * carries on up into the ring as Resume, and Resume back down as Pause, along the same
     * path. A spring rather than a set curve, and the button is real throughout, so it can be
     * pressed while it moves. With reduced motion it's just there.
     */
    private glideFrom(button: HTMLElement, from: DOMRect) {
        if (this.reducedMotion()) {
            return;
        }
        const to = button.getBoundingClientRect();
        const x = from.left + from.width / 2 - (to.left + to.width / 2);
        const y = from.top + from.height / 2 - (to.top + to.height / 2);
        const scale = to.width ? from.width / to.width : 1;
        button.animate(
            [{ transform: `translate(${x}px, ${y}px) scale(${scale})` }, { transform: 'none' }],
            { duration: this.glide.duration, easing: this.glide.easing }
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
