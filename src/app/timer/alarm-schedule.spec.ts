import { Timer } from '../models/timer';
import { alarmEvents } from './alarm-schedule';
import { timerStateAt } from './timer-state';

function makeTimer(overrides: Partial<Timer> = {}): Timer {
    return {
        id: 1,
        title: 'Intervals',
        timerMinutes: 0,
        timerSeconds: 30,
        restMinutes: 0,
        restSeconds: 10,
        repeats: 3,
        isTimerActive: false,
        isRestActive: false,
        isComplete: false,
        ...overrides,
    };
}

describe('alarmEvents', () => {
    it('sounds at the start of each work and rest, then at the finish', () => {
        expect(alarmEvents(makeTimer(), 1000)).toEqual([
            { kind: 'work', at: 1000 },
            { kind: 'rest', at: 31000 },
            { kind: 'work', at: 41000 },
            { kind: 'rest', at: 71000 },
            { kind: 'work', at: 81000 },
            { kind: 'finish', at: 111000 },
        ]);
    });

    it('has no rest alarms when the rest time is zero', () => {
        const kinds = alarmEvents(makeTimer({ restSeconds: 0, repeats: 2 }), 0).map((e) => e.kind);

        expect(kinds).toEqual(['work', 'work', 'finish']);
    });

    it('counts minutes as well as seconds', () => {
        const events = alarmEvents(
            makeTimer({ timerMinutes: 1, timerSeconds: 5, restMinutes: 2, restSeconds: 0 }),
            0
        );

        expect(events[1]).toEqual({ kind: 'rest', at: 65000 });
        expect(events[2]).toEqual({ kind: 'work', at: 185000 });
    });

    it('lines up with the phase changes in timerStateAt()', () => {
        const timer = makeTimer({ timerSeconds: 7, restSeconds: 3, repeats: 4 });
        const phaseFor = { work: 'work', rest: 'rest', finish: 'complete' } as const;

        for (const event of alarmEvents(timer, 0)) {
            expect(timerStateAt(timer, event.at).phase).toBe(phaseFor[event.kind]);
            if (event.at > 0) {
                expect(timerStateAt(timer, event.at - 1).phase).not.toBe(phaseFor[event.kind]);
            }
        }
    });
});
