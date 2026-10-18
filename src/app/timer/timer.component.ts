import { Component, computed, effect, inject, OnDestroy, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { HistoryEntry, historyId } from '../models/history';
import { runsUntilStopped, workoutSeconds } from '../models/timer';
import { AlarmService } from '../shared/alarms/alarm.service';
import { MatIconModule } from '@angular/material/icon';
import { formatTime } from '../shared/format-time';
import { HistoryStore } from '../shared/state/history-store.service';
import { SettingsStore } from '../shared/state/settings-store.service';
import { TimerStore } from '../shared/state/timer-store.service';
import { alarmEvents } from './alarm-schedule';
import { timerStateAt } from './timer-state';

// Space on one of these already does something, e.g. presses the focused button
const SPACE_HANDLED_BY = 'button, a, input, textarea, select, [contenteditable], [role="button"]';

// How many rounds of alarms to book at a time
const ALARM_WINDOW = 100;

// How late a vibration can be and still be worth doing, e.g. not after a background tab wakes up
const VIBRATE_LATE_LIMIT_MS = 1000;

@Component({
    selector: 'app-timer',
    imports: [RouterLink, MatIconModule],
    templateUrl: './timer.component.html',
    styleUrls: ['./timer.component.scss'],
    host: {
        // Browsers pause or slow timers in background tabs, so catch up as soon as the page is visible again
        '(document:visibilitychange)': 'syncClock()',
        '(document:keydown.space)': 'onSpace($event)',
    },
})
export class TimerComponent implements OnDestroy {
    timerStore = inject(TimerStore);
    private readonly router = inject(Router);
    private readonly history = inject(HistoryStore);
    timer = this.timerStore.activeTimer;
    isPaused = this.timerStore.isPaused;

    // Everything below is worked out from the clock rather than counted tick by tick,
    // so the timer stays correct even when ticks arrive late or not at all
    private readonly now = signal(Date.now());
    private readonly clockId = setInterval(() => this.syncClock(), 250);

    /** How long the timer has run, in ms, or null if there's no timer. */
    private readonly elapsedMs = computed(() => {
        const startedAt = this.timerStore.activeTimerStartedAt();
        // While paused, time stands still at the moment of the pause
        const at = this.timerStore.activeTimerPausedAt() ?? this.now();
        return this.timer() && startedAt !== null ? at - startedAt : null;
    });

    private readonly state = computed(() => {
        const timer = this.timer();
        const elapsedMs = this.elapsedMs();
        return timer && elapsedMs !== null ? timerStateAt(timer, elapsedMs) : null;
    });

    // What comes after the current step: the state at the moment it ends
    private readonly nextState = computed(() => {
        const timer = this.timer();
        const state = this.state();
        const elapsedMs = this.elapsedMs();
        if (!timer || !state || elapsedMs === null || state.phase === 'complete') {
            return null;
        }
        const stepEndMs = elapsedMs - state.phaseElapsedMs + state.phaseSeconds * 1000;
        return timerStateAt(timer, stepEndMs);
    });

    protected readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);
    /** Sound is on, but the browser is waiting for a tap before it will play any. */
    soundLocked = computed(
        () => this.alarms.supported && this.settings.sound() && !this.alarms.unlocked()
    );

    // Alarms are booked ALARM_WINDOW rounds at a time, starting from a multiple of half that,
    // so a timer that runs until stopped is topped up halfway through each batch.
    // Finite timers (30 rounds at most) fit in the first batch.
    private readonly alarmBatch = computed(() =>
        Math.floor((this.state()?.round ?? 0) / (ALARM_WINDOW / 2))
    );

    // Changes when the timer starts, pauses, resumes or needs its next batch, not every tick
    private readonly alarmEvents = computed(() => {
        const timer = this.timer();
        const startedAt = this.timerStore.activeTimerStartedAt();
        const fromRound = (this.alarmBatch() * ALARM_WINDOW) / 2;
        return timer && startedAt !== null && !this.isPaused()
            ? alarmEvents(timer, startedAt, fromRound, ALARM_WINDOW)
            : [];
    });
    private lastAlarmCheck = Date.now() - VIBRATE_LATE_LIMIT_MS;

    constructor() {
        // Log the workout once it's done. The history only keeps a run once, so seeing the
        // finished screen again after a refresh doesn't log it twice.
        effect(() => {
            if (this.isComplete()) {
                untracked(() => this.recordRun('finished'));
            }
        });

        // Hand the whole workout's alarms to the audio clock up front, and again whenever
        // the timer pauses, resumes, or sound is unlocked or turned on or off
        effect(() => {
            const events = this.alarmEvents();
            // Reading sound() here reschedules (or silences) when it's changed in settings
            if (this.alarms.unlocked() || !this.settings.sound()) {
                this.alarms.schedule(events);
            }
        });

        // Vibrate as each alarm comes due
        effect(() => {
            const now = this.now();
            const due = this.alarmEvents().filter(
                (event) =>
                    event.at > this.lastAlarmCheck &&
                    event.at <= now &&
                    event.at > now - VIBRATE_LATE_LIMIT_MS
            );
            this.lastAlarmCheck = now;
            if (due.length > 0) {
                this.alarms.vibrate(due[due.length - 1].kind);
            }
        });
    }

    isTimerActive = computed(() => this.state()?.phase === 'work');
    isRestActive = computed(() => this.state()?.phase === 'rest');
    isComplete = computed(() => this.state()?.phase === 'complete');
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
     * Whether to say which step it is. Only for rounds with more than one work step: a
     * plain work-and-rest timer doesn't need "step 1 of 2".
     */
    showStepCount = computed(
        () => (this.timer()?.steps.filter((step) => step.kind === 'work').length ?? 0) > 1
    );
    /** The step in progress, counting from 1. */
    stepNumber = computed(() => (this.state()?.stepIndex ?? 0) + 1);
    /** The step's name, or "Rest" for an unnamed rest. Unnamed work shows just the time. */
    stepLabel = computed(() => {
        const step = this.state()?.step;
        return step?.name || (step?.kind === 'rest' ? 'Rest' : '');
    });
    /** e.g. "Plank · 00:45", or "finish" when the workout ends after this step. */
    upNext = computed(() => {
        const next = this.nextState();
        if (!next) {
            return '';
        }
        if (!next.step) {
            return 'finish';
        }
        const name = next.step.name || (next.step.kind === 'rest' ? 'Rest' : 'Work');
        const seconds = next.step.seconds;
        return `${name} · ${formatTime(Math.floor(seconds / 60), seconds % 60)}`;
    });

    private readonly remaining = computed(() => this.state()?.remainingSeconds ?? 0);
    private readonly time = computed(() =>
        formatTime(Math.floor(this.remaining() / 60), this.remaining() % 60)
    );
    workTime = computed(() => (this.isTimerActive() ? this.time() : ''));
    restTime = computed(() => (this.isRestActive() ? this.time() : ''));

    // One marker per round left; a timer that runs until stopped shows its round number instead
    repeatArray = computed(() =>
        this.untilStopped() ? [] : Array.from({ length: this.repeats() }, (_, i) => i)
    );

    // The ring sweep is a CSS animation that runs for the whole step, so the browser can
    // animate it without repainting. This only changes when a new step starts, which
    // recreates the ring element and restarts the animation from the right point.
    private readonly ringSweep = computed(
        () => {
            const state = this.state();
            if (!state || state.phase === 'complete') {
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
        const parts = [state.step.name || (state.step.kind === 'work' ? 'Work' : 'Rest')];
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
        if (this.isPaused()) {
            this.timerStore.resume();
        } else {
            this.timerStore.pause();
        }
        this.syncClock();
    }

    /** Space pauses and resumes, like most media players. */
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
        this.togglePause();
    }

    /**
     * Adds this run to the history. A stopped run is only logged once at least one step
     * has been done, so starting a timer by mistake and stopping it leaves no trace.
     */
    private recordRun(outcome: HistoryEntry['outcome']) {
        const timer = this.timer();
        const state = this.state();
        const runStartedAt = this.timerStore.activeRunStartedAt();
        const startedAt = this.timerStore.activeTimerStartedAt();
        const elapsedMs = this.elapsedMs();
        if (!timer || !state || runStartedAt === null || startedAt === null || elapsedMs === null) {
            return;
        }
        const finished = outcome === 'finished';
        if (!finished && state.round === 0 && state.stepIndex === 0) {
            return;
        }
        // A finish is dated when the workout actually ended, even if the page only notices
        // later (e.g. it was in the background); startedAt has moved on by any pauses
        const activeSeconds = finished ? workoutSeconds(timer) : Math.floor(elapsedMs / 1000);
        this.history.record({
            id: historyId(runStartedAt, timer.id),
            timerId: timer.id,
            title: timer.title,
            startedAt: runStartedAt,
            endedAt: finished ? startedAt + activeSeconds * 1000 : Date.now(),
            activeSeconds,
            roundsCompleted: finished ? timer.repeats : state.round,
            totalRounds: timer.repeats,
            outcome,
        });
    }

    async stop() {
        this.recordRun('stopped');
        this.timerStore.stop();
        await this.router.navigate(['/library']);
    }

    syncClock() {
        this.now.set(Date.now());
    }

    ngOnDestroy() {
        clearInterval(this.clockId);
        this.alarms.cancel();
    }
}
