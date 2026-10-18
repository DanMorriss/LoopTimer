import { computed, Service, signal } from '@angular/core';
import { hasWork, MAX_STEP_SECONDS, Step, Timer } from '../../models/timer';

@Service()
export class TimerStore {
    private _timers = signal<Timer[]>([]);
    private _activeTimer = signal<Timer | null>(null);
    private _activeTimerStartedAt = signal<number | null>(null);
    private _activeTimerPausedAt = signal<number | null>(null);
    private _activeRunStartedAt = signal<number | null>(null);

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
        }
    }

    private loadTimers(): Timer[] {
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
        const savedId = Number(sessionStorage.getItem('activeTimerId'));
        return savedId ? this.findTimerById(savedId) : null;
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

    addTimer(timer: Omit<Timer, 'id'>): Timer {
        const newTimer: Timer = {
            ...timer,
            id: this.generateNextId(),
        };
        this._timers.update((timers) => [...timers, newTimer]);
        this.saveTimers();
        return newTimer;
    }

    private generateNextId(): number {
        const timers = this._timers();
        return timers.length > 0 ? Math.max(...timers.map((timers) => timers.id)) + 1 : 1;
    }

    deleteTimer(timerId: number) {
        const updatedTimerList = this._timers().filter((timer) => timer.id !== timerId);
        this._timers.set(updatedTimerList);
        this.saveTimers();
    }

    findTimerById(timerId: number): Timer | null {
        return this._timers().find((timer) => timer.id === timerId) ?? null;
    }

    updateTimer(timerId: number, timerUpdate: Omit<Timer, 'id'>): Timer | null {
        const existingTimer = this.findTimerById(timerId);
        if (!existingTimer) {
            return null;
        }

        const updatedTimer: Timer = {
            ...timerUpdate,
            id: timerId,
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
    }

    private saveTimers() {
        localStorage.setItem('timers', JSON.stringify(this._timers()));
    }
}

function isWholeNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isStep(value: unknown): value is Step {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const step = value as Record<string, unknown>;
    return (
        (step['kind'] === 'work' || step['kind'] === 'rest') &&
        isWholeNumber(step['seconds'], 1, MAX_STEP_SECONDS) &&
        typeof step['name'] === 'string'
    );
}

/**
 * Reads one saved timer, or returns null if it isn't usable. Timers saved before steps
 * existed (a single work and rest time) become a work step and, if there was any rest,
 * a rest step, which runs exactly as before.
 */
function readTimer(value: unknown): Timer | null {
    if (typeof value !== 'object' || value === null) {
        return null;
    }
    const saved = value as Record<string, unknown>;
    // 0 is UNTIL_STOPPED
    if (
        !isWholeNumber(saved['id'], 1) ||
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
        id: saved['id'] as number,
        title: saved['title'],
        steps: steps.map(({ kind, seconds, name }) => ({ kind, seconds, name })),
        repeats: saved['repeats'] as number,
    };
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
