import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { runsUntilStopped, Step } from '../models/timer';
import { AlarmService } from '../shared/alarms/alarm.service';
import { MatIconModule } from '@angular/material/icon';
import { formatTime } from '../shared/format-time';
import { ActiveRunService } from '../shared/run/active-run.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { TimerStore } from '../shared/state/timer-store.service';

// Space on one of these already does something, e.g. presses the focused button
const SPACE_HANDLED_BY = 'button, a, input, textarea, select, [contenteditable], [role="button"]';

/** "Work", "Rest" or "Reps": what an unnamed step is called. */
function kindName(step: Step): string {
    return { work: 'Work', rest: 'Rest', reps: 'Reps' }[step.kind];
}

// Above this many rounds, the dots under "round 2 of 20" would wrap on a phone, so only the line shows
const MAX_ROUND_DOTS = 15;

/**
 * Shows the workout in progress and takes the user's presses. The run itself (its clock,
 * alarms and history) lives in ActiveRunService, so it carries on on any page of the app.
 */
@Component({
    selector: 'app-timer',
    imports: [RouterLink, MatIconModule],
    templateUrl: './timer.component.html',
    styleUrls: ['./timer.component.scss'],
    host: {
        '(document:keydown.space)': 'onSpace($event)',
    },
})
export class TimerComponent {
    timerStore = inject(TimerStore);
    private readonly router = inject(Router);
    private readonly run = inject(ActiveRunService);
    timer = this.run.timer;
    isPaused = this.run.isPaused;
    private readonly state = this.run.state;
    private readonly nextState = this.run.nextState;

    protected readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);
    /** Sound is on, but the browser is waiting for a tap before it will play any. */
    soundLocked = computed(
        () => this.alarms.supported && this.settings.sound() && !this.alarms.unlocked()
    );

    isTimerActive = computed(() => this.state()?.phase === 'work');
    isRestActive = computed(() => this.state()?.phase === 'rest');
    isRepsActive = computed(() => this.state()?.phase === 'reps');
    isComplete = computed(() => this.state()?.phase === 'complete');
    /** The rep step's count, e.g. 20, or 0 when it isn't a rep step. */
    reps = computed(() => {
        const step = this.state()?.step;
        return step?.kind === 'reps' ? step.reps : 0;
    });
    /** Rounds left, including the one in progress. */
    repeats = computed(() => this.state()?.roundsLeft ?? 0);
    untilStopped = computed(() => {
        const timer = this.timer();
        return timer !== null && runsUntilStopped(timer);
    });
    /** The round in progress, counting from 1. */
    roundNumber = computed(() => (this.state()?.round ?? 0) + 1);

    /** How many steps make up a round. */
    stepCount = computed(() => this.timer()?.steps.length ?? 0);
    /**
     * Whether to say which step it is. Only for rounds with more than one work or rep step:
     * a plain work-and-rest timer doesn't need "step 1 of 2".
     */
    showStepCount = computed(
        () => (this.timer()?.steps.filter((step) => step.kind !== 'rest').length ?? 0) > 1
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
    /** e.g. "Plank · 00:45", "Push-ups · 20 reps", or "finish" when the workout ends after this step. */
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
            return `${name} · ${step.reps} reps`;
        }
        return `${name} · ${formatTime(Math.floor(step.seconds / 60), step.seconds % 60)}`;
    });

    private readonly remaining = computed(() => this.state()?.remainingSeconds ?? 0);
    private readonly time = computed(() =>
        formatTime(Math.floor(this.remaining() / 60), this.remaining() % 60)
    );
    workTime = computed(() => (this.isTimerActive() ? this.time() : ''));
    restTime = computed(() => (this.isRestActive() ? this.time() : ''));

    /** How many rounds the timer runs for (0 when it runs until stopped). */
    totalRounds = computed(() => (this.untilStopped() ? 0 : (this.timer()?.repeats ?? 0)));

    /** One dot per round, for timers short enough for a row of them to fit on a phone. */
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
                key: `${this.timerStore.activeTimerStartedAt()}-${state.round}-${state.stepIndex}`,
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
        const timer = this.timer();
        if (!state || !timer) {
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
            parts.push(`${state.step.reps} reps`);
        }
        if (this.showStepCount()) {
            parts.push(`step ${state.stepIndex + 1} of ${timer.steps.length}`);
        }
        // The round is given as each round starts
        if (state.stepIndex === 0) {
            if (this.untilStopped()) {
                parts.push(`round ${state.round + 1}`);
            } else if (state.roundsLeft === 1 && timer.repeats > 1) {
                parts.push('last round');
            } else {
                parts.push(`round ${state.round + 1} of ${timer.repeats}`);
            }
        }
        return parts.join(', ');
    });

    togglePause() {
        this.run.togglePause();
    }

    /** Done on a rep step: on to the next step, from its full time. */
    finishReps() {
        this.run.finishReps();
    }

    /** Space pauses and resumes, like most media players, or presses Done on a rep step. */
    onSpace(event: Event) {
        const target = event.target as Element | null;
        if (
            !this.timer() ||
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

    /**
     * From the finished screen to this run in the history: with its note box open, ready to
     * type, or just highlighted.
     */
    async openHistory(withNote: boolean) {
        const run = this.run.runId();
        await this.router.navigate(
            ['/history'],
            run ? { queryParams: withNote ? { note: run } : { run } } : {}
        );
    }

    async stop() {
        this.run.stop();
        await this.router.navigate(['/library']);
    }
}
