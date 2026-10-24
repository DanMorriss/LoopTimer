import { UNTIL_STOPPED } from '../models/workout';
import { makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { alarmEvents } from './alarm-schedule';
import { workoutStateAt } from './workout-state';

describe('alarmEvents', () => {
    it('sounds at the start of each work and rest, then at the finish', () => {
        expect(alarmEvents(makeWorkout(), 1000)).toEqual([
            { kind: 'work', at: 1000 },
            { kind: 'rest', at: 31000 },
            { kind: 'work', at: 41000 },
            { kind: 'rest', at: 71000 },
            { kind: 'work', at: 81000 },
            { kind: 'finish', at: 111000 },
        ]);
    });

    it('has no rest alarms when the rest time is zero', () => {
        const kinds = alarmEvents(makeWorkout({ restSeconds: 0, repeats: 2 }), 0).map(
            (e) => e.kind
        );

        expect(kinds).toEqual(['work', 'work', 'finish']);
    });

    it('counts minutes as well as seconds', () => {
        const events = alarmEvents(
            makeWorkout({ workMinutes: 1, workSeconds: 5, restMinutes: 2, restSeconds: 0 }),
            0
        );

        expect(events[1]).toEqual({ kind: 'rest', at: 65000 });
        expect(events[2]).toEqual({ kind: 'work', at: 185000 });
    });

    it('lines up with the phase changes in workoutStateAt()', () => {
        const workout = makeWorkout({ workSeconds: 7, restSeconds: 3, repeats: 4 });
        const phaseFor = {
            work: 'work',
            rest: 'rest',
            finish: 'complete',
            countdown: null,
        } as const;

        for (const event of alarmEvents(workout, 0)) {
            expect(workoutStateAt(workout, event.at).phase).toBe(phaseFor[event.kind]);
            if (event.at > 0) {
                expect(workoutStateAt(workout, event.at - 1).phase).not.toBe(phaseFor[event.kind]);
            }
        }
    });

    describe('until stopped', () => {
        const forever = () => makeWorkout({ repeats: UNTIL_STOPPED });

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
        const kinds = alarmEvents(makeWorkout(), 0, 2, 100).map((e) => e.kind);

        expect(kinds).toEqual(['work', 'finish']);
    });

    describe('several steps', () => {
        const circuit = makeWorkout({
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

        it('lines up with the step changes in workoutStateAt()', () => {
            const kinds = {
                work: 'work',
                rest: 'rest',
                finish: 'complete',
                countdown: null,
            } as const;

            for (const event of alarmEvents(circuit, 0)) {
                const state = workoutStateAt(circuit, event.at);
                expect(state.phase).toBe(kinds[event.kind]);
                if (state.step) {
                    expect(state.phaseElapsedMs).toBe(0);
                }
            }
        });
    });

    describe('rep steps', () => {
        const circuit = makeWorkout({ steps: [work(10), reps(20), rest(5)], repeats: 2 });

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

describe('alarmEvents with a time limit', () => {
    it('stops the steps where time runs out, with a countdown, then the finish', () => {
        // 30s work, 10s rest, 100s: work at 0, 40 and 80, rest at 30 and 70
        const amrap = makeWorkout({ timeLimitSeconds: 100 });
        expect(alarmEvents(amrap, 0)).toEqual([
            { kind: 'work', at: 0 },
            { kind: 'rest', at: 30_000 },
            { kind: 'work', at: 40_000 },
            { kind: 'rest', at: 70_000 },
            { kind: 'work', at: 80_000 },
            { kind: 'countdown', at: 90_000 },
            { kind: 'countdown', at: 97_000 },
            { kind: 'countdown', at: 98_000 },
            { kind: 'countdown', at: 99_000 },
            { kind: 'finish', at: 100_000 },
        ]);
    });

    it('books the end while a rep step is waited on, less the time on rep steps done', () => {
        // 10s work, 20 reps, 5s rest, 60s. One rep step done in 20s, so the start moved on
        // 20s, and the end is still 60s after the real start
        const circuit = makeWorkout({ steps: [work(10), reps(20), rest(5)], timeLimitSeconds: 60 });
        const events = alarmEvents(circuit, 20_000, 0, 100, 1, 20_000);
        expect(events).toEqual([
            { kind: 'work', at: 20_000 },
            { kind: 'rest', at: 30_000 },
            { kind: 'work', at: 35_000 },
            { kind: 'work', at: 45_000 },
            { kind: 'countdown', at: 50_000 },
            { kind: 'countdown', at: 57_000 },
            { kind: 'countdown', at: 58_000 },
            { kind: 'countdown', at: 59_000 },
            { kind: 'finish', at: 60_000 },
        ]);
    });
});
