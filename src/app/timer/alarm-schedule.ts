import { Timer } from '../models/timer';

export type AlarmKind = 'work' | 'rest' | 'finish';

export interface AlarmEvent {
    kind: AlarmKind;
    /** When it should sound, in ms since the epoch. */
    at: number;
}

/**
 * Every alarm in a workout, in order: the start of each work and rest phase, then the
 * finish. Uses the same timings as `timerStateAt()`, so they line up with the countdown.
 */
export function alarmEvents(timer: Timer, startedAt: number): AlarmEvent[] {
    const workMs = (timer.timerMinutes * 60 + timer.timerSeconds) * 1000;
    const restMs = (timer.restMinutes * 60 + timer.restSeconds) * 1000;
    const events: AlarmEvent[] = [];

    for (let round = 0; round < timer.repeats; round++) {
        const roundStart = startedAt + round * (workMs + restMs);
        events.push({ kind: 'work', at: roundStart });
        // No rest after the last round
        if (restMs > 0 && round < timer.repeats - 1) {
            events.push({ kind: 'rest', at: roundStart + workMs });
        }
    }

    const total = timer.repeats * workMs + (timer.repeats - 1) * restMs;
    events.push({ kind: 'finish', at: startedAt + total });
    return events;
}
