import { computed, inject, Service, signal } from '@angular/core';
import { hasWork, MAX_REPS, MAX_STEP_SECONDS, Step, Timer, TimerFields } from '../../models/timer';
import { MAX_WEIGHT_KG } from '../../models/weight';
import { isLoggedSet, LoggedSet } from '../../models/history';
import { Deletion, mergeRecords, newId } from '../../models/sync';
import { DeletionStore } from './deletion-store.service';
import { ExerciseStore } from './exercise-store.service';
import { linkSteps } from '../../models/exercise-links';
import { LEGACY_TIMER_IDS_KEY, migrateSavedData } from './migrate';

@Service()
export class TimerStore {
    private readonly deletions = inject(DeletionStore);
    private readonly exercises = inject(ExerciseStore);
    private _timers = signal<Timer[]>([]);
    private _activeTimer = signal<Timer | null>(null);
    private _activeTimerStartedAt = signal<number | null>(null);
    private _activeTimerPausedAt = signal<number | null>(null);
    private _activeRunStartedAt = signal<number | null>(null);
    private _activeRepStepsDone = signal(0);
    private _activeRepMs = signal(0);
    private _activeSets = signal<LoggedSet[]>([]);

    readonly timers = computed(() => this._timers());
    readonly activeTimer = computed(() => this._activeTimer());
    /** When the active timer was started, in ms since the epoch. Moves forward on resume. */
    readonly activeTimerStartedAt = computed(() => this._activeTimerStartedAt());
    /** When the active timer was paused, in ms since the epoch, or null while it runs. */
    readonly activeTimerPausedAt = computed(() => this._activeTimerPausedAt());
    readonly isPaused = computed(() => this._activeTimerPausedAt() !== null);
    /**
     * When the current run really began, in ms since the epoch. Unlike `activeTimerStartedAt`
     * it doesn't move on resume, so it identifies the run and dates it in the history.
     */
    readonly activeRunStartedAt = computed(() => this._activeRunStartedAt());
    /** How many rep steps of the current run have been done, across all its rounds. */
    readonly activeRepStepsDone = computed(() => this._activeRepStepsDone());
    /**
     * Time spent on rep steps done so far, in ms. Done takes it off the countdown's clock
     * (see `finishRepStep()`), so the history adds it back to the time spent.
     */
    readonly activeRepMs = computed(() => this._activeRepMs());
    /** The sets of rep steps done so far in the current run, in order. */
    readonly activeSets = computed(() => this._activeSets());

    constructor() {
        this._timers.set(this.loadTimers());
        this._activeTimer.set(this.loadActiveTimer());
        if (this._activeTimer()) {
            const startedAt = this.loadActiveTimerStartedAt();
            this._activeTimerStartedAt.set(startedAt);
            this._activeTimerPausedAt.set(this.loadActiveTimerPausedAt(startedAt));
            // Runs from before this was saved fall back to the (possibly resumed) start time
            const runStart = Number(sessionStorage.getItem('activeRunStartedAt'));
            this._activeRunStartedAt.set(
                Number.isFinite(runStart) && runStart > 0 && runStart <= startedAt
                    ? runStart
                    : startedAt
            );
            this._activeRepStepsDone.set(readCount(sessionStorage.getItem('activeRepStepsDone')));
            this._activeRepMs.set(readCount(sessionStorage.getItem('activeRepMs')));
            this._activeSets.set(readSets(sessionStorage.getItem('activeSets')));
        }
    }

    private loadTimers(): Timer[] {
        migrateSavedData();
        const savedTimers = localStorage.getItem('timers');
        if (!savedTimers) {
            return [];
        }

        // Corrupted or unexpected data shouldn't stop the app from starting,
        // so drop anything that isn't a usable timer
        try {
            const parsed: unknown = JSON.parse(savedTimers);
            return Array.isArray(parsed)
                ? parsed.map((item) => readTimer(item)).filter((timer) => timer !== null)
                : [];
        } catch {
            return [];
        }
    }

    // The active timer and its start time are remembered per tab, so refreshing
    // the timer page carries on where it was
    private loadActiveTimer(): Timer | null {
        const savedId = sessionStorage.getItem('activeTimerId');
        if (!savedId) {
            return null;
        }
        // A run started before timers had random ids still has its old number
        return this.findTimerById(savedId) ?? this.findTimerById(legacyTimerId(savedId) ?? '');
    }

    private loadActiveTimerStartedAt(): number {
        const savedStart = Number(sessionStorage.getItem('activeTimerStartedAt'));
        const now = Date.now();
        // Fall back to starting now if the saved time is missing or impossible
        return Number.isFinite(savedStart) && savedStart > 0 && savedStart <= now
            ? savedStart
            : now;
    }

    // A saved pause only counts if it falls between the start and now; otherwise the timer runs
    private loadActiveTimerPausedAt(startedAt: number): number | null {
        const saved = sessionStorage.getItem('activeTimerPausedAt');
        const pausedAt = Number(saved);
        return saved !== null && pausedAt >= startedAt && pausedAt <= Date.now() ? pausedAt : null;
    }

    /** Saves a new timer, its named steps linked to exercises (see `linkSteps()`). */
    addTimer(timer: TimerFields): Timer {
        const newTimer: Timer = {
            ...timer,
            steps: linkSteps(timer.steps, this.exercises.finder),
            id: newId(),
            updatedAt: Date.now(),
        };
        this._timers.update((timers) => [...timers, newTimer]);
        this.saveTimers();
        return newTimer;
    }

    /**
     * Adds timers from a version 1 backup, whose ids were only unique on their device, so a
     * timer is matched on what it is instead: one the same as a timer already here (title,
     * steps and rounds) is skipped, and any other is added. Their ids are new ones given when
     * the backup was read (see `upgradeTimer()`). Returns how many were added.
     */
    importTimers(imported: readonly Timer[]): number {
        let added = 0;
        for (const timer of imported) {
            if (this._timers().some((existing) => sameTimer(existing, timer))) {
                continue;
            }
            this._timers.update((timers) => [...timers, timer]);
            added++;
        }
        if (added > 0) {
            this.saveTimers();
        }
        return added;
    }

    /**
     * Merges timers from another copy (a version 2 backup), by id: the most recent change to
     * each wins, and a deletion there removes a timer here that hasn't changed since. A timer
     * deleted here doesn't come back unless it changed there after.
     */
    mergeTimers(timers: readonly Timer[], deletedThere: readonly Deletion[]) {
        const result = mergeRecords(
            'timer',
            this._timers(),
            timers,
            (id) => this.deletions.deletedAt('timer', id),
            deletedThere
        );
        result.deletions.forEach((deletion) => this.deletions.add(deletion));
        if (result.added + result.updated + result.removed > 0) {
            this._timers.set(result.records);
            this.saveTimers();
        }
        return { added: result.added, updated: result.updated, removed: result.removed };
    }

    deleteTimer(timerId: string) {
        const updatedTimerList = this._timers().filter((timer) => timer.id !== timerId);
        this._timers.set(updatedTimerList);
        this.saveTimers();
        this.deletions.add({ kind: 'timer', id: timerId, deletedAt: Date.now() });
    }

    findTimerById(timerId: string): Timer | null {
        return this._timers().find((timer) => timer.id === timerId) ?? null;
    }

    updateTimer(timerId: string, timerUpdate: TimerFields): Timer | null {
        const existingTimer = this.findTimerById(timerId);
        if (!existingTimer) {
            return null;
        }

        const updatedTimer: Timer = {
            ...timerUpdate,
            steps: linkSteps(timerUpdate.steps, this.exercises.finder),
            id: timerId,
            updatedAt: Date.now(),
        };

        this._timers.update((timers) =>
            timers.map((timer) => (timer.id === timerId ? updatedTimer : timer))
        );
        this.saveTimers();
        return updatedTimer;
    }

    /** Makes `timer` the active timer and starts it from the beginning. */
    setActiveTimer(timer: Timer) {
        const startedAt = Date.now();
        this._activeTimer.set(timer);
        this._activeTimerStartedAt.set(startedAt);
        sessionStorage.setItem('activeTimerId', String(timer.id));
        sessionStorage.setItem('activeTimerStartedAt', String(startedAt));
        this._activeTimerPausedAt.set(null);
        this._activeRunStartedAt.set(startedAt);
        sessionStorage.setItem('activeRunStartedAt', String(startedAt));
        sessionStorage.removeItem('activeTimerPausedAt');
        this.clearRepSteps();
    }

    /**
     * Done on a rep step: the timer moves on to the next step. `waitedMs` is how long the
     * clock ran on past the rep step while it was being done; the start time moves forward
     * by that much, so the countdown picks up exactly where the rep step began. `set` is
     * what was done, logged for the history.
     */
    finishRepStep(waitedMs: number, set: LoggedSet) {
        const startedAt = this._activeTimerStartedAt();
        if (!this._activeTimer() || startedAt === null) {
            return;
        }
        // Done straight from a pause carries on running
        this.resume();
        const waited = Math.max(0, Math.round(waitedMs));
        const movedStart = this._activeTimerStartedAt()! + waited;
        this._activeTimerStartedAt.set(movedStart);
        this._activeRepStepsDone.update((done) => done + 1);
        this._activeRepMs.update((ms) => ms + waited);
        sessionStorage.setItem('activeTimerStartedAt', String(movedStart));
        sessionStorage.setItem('activeRepStepsDone', String(this._activeRepStepsDone()));
        sessionStorage.setItem('activeRepMs', String(this._activeRepMs()));
        this._activeSets.update((sets) => [...sets, set]);
        sessionStorage.setItem('activeSets', JSON.stringify(this._activeSets()));
    }

    private clearRepSteps() {
        this._activeRepStepsDone.set(0);
        this._activeRepMs.set(0);
        this._activeSets.set([]);
        sessionStorage.removeItem('activeRepStepsDone');
        sessionStorage.removeItem('activeRepMs');
        sessionStorage.removeItem('activeSets');
    }

    /**
     * Replaces one step of the running timer, e.g. its reps or weight changed mid-workout,
     * and of the saved timer too, so it starts from there next time.
     */
    updateActiveStep(stepIndex: number, step: Step) {
        const timer = this._activeTimer();
        if (!timer || !timer.steps[stepIndex]) {
            return;
        }
        const updated: Timer = {
            ...timer,
            steps: timer.steps.map((existing, i) => (i === stepIndex ? step : existing)),
            updatedAt: Date.now(),
        };
        this._activeTimer.set(updated);
        if (this.findTimerById(timer.id)) {
            this._timers.update((timers) => timers.map((t) => (t.id === timer.id ? updated : t)));
            this.saveTimers();
        }
    }

    /** Freezes the active timer where it is. Does nothing if it's already paused. */
    pause() {
        if (!this._activeTimer() || this.isPaused()) {
            return;
        }
        const pausedAt = Date.now();
        this._activeTimerPausedAt.set(pausedAt);
        sessionStorage.setItem('activeTimerPausedAt', String(pausedAt));
    }

    /**
     * Carries on from where the timer was paused. The start time moves forward by the
     * time spent paused, so the elapsed time picks up exactly where it stopped.
     */
    resume() {
        const pausedAt = this._activeTimerPausedAt();
        const startedAt = this._activeTimerStartedAt();
        if (pausedAt === null || startedAt === null) {
            return;
        }
        const resumedStart = startedAt + (Date.now() - pausedAt);
        this._activeTimerStartedAt.set(resumedStart);
        this._activeTimerPausedAt.set(null);
        sessionStorage.setItem('activeTimerStartedAt', String(resumedStart));
        sessionStorage.removeItem('activeTimerPausedAt');
    }

    /** Ends the active timer, leaving no timer selected. */
    stop() {
        this._activeTimer.set(null);
        this._activeTimerStartedAt.set(null);
        this._activeTimerPausedAt.set(null);
        this._activeRunStartedAt.set(null);
        sessionStorage.removeItem('activeTimerId');
        sessionStorage.removeItem('activeTimerStartedAt');
        sessionStorage.removeItem('activeTimerPausedAt');
        sessionStorage.removeItem('activeRunStartedAt');
        this.clearRepSteps();
    }

    private saveTimers() {
        localStorage.setItem('timers', JSON.stringify(this._timers()));
    }
}

function isWholeNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

/** The saved sets of the run in progress; anything broken is dropped. */
function readSets(saved: string | null): LoggedSet[] {
    try {
        const parsed: unknown = JSON.parse(saved ?? '[]');
        return Array.isArray(parsed) ? parsed.filter(isLoggedSet) : [];
    } catch {
        return [];
    }
}

/** A saved count, e.g. rep steps done; anything missing or broken counts as 0. */
function readCount(saved: string | null): number {
    const count = Number(saved);
    return isWholeNumber(count, 0) ? count : 0;
}

function isStep(value: unknown): value is Step {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const step = value as Record<string, unknown>;
    if (
        typeof step['name'] !== 'string' ||
        (step['exerciseId'] !== undefined && typeof step['exerciseId'] !== 'string')
    ) {
        return false;
    }
    if (step['kind'] === 'reps') {
        const weight = step['weight'];
        return (
            isWholeNumber(step['reps'], 1, MAX_REPS) &&
            (weight === undefined ||
                (typeof weight === 'number' && weight > 0 && weight <= MAX_WEIGHT_KG))
        );
    }
    return (
        (step['kind'] === 'work' || step['kind'] === 'rest') &&
        isWholeNumber(step['seconds'], 1, MAX_STEP_SECONDS)
    );
}

/** Just the step's own fields, leaving out anything else that was saved with it. */
function copyStep(step: Step): Step {
    const link = step.exerciseId === undefined ? {} : { exerciseId: step.exerciseId };
    return step.kind === 'reps'
        ? {
              kind: step.kind,
              reps: step.reps,
              name: step.name,
              ...(step.weight === undefined ? {} : { weight: step.weight }),
              ...link,
          }
        : { kind: step.kind, seconds: step.seconds, name: step.name, ...link };
}

/** Whether two timers are the same apart from their ids. */
function sameTimer(a: Timer, b: Timer): boolean {
    // By what the steps are, not the exercises they happen to be linked to
    const steps = (timer: Timer) =>
        JSON.stringify(timer.steps.map((step) => ({ ...copyStep(step), exerciseId: undefined })));
    return a.title === b.title && a.repeats === b.repeats && steps(a) === steps(b);
}

/**
 * Reads one saved timer, from this device or a backup, or returns null if it isn't usable.
 * Timers saved before steps existed (a single work and rest time) become a work step and,
 * if there was any rest, a rest step, which runs exactly as before.
 */
export function readTimer(value: unknown): Timer | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const saved = value as Record<string, unknown>;
    // 0 is UNTIL_STOPPED
    if (
        typeof saved['id'] !== 'string' ||
        saved['id'] === '' ||
        typeof saved['title'] !== 'string' ||
        !isWholeNumber(saved['repeats'], 0)
    ) {
        return null;
    }
    const steps = Array.isArray(saved['steps']) ? saved['steps'] : stepsFromWorkAndRest(saved);
    if (!steps?.every((step) => isStep(step)) || !hasWork(steps)) {
        return null;
    }
    return {
        id: saved['id'],
        title: saved['title'],
        steps: steps.map(copyStep),
        repeats: saved['repeats'] as number,
        // Missing only if saved oddly: older than any real change, so any other copy wins
        updatedAt: isWholeNumber(saved['updatedAt'], 0) ? (saved['updatedAt'] as number) : 0,
    };
}

/** The new id of a timer saved before ids were random, from its old number. */
function legacyTimerId(oldId: string): string | undefined {
    try {
        const ids: unknown = JSON.parse(localStorage.getItem(LEGACY_TIMER_IDS_KEY) ?? '{}');
        const id =
            typeof ids === 'object' && ids !== null
                ? (ids as Record<string, unknown>)[oldId]
                : undefined;
        return typeof id === 'string' ? id : undefined;
    } catch {
        return undefined;
    }
}

/** The steps for a timer saved in the old format, or null if it isn't one. */
function stepsFromWorkAndRest(saved: Record<string, unknown>): Step[] | null {
    if (
        !isWholeNumber(saved['timerMinutes'], 0, 99) ||
        !isWholeNumber(saved['timerSeconds'], 0, 59) ||
        !isWholeNumber(saved['restMinutes'], 0, 99) ||
        !isWholeNumber(saved['restSeconds'], 0, 59)
    ) {
        return null;
    }
    const work = (saved['timerMinutes'] as number) * 60 + (saved['timerSeconds'] as number);
    const rest = (saved['restMinutes'] as number) * 60 + (saved['restSeconds'] as number);
    const steps: Step[] = [{ kind: 'work', seconds: work, name: '' }];
    if (rest > 0) {
        steps.push({ kind: 'rest', seconds: rest, name: '' });
    }
    return steps;
}
