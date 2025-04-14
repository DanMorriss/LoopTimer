import { computed, Injectable, signal } from "@angular/core";
import { Timer } from "../../models/timer";

const initialTimer: Timer = {
    id: 1,
    title: '',
    timerMinutes: 0,
    timerSeconds: 0,
    restMinutes: 0,
    restSeconds: 0,
    repeats: 0,
    isTimerActive: false,
    isRestActive: false,
    isComplete: false
}

export const timerSignal = signal<Timer>(initialTimer);

export const setTimer = (timer:Timer) => timerSignal.set(timer);

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

    addTimer(timer: Timer) {
        const updated = [...this._timers(), timer];
        this._timers.set(updated);
        this.saveTimers();
    }

    deleteTimer(timerId: number) {
        const updatedTimerList = this._timers().filter(timer => timer.id !== timerId);
        this._timers.set(updatedTimerList);
        this.saveTimers();
    }

    setActiveTimer(timer: Timer) {
        this._activeTimer.set(timer);
    }

    private saveTimers() {
        localStorage.setItem('timers', JSON.stringify(this._timers()));
    }


}