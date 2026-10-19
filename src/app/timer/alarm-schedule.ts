import {
    roundSeconds,
    runsUntilStopped,
    stepSeconds,
    Timer,
    workoutSeconds,
} from '../models/timer';
import { nextRepStep } from './timer-state';

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
 * A rep step sounds the work alarm as it starts. Nothing after it can be booked, as no one
 * knows when it will be done, so the list stops there; after Done (`repStepsDone` one
 * higher, and `startedAt` moved on) it carries on from the next step. Rep steps already
 * done have no alarm.
 *
 * A timer that runs until stopped has no end, so only the `roundCount` rounds starting
 * at round `fromRound` (counting from 0) are listed; finite timers stop at their last round.
 */
export function alarmEvents(
    timer: Timer,
    startedAt: number,
    fromRound = 0,
    roundCount = 100,
    repStepsDone = 0
): AlarmEvent[] {
    const roundMs = roundSeconds(timer) * 1000;
    const waitingOn = nextRepStep(timer, repStepsDone);
    const untilStopped = runsUntilStopped(timer);
    const endRound = untilStopped
        ? fromRound + roundCount
        : Math.min(timer.repeats, fromRound + roundCount);
    const endMs = startedAt + workoutSeconds(timer) * 1000;
    const events: AlarmEvent[] = [];

    for (let round = fromRound; round < endRound; round++) {
        let at = startedAt + round * roundMs;
        for (const [stepIndex, step] of timer.steps.entries()) {
            if (round === waitingOn?.round && stepIndex === waitingOn.stepIndex) {
                events.push({ kind: 'work', at });
                return events;
            }
            // Done already, and takes no time on the clock
            if (step.kind === 'reps') {
                continue;
            }
            // Past the end only happens for rest at the end of the last round
            if (at < endMs) {
                events.push({ kind: step.kind, at });
            }
            at += stepSeconds(step) * 1000;
        }
    }

    if (!untilStopped && endRound === timer.repeats) {
        events.push({ kind: 'finish', at: endMs });
    }
    return events;
}
