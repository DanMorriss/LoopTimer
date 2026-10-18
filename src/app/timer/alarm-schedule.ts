import { runsUntilStopped, Timer } from '../models/timer';

export type AlarmKind = 'work' | 'rest' | 'finish';

export interface AlarmEvent {
    kind: AlarmKind;
    /** When it should sound, in ms since the epoch. */
    at: number;
}

/**
 * The alarms in a workout, in order: the start of each work and rest phase, then the
 * finish. Uses the same timings as `timerStateAt()`, so they line up with the countdown.
 *
 * A timer that runs until stopped has no end, so only the `roundCount` rounds starting
 * at round `fromRound` (counting from 0) are listed; finite timers stop at their last round.
 */
export function alarmEvents(
    timer: Timer,
    startedAt: number,
    fromRound = 0,
    roundCount = 100
): AlarmEvent[] {
    const workMs = (timer.timerMinutes * 60 + timer.timerSeconds) * 1000;
    const restMs = (timer.restMinutes * 60 + timer.restSeconds) * 1000;
    const untilStopped = runsUntilStopped(timer);
    const endRound = untilStopped
        ? fromRound + roundCount
        : Math.min(timer.repeats, fromRound + roundCount);
    const events: AlarmEvent[] = [];

    for (let round = fromRound; round < endRound; round++) {
        const roundStart = startedAt + round * (workMs + restMs);
        events.push({ kind: 'work', at: roundStart });
        // No rest after the last round
        if (restMs > 0 && (untilStopped || round < timer.repeats - 1)) {
            events.push({ kind: 'rest', at: roundStart + workMs });
        }
    }

    if (!untilStopped && endRound === timer.repeats) {
        const total = timer.repeats * workMs + (timer.repeats - 1) * restMs;
        events.push({ kind: 'finish', at: startedAt + total });
    }
    return events;
}
