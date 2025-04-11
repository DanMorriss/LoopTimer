import { signal } from "@angular/core";
import { Timer } from "../models/timer";

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