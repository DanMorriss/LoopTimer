export interface Timer {
    id: number;
    title: string;
    timerMinutes: number;
    timerSeconds: number;
    restMinutes: number;
    restSeconds: number;
    repeats: number;
    isTimerActive: boolean;
    isRestActive: boolean;
    isComplete: boolean;
}

/** The `repeats` value for a timer that keeps going until it's stopped. */
export const UNTIL_STOPPED = 0;

export function runsUntilStopped(timer: Pick<Timer, 'repeats'>): boolean {
    return timer.repeats === UNTIL_STOPPED;
}
