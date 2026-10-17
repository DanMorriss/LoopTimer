import { computed, Injectable, signal } from "@angular/core";
import { Timer } from "../../models/timer";

@Injectable({ providedIn: 'root'})
export class TimerStore {
    private _timers = signal<Timer[]>([]);
    private _activeTimer = signal<Timer | null>(null);

    readonly timers = computed(() => this._timers());
    readonly activeTimer = computed(() => this._activeTimer());

    constructor() {
        this._timers.set(this.loadTimers());
        this._activeTimer.set(this.loadActiveTimer());
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
            return Array.isArray(parsed) ? parsed.filter(item => isValidTimer(item)) : [];
        } catch {
            return [];
        }
    }

    // The active timer is remembered per tab, so refreshing the timer page brings it back
    private loadActiveTimer(): Timer | null {
        const savedId = Number(sessionStorage.getItem('activeTimerId'));
        return savedId ? this.findTimerById(savedId) : null;
    }

    addTimer(timer: Omit<Timer, 'id'>): Timer {
        const newTimer: Timer = {
            ...timer,
            id: this.generateNextId()
        };
        this._timers.update(timers => [...timers, newTimer]);
        this.saveTimers();
        return newTimer;
    }

    private generateNextId(): number {
        const timers = this._timers();
        return timers.length > 0 ? Math.max(...timers.map(timers => timers.id)) + 1 : 1;
    }

    deleteTimer(timerId: number) {
        const updatedTimerList = this._timers().filter(timer => timer.id !== timerId);
        this._timers.set(updatedTimerList);
        this.saveTimers();
    }

    findTimerById(timerId: number): Timer | null {
        return this._timers().find(timer => timer.id === timerId) ?? null;
    }

    updateTimer(timerId: number, timerUpdate: Omit<Timer, 'id'>): Timer | null {
        const existingTimer = this.findTimerById(timerId);
        if (!existingTimer) {
            return null;
        }

        const updatedTimer: Timer = {
            ...timerUpdate,
            id: timerId
        };

        this._timers.update(timers => timers.map(timer => timer.id === timerId ? updatedTimer : timer));
        this.saveTimers();
        return updatedTimer;
    }

    setActiveTimer(timer: Timer) {
        this._activeTimer.set(timer);
        sessionStorage.setItem('activeTimerId', String(timer.id));
    }

    private saveTimers() {
        localStorage.setItem('timers', JSON.stringify(this._timers()));
    }
}

function isWholeNumber(value: unknown, min: number, max = Number.MAX_SAFE_INTEGER): boolean {
    return Number.isInteger(value) && (value as number) >= min && (value as number) <= max;
}

function isValidTimer(value: unknown): value is Timer {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const timer = value as Record<string, unknown>;
    return isWholeNumber(timer['id'], 1)
        && typeof timer['title'] === 'string'
        && isWholeNumber(timer['timerMinutes'], 0)
        && isWholeNumber(timer['timerSeconds'], 0, 59)
        && isWholeNumber(timer['restMinutes'], 0)
        && isWholeNumber(timer['restSeconds'], 0, 59)
        && isWholeNumber(timer['repeats'], 1)
        && (timer['timerMinutes'] as number) + (timer['timerSeconds'] as number) > 0;
}
