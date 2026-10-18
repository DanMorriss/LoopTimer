import { roundSeconds, runsUntilStopped, Timer, workoutSeconds } from '../models/timer';

export type AlarmKind = 'work' | 'rest' | 'finish';

export interface AlarmEvent {
    kind: AlarmKind;
    /** When it should sound, in ms since the epoch. */
    at: number;
}

/**
 * The alarms in a workout, in order: the start of each step, then the finish. Uses the
 * same timings as `timerStateAt()`, so they line up with the countdown. Rest at the end of
 * the last round has no alarm.
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
    const roundMs = roundSeconds(timer) * 1000;
    const untilStopped = runsUntilStopped(timer);
    const endRound = untilStopped
        ? fromRound + roundCount
        : Math.min(timer.repeats, fromRound + roundCount);
    const endMs = startedAt + workoutSeconds(timer) * 1000;
    const events: AlarmEvent[] = [];

    for (let round = fromRound; round < endRound; round++) {
        let at = startedAt + round * roundMs;
        for (const step of timer.steps) {
            // Past the end only happens for rest at the end of the last round
            if (at < endMs) {
                events.push({ kind: step.kind, at });
            }
            at += step.seconds * 1000;
        }
    }

    if (!untilStopped && endRound === timer.repeats) {
        events.push({ kind: 'finish', at: endMs });
    }
    return events;
}
