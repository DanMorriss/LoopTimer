import { computed, Injectable, signal } from "@angular/core";
import { Timer } from "../../models/timer";

@Injectable({ providedIn: 'root'})
export class TimerStore {
    private _timers = signal<Timer[]>([]);
    private _activeTimer = signal<Timer | null>(null);

    readonly timers = computed(() => this._timers());
    readonly activeTimer = computed(() => this._activeTimer());

    constructor() {
        const savedTimers = localStorage.getItem('timers');
        if (savedTimers) {
            this._timers.set(JSON.parse(savedTimers));
        }
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
    }

    private saveTimers() {
        localStorage.setItem('timers', JSON.stringify(this._timers()));
    }
}