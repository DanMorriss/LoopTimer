import {
    computed,
    DestroyRef,
    DOCUMENT,
    effect,
    inject,
    NgZone,
    Service,
    signal,
    untracked,
} from '@angular/core';
import { HistoryEntry, historyId } from '../../models/history';
import { RepStep, Timer, workoutSeconds } from '../../models/timer';
import { alarmEvents } from '../../timer/alarm-schedule';
import { timerStateAt } from '../../timer/timer-state';
import { AlarmService } from '../alarms/alarm.service';
import { HistoryStore } from '../state/history-store.service';
import { SettingsStore } from '../state/settings-store.service';
import { TimerStore } from '../state/timer-store.service';
import { KeepAwakeService } from './keep-awake.service';

// How many rounds of alarms to book at a time
const ALARM_WINDOW = 100;

// How late a vibration can be and still be worth doing, e.g. not after a background tab wakes up
const VIBRATE_LATE_LIMIT_MS = 1000;

/**
 * The workout in progress, wherever in the app the user is. It keeps the clock, books the
 * alarms, vibrates, keeps the screen on, and logs the run to the history; the timer page
 * shows it and sends it the user's presses. Started at app start, so a refreshed page
 * picks the run up again on any page.
 *
 * A run ends when it's stopped, when another timer is started in its place, or when the
 * tab closes, and is logged then (and when it finishes).
 */
@Service()
export class ActiveRunService {
    private readonly store = inject(TimerStore);
    private readonly history = inject(HistoryStore);
    private readonly alarms = inject(AlarmService);
    private readonly settings = inject(SettingsStore);
    private readonly keepAwake = inject(KeepAwakeService);

    readonly timer = this.store.activeTimer;
    readonly isPaused = this.store.isPaused;

    // Everything below is worked out from the clock rather than counted tick by tick,
    // so the timer stays correct even when ticks arrive late or not at all
    private readonly now = signal(Date.now());

    /** How long the timer has run, in ms, or null if there's no timer. */
    readonly elapsedMs = computed(() => {
        const startedAt = this.store.activeTimerStartedAt();
        // While paused, time stands still at the moment of the pause
        const at = this.store.activeTimerPausedAt() ?? this.now();
        return this.timer() && startedAt !== null ? at - startedAt : null;
    });

    readonly state = computed(() => {
        const timer = this.timer();
        const elapsedMs = this.elapsedMs();
        return timer && elapsedMs !== null
            ? timerStateAt(timer, elapsedMs, this.store.activeRepStepsDone())
            : null;
    });

    /** What comes after the current step: the state at the moment it ends. */
    readonly nextState = computed(() => {
        const timer = this.timer();
        const state = this.state();
        const elapsedMs = this.elapsedMs();
        if (!timer || !state || elapsedMs === null || state.phase === 'complete') {
            return null;
        }
        const stepEndMs = elapsedMs - state.phaseElapsedMs + state.phaseSeconds * 1000;
        // A rep step ends with Done, which adds one to the rep steps done
        const repStepsDone = this.store.activeRepStepsDone() + (state.phase === 'reps' ? 1 : 0);
        return timerStateAt(timer, stepEndMs, repStepsDone);
    });

    readonly isComplete = computed(() => this.state()?.phase === 'complete');
    /** A run is going, and not paused: the clock ticks, alarms sound, the screen stays on. */
    readonly isRunning = computed(() => !!this.timer() && !this.isPaused() && !this.isComplete());

    // Alarms are booked ALARM_WINDOW rounds at a time, starting from a multiple of half that,
    // so a timer that runs until stopped is topped up halfway through each batch.
    // Finite timers (30 rounds at most) fit in the first batch.
    private readonly alarmBatch = computed(() =>
        Math.floor((this.state()?.round ?? 0) / (ALARM_WINDOW / 2))
    );

    /**
     * When the run last resumed. Resuming moves the clock on by the pause, so an alarm that
     * sounded just before it now looks due a moment ago, and alarms that late still play
     * (for the first one after Start); anything due by this was heard already.
     */
    private readonly resumedAt = signal(0);

    // Changes when the timer starts, pauses, resumes or needs its next batch, not every tick
    private readonly alarmEvents = computed(() => {
        const timer = this.timer();
        const startedAt = this.store.activeTimerStartedAt();
        const fromRound = (this.alarmBatch() * ALARM_WINDOW) / 2;
        const resumedAt = this.resumedAt();
        return timer && startedAt !== null && !this.isPaused()
            ? alarmEvents(
                  timer,
                  startedAt,
                  fromRound,
                  ALARM_WINDOW,
                  this.store.activeRepStepsDone()
              ).filter((event) => event.at > resumedAt)
            : [];
    });
    private lastAlarmCheck = Date.now() - VIBRATE_LATE_LIMIT_MS;

    constructor() {
        // Tick while there's something to count; a paused or finished run stands still.
        // Outside Angular's zone, so a clock that's always ticking doesn't leave the app
        // forever "busy"; the signal it sets still updates the page.
        const zone = inject(NgZone);
        effect((onCleanup) => {
            if (this.isRunning()) {
                const id = zone.runOutsideAngular(() => setInterval(() => this.sync(), 250));
                onCleanup(() => clearInterval(id));
            }
        });

        // Log the workout once it's done, wherever the user is. Recording the same run
        // again (e.g. after a refresh) only updates its entry.
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

        // Keep the screen from locking mid-workout, if the setting is on
        effect(() => this.keepAwake.hold(this.settings.keepScreenOn() && this.isRunning()));

        // Browsers pause or slow timers in background tabs, so catch up as soon as the page
        // is visible again. Closing the tab (or refreshing) logs the run as it stands; a
        // refresh then carries on, and the entry is updated when it's stopped or finishes.
        const document = inject(DOCUMENT);
        const window = document.defaultView!;
        const onVisible = () => this.sync();
        const onPageHide = () => {
            this.sync();
            this.recordRun(this.isComplete() ? 'finished' : 'stopped');
        };
        document.addEventListener('visibilitychange', onVisible);
        window.addEventListener('pagehide', onPageHide);
        inject(DestroyRef).onDestroy(() => {
            document.removeEventListener('visibilitychange', onVisible);
            window.removeEventListener('pagehide', onPageHide);
        });
    }

    /**
     * Starts `timer` from the beginning. A run already going is logged as stopped first,
     * as starting another one ends it.
     */
    start(timer: Timer) {
        if (!this.isComplete()) {
            this.sync();
            this.recordRun('stopped');
        }
        this.store.setActiveTimer(timer);
        this.resumedAt.set(0);
        this.sync();
    }

    togglePause() {
        if (this.isPaused()) {
            this.store.resume();
            this.resumedAt.set(Date.now());
        } else {
            this.store.pause();
        }
        this.sync();
    }

    /**
     * Done on a rep step: on to the next step. The time it took comes off the countdown's
     * clock, so the next step starts from its beginning.
     */
    finishReps() {
        this.sync();
        const state = this.state();
        if (state?.phase !== 'reps' || state.step?.kind !== 'reps') {
            return;
        }
        const { name, reps, weight, exerciseId } = state.step;
        this.store.finishRepStep(state.phaseElapsedMs, {
            round: state.round,
            step: state.stepIndex,
            name,
            reps,
            ...(weight === undefined ? {} : { weight }),
            ...(exerciseId === undefined ? {} : { exerciseId }),
        });
        this.sync();
    }

    /**
     * Changes the reps or weight of the rep step being waited on, e.g. going up a weight:
     * for this set, the rest of this run, and the saved timer, so next time starts there.
     * A weight of undefined is none.
     */
    changeReps(change: { reps: number } | { weight: number | undefined }) {
        const state = this.state();
        const step = state?.step;
        if (state?.phase !== 'reps' || step?.kind !== 'reps') {
            return;
        }
        const reps = 'reps' in change ? change.reps : step.reps;
        const weight = 'weight' in change ? change.weight : step.weight;
        // No weight is left out, rather than saved as undefined; the exercise stays linked
        const changed: RepStep = {
            kind: 'reps',
            reps,
            name: step.name,
            ...(step.exerciseId === undefined ? {} : { exerciseId: step.exerciseId }),
        };
        this.store.updateActiveStep(
            state.stepIndex,
            weight === undefined ? changed : { ...changed, weight }
        );
    }

    /** Ends the run, logging it as stopped, and silences any alarm still sounding. */
    stop() {
        this.sync();
        this.recordRun('stopped');
        this.store.stop();
        this.alarms.cancel();
    }

    /** The run's id in the history, or null with no run. */
    runId(): string | null {
        const timer = this.timer();
        const runStartedAt = this.store.activeRunStartedAt();
        return timer && runStartedAt !== null ? historyId(runStartedAt, timer.id) : null;
    }

    sync() {
        this.now.set(Date.now());
    }

    /**
     * Adds this run to the history. A stopped run is only logged once at least one step
     * has been done, so starting a timer by mistake and stopping it leaves no trace.
     */
    private recordRun(outcome: HistoryEntry['outcome']) {
        const timer = this.timer();
        const state = this.state();
        const id = this.runId();
        const startedAt = this.store.activeTimerStartedAt();
        const elapsedMs = this.elapsedMs();
        if (!timer || !state || !id || startedAt === null || elapsedMs === null) {
            return;
        }
        const finished = outcome === 'finished';
        if (!finished && state.round === 0 && state.stepIndex === 0) {
            return;
        }
        // A finish is dated when the workout actually ended, even if the page only notices
        // later (e.g. it was in the background); startedAt has moved on by any pauses and by
        // the time spent on rep steps, which the clock leaves out
        const countdownMs = finished ? workoutSeconds(timer) * 1000 : elapsedMs;
        const activeSeconds = Math.floor((countdownMs + this.store.activeRepMs()) / 1000);
        const sets = this.store.activeSets();
        this.history.record({
            id,
            timerId: timer.id,
            title: timer.title,
            startedAt: this.store.activeRunStartedAt()!,
            endedAt: finished ? startedAt + countdownMs : Date.now(),
            activeSeconds,
            roundsCompleted: finished ? timer.repeats : state.round,
            totalRounds: timer.repeats,
            outcome,
            ...(sets.length > 0 ? { sets } : {}),
        });
    }
}
