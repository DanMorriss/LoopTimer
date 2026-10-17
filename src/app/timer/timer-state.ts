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
    /** Which round is in progress, starting at 0 (equal to repeats once complete). */
    round: number;
    /** Exact time spent in the current phase so far, in ms (0 once complete). */
    phaseElapsedMs: number;
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
    const roundSeconds = work + rest;
    const total = timer.repeats * work + (timer.repeats - 1) * rest;
    const elapsedMsClamped = Math.max(0, elapsedMs);
    const elapsed = Math.floor(elapsedMsClamped / 1000);

    if (elapsed >= total) {
        return { phase: 'complete', remainingSeconds: 0, phaseSeconds: 0, roundsLeft: 0, round: timer.repeats, phaseElapsedMs: 0 };
    }

    const roundIndex = Math.floor(elapsed / roundSeconds);
    const intoRound = elapsed % roundSeconds;
    const roundsLeft = timer.repeats - roundIndex;
    const roundStartMs = roundIndex * roundSeconds * 1000;

    if (intoRound < work) {
        return {
            phase: 'work', remainingSeconds: work - intoRound, phaseSeconds: work, roundsLeft,
            round: roundIndex, phaseElapsedMs: elapsedMsClamped - roundStartMs
        };
    }
    return {
        phase: 'rest', remainingSeconds: roundSeconds - intoRound, phaseSeconds: rest, roundsLeft,
        round: roundIndex, phaseElapsedMs: elapsedMsClamped - roundStartMs - work * 1000
    };
}
