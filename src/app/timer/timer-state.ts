import { Timer } from '../models/timer';

export type TimerPhase = 'work' | 'rest' | 'complete';

export interface TimerState {
    phase: TimerPhase;
    /** Whole seconds left in the current phase (0 once complete). */
    remainingSeconds: number;
    /** Length of the current phase in seconds (0 once complete). */
    phaseSeconds: number;
    /** Rounds left, counting the one in progress (0 once complete). */
    roundsLeft: number;
}

/**
 * Works out where a timer is from how long it has been running.
 *
 * A workout is `repeats` rounds of work, with rest between rounds (no rest
 * after the last one). Deriving this from elapsed time, rather than counting
 * interval ticks, keeps it correct when the browser slows timers down in a
 * background tab or on a locked phone.
 */
export function timerStateAt(timer: Timer, elapsedMs: number): TimerState {
    const work = timer.timerMinutes * 60 + timer.timerSeconds;
    const rest = timer.restMinutes * 60 + timer.restSeconds;
    const round = work + rest;
    const total = timer.repeats * work + (timer.repeats - 1) * rest;
    const elapsed = Math.max(0, Math.floor(elapsedMs / 1000));

    if (elapsed >= total) {
        return { phase: 'complete', remainingSeconds: 0, phaseSeconds: 0, roundsLeft: 0 };
    }

    const roundIndex = Math.floor(elapsed / round);
    const intoRound = elapsed % round;
    const roundsLeft = timer.repeats - roundIndex;

    if (intoRound < work) {
        return { phase: 'work', remainingSeconds: work - intoRound, phaseSeconds: work, roundsLeft };
    }
    return { phase: 'rest', remainingSeconds: round - intoRound, phaseSeconds: rest, roundsLeft };
}
