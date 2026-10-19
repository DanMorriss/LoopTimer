import { UNTIL_STOPPED } from '../models/timer';
import { makeTimer, reps, rest, work } from '../shared/testing/make-timer';
import { alarmEvents } from './alarm-schedule';
import { timerStateAt } from './timer-state';

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

    describe('until stopped', () => {
        const forever = () => makeTimer({ repeats: UNTIL_STOPPED });

        it('lists the asked-for number of rounds, resting after each, with no finish', () => {
            const kinds = alarmEvents(forever(), 0, 0, 3).map((e) => e.kind);

            expect(kinds).toEqual(['work', 'rest', 'work', 'rest', 'work', 'rest']);
        });

        it('starts from a later round to top up a long workout', () => {
            const events = alarmEvents(forever(), 0, 50, 1);

            // Round 50 starts 50 x 40s in
            expect(events).toEqual([
                { kind: 'work', at: 2_000_000 },
                { kind: 'rest', at: 2_030_000 },
            ]);
        });
    });

    it('lists the rest of a finite workout from a later round, then the finish', () => {
        const kinds = alarmEvents(makeTimer(), 0, 2, 100).map((e) => e.kind);

        expect(kinds).toEqual(['work', 'finish']);
    });

    describe('several steps', () => {
        const circuit = makeTimer({
            steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20)],
            repeats: 2,
        });

        it('sounds at the start of every step, with work or rest to match', () => {
            expect(alarmEvents(circuit, 0)).toEqual([
                { kind: 'work', at: 0 },
                { kind: 'work', at: 30_000 },
                { kind: 'rest', at: 75_000 },
                { kind: 'work', at: 95_000 },
                { kind: 'work', at: 125_000 },
                // No rest after the last round: straight to the finish
                { kind: 'finish', at: 170_000 },
            ]);
        });

        it('lines up with the step changes in timerStateAt()', () => {
            const kinds = { work: 'work', rest: 'rest', finish: 'complete' } as const;

            for (const event of alarmEvents(circuit, 0)) {
                const state = timerStateAt(circuit, event.at);
                expect(state.phase).toBe(kinds[event.kind]);
                if (state.step) {
                    expect(state.phaseElapsedMs).toBe(0);
                }
            }
        });
    });

    describe('rep steps', () => {
        const circuit = makeTimer({ steps: [work(10), reps(20), rest(5)], repeats: 2 });

        it('sounds the work alarm as a rep step starts, and books nothing after it', () => {
            expect(alarmEvents(circuit, 1000)).toEqual([
                { kind: 'work', at: 1000 },
                { kind: 'work', at: 11_000 },
            ]);
        });

        it('carries on from the next step once it is done, with no alarm for it again', () => {
            // Done 30s in: the start has moved on by the 30s it took
            expect(alarmEvents(circuit, 31_000, 0, 100, 1)).toEqual([
                { kind: 'work', at: 31_000 },
                { kind: 'rest', at: 41_000 },
                { kind: 'work', at: 46_000 },
                { kind: 'work', at: 56_000 },
            ]);
        });

        it('books the finish once every rep step is done', () => {
            const events = alarmEvents(circuit, 0, 0, 100, 2);

            expect(events.map((event) => event.kind)).toEqual(['work', 'rest', 'work', 'finish']);
            expect(events.at(-1)!.at).toBe(25_000);
        });
    });
});
