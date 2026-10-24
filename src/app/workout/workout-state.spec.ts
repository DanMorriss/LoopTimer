import { RepSet, TimedSet } from '../models/history';
import { Step, UNTIL_STOPPED } from '../models/workout';
import { makeWorkout, reps, rest, work } from '../shared/testing/make-workout';
import { nextRepStep, setsDone, stepsIntoRound, workoutStateAt } from './workout-state';

describe('workoutStateAt', () => {
    const workout = makeWorkout(); // 30s work, 10s rest, 3 rounds = 30 + 10 + 30 + 10 + 30 = 110s

    it('starts at the full work time on the first round', () => {
        expect(workoutStateAt(workout, 0)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 3,
            round: 0,
            phaseElapsedMs: 0,
        });
    });

    it('only counts whole seconds', () => {
        expect(workoutStateAt(workout, 999).remainingSeconds).toBe(30);
        expect(workoutStateAt(workout, 1000).remainingSeconds).toBe(29);
    });

    it('moves to rest the moment work runs out', () => {
        expect(workoutStateAt(workout, 29_999).phase).toBe('work');
        expect(workoutStateAt(workout, 30_000)).toEqual({
            phase: 'rest',
            step: rest(10),
            stepIndex: 1,
            remainingSeconds: 10,
            phaseSeconds: 10,
            roundsLeft: 3,
            round: 0,
            phaseElapsedMs: 0,
        });
    });

    it('starts the next round the moment rest runs out', () => {
        expect(workoutStateAt(workout, 40_000)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 2,
            round: 1,
            phaseElapsedMs: 0,
        });
    });

    it('has no rest after the last round and completes at the total time', () => {
        expect(workoutStateAt(workout, 109_999)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 1,
            phaseSeconds: 30,
            roundsLeft: 1,
            round: 2,
            phaseElapsedMs: 29_999,
        });
        expect(workoutStateAt(workout, 110_000)).toEqual({
            phase: 'complete',
            step: null,
            stepIndex: 0,
            remainingSeconds: 0,
            phaseSeconds: 0,
            roundsLeft: 0,
            round: 3,
            phaseElapsedMs: 0,
        });
    });

    it('stays complete long after the end', () => {
        expect(workoutStateAt(workout, 24 * 60 * 60 * 1000).phase).toBe('complete');
    });

    it('skips rest when the rest time is zero', () => {
        const noRest = makeWorkout({ restSeconds: 0, repeats: 2 });

        expect(workoutStateAt(noRest, 30_000)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 1,
            round: 1,
            phaseElapsedMs: 0,
        });
        expect(workoutStateAt(noRest, 60_000).phase).toBe('complete');
    });

    it('handles minutes as well as seconds', () => {
        const long = makeWorkout({
            workMinutes: 2,
            workSeconds: 5,
            restMinutes: 1,
            restSeconds: 0,
            repeats: 2,
        });

        expect(workoutStateAt(long, 125_000)).toEqual({
            phase: 'rest',
            step: rest(60),
            stepIndex: 1,
            remainingSeconds: 60,
            phaseSeconds: 60,
            roundsLeft: 2,
            round: 0,
            phaseElapsedMs: 0,
        });
    });

    it('reports exactly how far into the current phase it is, to the millisecond', () => {
        expect(workoutStateAt(workout, 12_345).phaseElapsedMs).toBe(12_345);
        expect(workoutStateAt(workout, 33_500).phaseElapsedMs).toBe(3_500);
        expect(workoutStateAt(workout, 52_250).phaseElapsedMs).toBe(12_250);
    });

    it('treats a start time in the future as not started yet', () => {
        expect(workoutStateAt(workout, -5000).remainingSeconds).toBe(30);
    });

    describe('until stopped', () => {
        const forever = makeWorkout({ repeats: UNTIL_STOPPED }); // 30s work, 10s rest, round after round

        it('never finishes', () => {
            const aDayIn = 24 * 60 * 60 * 1000;

            expect(workoutStateAt(forever, aDayIn).phase).not.toBe('complete');
        });

        it('keeps counting rounds, with no end in sight', () => {
            // 1000 rounds of 40s, then 5s into the next work phase
            const state = workoutStateAt(forever, 1000 * 40_000 + 5000);

            expect(state.phase).toBe('work');
            expect(state.round).toBe(1000);
            expect(state.roundsLeft).toBe(Infinity);
            expect(state.remainingSeconds).toBe(25);
        });

        it('rests after every round', () => {
            expect(workoutStateAt(forever, 999 * 40_000 + 30_000).phase).toBe('rest');
        });

        it('still works with no rest', () => {
            const state = workoutStateAt(
                makeWorkout({ repeats: UNTIL_STOPPED, restSeconds: 0 }),
                95_000
            );

            expect(state.round).toBe(3);
            expect(state.remainingSeconds).toBe(25);
        });
    });

    describe('several steps', () => {
        // Squats 30s, Plank 45s, rest 20s, Lunges 15s, rest 60s; 2 rounds
        const circuit = makeWorkout({
            steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20), work(15, 'Lunges'), rest(60)],
            repeats: 2,
        });

        it('runs the steps in order, each for its own time', () => {
            const at = (s: number) => workoutStateAt(circuit, s * 1000);

            expect(at(0).step).toEqual(work(30, 'Squats'));
            expect(at(29).step?.name).toBe('Squats');
            expect(at(30)).toMatchObject({
                step: work(45, 'Plank'),
                stepIndex: 1,
                remainingSeconds: 45,
            });
            expect(at(75)).toMatchObject({ phase: 'rest', stepIndex: 2, remainingSeconds: 20 });
            expect(at(95)).toMatchObject({ step: work(15, 'Lunges'), stepIndex: 3 });
            expect(at(110)).toMatchObject({ phase: 'rest', stepIndex: 4, remainingSeconds: 60 });
        });

        it('starts the next round from the first step', () => {
            expect(workoutStateAt(circuit, 170_000)).toMatchObject({
                step: work(30, 'Squats'),
                stepIndex: 0,
                round: 1,
                roundsLeft: 1,
            });
        });

        it('reports how far into the current step it is', () => {
            expect(workoutStateAt(circuit, 31_500).phaseElapsedMs).toBe(1_500);
            expect(workoutStateAt(circuit, 170_000 + 80_250).phaseElapsedMs).toBe(5_250);
        });

        it('skips the rest at the end of the last round', () => {
            // Round 2 starts at 170s; its Lunges end at 170 + 110 = 280s
            expect(workoutStateAt(circuit, 279_999).step?.name).toBe('Lunges');
            expect(workoutStateAt(circuit, 280_000).phase).toBe('complete');
        });

        it('skips every rest step at the end of the last round, not just one', () => {
            const twoRests = makeWorkout({ steps: [work(10), rest(5), rest(5)], repeats: 2 });

            expect(workoutStateAt(twoRests, 29_999).phase).toBe('work');
            expect(workoutStateAt(twoRests, 30_000).phase).toBe('complete');
        });

        it('keeps rest at the start of a round', () => {
            const warmUp = makeWorkout({ steps: [rest(5, 'Get ready'), work(10)], repeats: 2 });

            expect(workoutStateAt(warmUp, 15_000).step).toEqual(rest(5, 'Get ready'));
            expect(workoutStateAt(warmUp, 30_000).phase).toBe('complete');
        });

        it('runs back-to-back work steps as separate steps', () => {
            const twoWork = makeWorkout({ steps: [work(10, 'A'), work(10, 'B')], repeats: 1 });

            expect(workoutStateAt(twoWork, 10_000)).toMatchObject({
                phase: 'work',
                stepIndex: 1,
                phaseElapsedMs: 0,
            });
        });
    });

    describe('rep steps', () => {
        // 10s work, 20 push-ups, 5s rest; 2 rounds
        const circuit = makeWorkout({
            steps: [work(10), reps(20, 'Push-ups'), rest(5)],
            repeats: 2,
        });

        it('waits on a rep step once the clock reaches it, however long it runs', () => {
            for (const at of [10_000, 11_500, 600_000]) {
                expect(workoutStateAt(circuit, at, 0)).toEqual({
                    phase: 'reps',
                    step: reps(20, 'Push-ups'),
                    stepIndex: 1,
                    remainingSeconds: 0,
                    phaseSeconds: 0,
                    roundsLeft: 2,
                    round: 0,
                    phaseElapsedMs: at - 10_000,
                });
            }
        });

        it('carries on from where the rep step began once it is done', () => {
            expect(workoutStateAt(circuit, 10_000, 1)).toMatchObject({
                phase: 'rest',
                stepIndex: 2,
                remainingSeconds: 5,
                phaseElapsedMs: 0,
            });
            expect(workoutStateAt(circuit, 15_000, 1)).toMatchObject({
                phase: 'work',
                round: 1,
                stepIndex: 0,
            });
        });

        it("waits on the next round's rep step in turn", () => {
            expect(workoutStateAt(circuit, 25_000, 1)).toMatchObject({
                phase: 'reps',
                round: 1,
                stepIndex: 1,
                roundsLeft: 1,
            });
            // Last round: its rest is skipped, so Done finishes the workout
            expect(workoutStateAt(circuit, 25_000, 2).phase).toBe('complete');
        });

        it('finishes only after a rep step at the very end is done', () => {
            const finisher = makeWorkout({ steps: [work(10), reps(10)], repeats: 1 });

            expect(workoutStateAt(finisher, 60_000, 0).phase).toBe('reps');
            expect(workoutStateAt(finisher, 10_000, 1).phase).toBe('complete');
        });

        it('runs a round of only rep steps, with no countdown at all', () => {
            const allReps = makeWorkout({ steps: [reps(10, 'A'), reps(5, 'B')], repeats: 2 });

            expect(workoutStateAt(allReps, 0, 0)).toMatchObject({ phase: 'reps', stepIndex: 0 });
            expect(workoutStateAt(allReps, 0, 1)).toMatchObject({ phase: 'reps', stepIndex: 1 });
            expect(workoutStateAt(allReps, 0, 3)).toMatchObject({ round: 1, stepIndex: 1 });
            expect(workoutStateAt(allReps, 0, 4).phase).toBe('complete');
        });

        it('keeps going until stopped', () => {
            const forever = makeWorkout({ steps: [reps(10), work(5)], repeats: UNTIL_STOPPED });

            expect(workoutStateAt(forever, 50_000, 10)).toMatchObject({
                phase: 'reps',
                round: 10,
                roundsLeft: Infinity,
            });
        });

        it('finds the next rep step to do, and where it falls on the clock', () => {
            expect(nextRepStep(circuit, 0)).toEqual({ round: 0, stepIndex: 1, atMs: 10_000 });
            expect(nextRepStep(circuit, 1)).toEqual({ round: 1, stepIndex: 1, atMs: 25_000 });
            expect(nextRepStep(circuit, 2)).toBeNull();
            expect(nextRepStep(makeWorkout(), 0)).toBeNull();
        });
    });
});

describe('setsDone', () => {
    const plank: Step = { kind: 'work', seconds: 45, name: 'Plank', exerciseId: 'builtin:plank' };
    const pushUp: RepSet = { round: 0, step: 1, name: 'Push-ups', reps: 20 };
    // 45s plank, push-ups, 15s rest, an unnamed 10s work step; 2 rounds
    const workout = makeWorkout({
        steps: [plank, reps(20, 'Push-ups'), rest(15), work(10)],
        repeats: 2,
    });
    const timed = (round: number): TimedSet => ({
        round,
        step: 0,
        name: 'Plank',
        seconds: 45,
        exerciseId: 'builtin:plank',
    });

    it('logs a timed step of an exercise once it has run to its end', () => {
        expect(setsDone(workout, workoutStateAt(workout, 44_999), [])).toEqual([]);
        expect(setsDone(workout, workoutStateAt(workout, 45_000), [])).toEqual([timed(0)]);
    });

    it('puts the timed sets among the rep sets, in the order they were done', () => {
        const pushUps = [pushUp, { ...pushUp, round: 1 }];
        const complete = workoutStateAt(workout, 1_000_000, 2);

        expect(complete.phase).toBe('complete');
        expect(setsDone(workout, complete, pushUps)).toEqual([
            timed(0),
            pushUps[0],
            timed(1),
            pushUps[1],
        ]);
    });

    it('leaves out rest and unnamed steps, which are no exercise', () => {
        const unnamed = makeWorkout({ steps: [work(30)], repeats: 2 });

        expect(setsDone(unnamed, workoutStateAt(unnamed, 100_000), [])).toEqual([]);
    });
});

describe('a time limit', () => {
    // 30s work, 10s rest, as many rounds as fit in 100s: two full rounds, then 20s of work
    const amrap = makeWorkout({ timeLimitSeconds: 100 });

    it('runs rounds on, counting up, with no rounds left to count', () => {
        const state = workoutStateAt(amrap, 85_000);
        expect(state.phase).toBe('work');
        expect(state.round).toBe(2);
        expect(state.roundsLeft).toBe(Infinity);
        expect(state.remainingSeconds).toBe(25);
    });

    it("is complete when time's up, part-way through a step, which isn't done", () => {
        const state = workoutStateAt(amrap, 100_000);
        expect(state.phase).toBe('complete');
        expect(state.step).toBeNull();
        expect(state.round).toBe(2);
        expect(state.stepIndex).toBe(0);
        expect(stepsIntoRound(amrap, state)).toBe(0);
        expect(workoutStateAt(amrap, 99_999).phase).toBe('work');
    });

    it('counts a round time ran out at the end of as done', () => {
        const state = workoutStateAt(makeWorkout({ timeLimitSeconds: 80 }), 80_000);
        expect(state.phase).toBe('complete');
        expect(state.round).toBe(2);
        expect(state.stepIndex).toBe(0);
    });

    describe('with rep steps, whose time counts too', () => {
        // 10s work, 20 reps, 5s rest, as many rounds as fit in 60s
        const circuit = makeWorkout({ steps: [work(10), reps(20), rest(5)], timeLimitSeconds: 60 });

        it('counts the time on rep steps done towards it', () => {
            // One round's rep step took 30s: 15s of clock + 30s of reps, so 15s are left
            expect(workoutStateAt(circuit, 15_000, 1, 30_000).phase).toBe('work');
            expect(workoutStateAt(circuit, 29_999, 1, 30_000).phase).toBe('reps');
            const state = workoutStateAt(circuit, 30_000, 1, 30_000);
            expect(state.phase).toBe('complete');
            // Waiting on round 2's rep step when time ran out: the work before it was done
            expect(state.round).toBe(1);
            expect(state.stepIndex).toBe(1);
            expect(stepsIntoRound(circuit, state)).toBe(1);
        });

        it('runs out while a rep step is waited on', () => {
            // The first rep step started at 10s and is still going at 60s
            expect(workoutStateAt(circuit, 59_999).phase).toBe('reps');
            const state = workoutStateAt(circuit, 60_000);
            expect(state.phase).toBe('complete');
            expect(state.round).toBe(0);
            expect(state.stepIndex).toBe(1);
        });
    });

    it('logs the timed sets before the step time ran out in, and not that one', () => {
        const plank = {
            kind: 'work' as const,
            seconds: 30,
            name: 'Plank',
            exerciseId: 'builtin:plank',
        };
        const workout = makeWorkout({ steps: [plank, rest(10)], timeLimitSeconds: 100 });
        const sets = setsDone(workout, workoutStateAt(workout, 100_000), []);
        expect(sets.map((set) => set.round)).toEqual([0, 1]);
    });
});
