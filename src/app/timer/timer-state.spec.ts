import { UNTIL_STOPPED } from '../models/timer';
import { makeTimer, rest, work } from '../shared/testing/make-timer';
import { timerStateAt } from './timer-state';

describe('timerStateAt', () => {
    const timer = makeTimer(); // 30s work, 10s rest, 3 rounds = 30 + 10 + 30 + 10 + 30 = 110s

    it('starts at the full work time on the first round', () => {
        expect(timerStateAt(timer, 0)).toEqual({
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
        expect(timerStateAt(timer, 999).remainingSeconds).toBe(30);
        expect(timerStateAt(timer, 1000).remainingSeconds).toBe(29);
    });

    it('moves to rest the moment work runs out', () => {
        expect(timerStateAt(timer, 29_999).phase).toBe('work');
        expect(timerStateAt(timer, 30_000)).toEqual({
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
        expect(timerStateAt(timer, 40_000)).toEqual({
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
        expect(timerStateAt(timer, 109_999)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 1,
            phaseSeconds: 30,
            roundsLeft: 1,
            round: 2,
            phaseElapsedMs: 29_999,
        });
        expect(timerStateAt(timer, 110_000)).toEqual({
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
        expect(timerStateAt(timer, 24 * 60 * 60 * 1000).phase).toBe('complete');
    });

    it('skips rest when the rest time is zero', () => {
        const noRest = makeTimer({ restSeconds: 0, repeats: 2 });

        expect(timerStateAt(noRest, 30_000)).toEqual({
            phase: 'work',
            step: work(30),
            stepIndex: 0,
            remainingSeconds: 30,
            phaseSeconds: 30,
            roundsLeft: 1,
            round: 1,
            phaseElapsedMs: 0,
        });
        expect(timerStateAt(noRest, 60_000).phase).toBe('complete');
    });

    it('handles minutes as well as seconds', () => {
        const long = makeTimer({
            timerMinutes: 2,
            timerSeconds: 5,
            restMinutes: 1,
            restSeconds: 0,
            repeats: 2,
        });

        expect(timerStateAt(long, 125_000)).toEqual({
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
        expect(timerStateAt(timer, 12_345).phaseElapsedMs).toBe(12_345);
        expect(timerStateAt(timer, 33_500).phaseElapsedMs).toBe(3_500);
        expect(timerStateAt(timer, 52_250).phaseElapsedMs).toBe(12_250);
    });

    it('treats a start time in the future as not started yet', () => {
        expect(timerStateAt(timer, -5000).remainingSeconds).toBe(30);
    });

    describe('until stopped', () => {
        const forever = makeTimer({ repeats: UNTIL_STOPPED }); // 30s work, 10s rest, round after round

        it('never finishes', () => {
            const aDayIn = 24 * 60 * 60 * 1000;

            expect(timerStateAt(forever, aDayIn).phase).not.toBe('complete');
        });

        it('keeps counting rounds, with no end in sight', () => {
            // 1000 rounds of 40s, then 5s into the next work phase
            const state = timerStateAt(forever, 1000 * 40_000 + 5000);

            expect(state.phase).toBe('work');
            expect(state.round).toBe(1000);
            expect(state.roundsLeft).toBe(Infinity);
            expect(state.remainingSeconds).toBe(25);
        });

        it('rests after every round', () => {
            expect(timerStateAt(forever, 999 * 40_000 + 30_000).phase).toBe('rest');
        });

        it('still works with no rest', () => {
            const state = timerStateAt(
                makeTimer({ repeats: UNTIL_STOPPED, restSeconds: 0 }),
                95_000
            );

            expect(state.round).toBe(3);
            expect(state.remainingSeconds).toBe(25);
        });
    });

    describe('several steps', () => {
        // Squats 30s, Plank 45s, rest 20s, Lunges 15s, rest 60s; 2 rounds
        const circuit = makeTimer({
            steps: [work(30, 'Squats'), work(45, 'Plank'), rest(20), work(15, 'Lunges'), rest(60)],
            repeats: 2,
        });

        it('runs the steps in order, each for its own time', () => {
            const at = (s: number) => timerStateAt(circuit, s * 1000);

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
            expect(timerStateAt(circuit, 170_000)).toMatchObject({
                step: work(30, 'Squats'),
                stepIndex: 0,
                round: 1,
                roundsLeft: 1,
            });
        });

        it('reports how far into the current step it is', () => {
            expect(timerStateAt(circuit, 31_500).phaseElapsedMs).toBe(1_500);
            expect(timerStateAt(circuit, 170_000 + 80_250).phaseElapsedMs).toBe(5_250);
        });

        it('skips the rest at the end of the last round', () => {
            // Round 2 starts at 170s; its Lunges end at 170 + 110 = 280s
            expect(timerStateAt(circuit, 279_999).step?.name).toBe('Lunges');
            expect(timerStateAt(circuit, 280_000).phase).toBe('complete');
        });

        it('skips every rest step at the end of the last round, not just one', () => {
            const twoRests = makeTimer({ steps: [work(10), rest(5), rest(5)], repeats: 2 });

            expect(timerStateAt(twoRests, 29_999).phase).toBe('work');
            expect(timerStateAt(twoRests, 30_000).phase).toBe('complete');
        });

        it('keeps rest at the start of a round', () => {
            const warmUp = makeTimer({ steps: [rest(5, 'Get ready'), work(10)], repeats: 2 });

            expect(timerStateAt(warmUp, 15_000).step).toEqual(rest(5, 'Get ready'));
            expect(timerStateAt(warmUp, 30_000).phase).toBe('complete');
        });

        it('runs back-to-back work steps as separate steps', () => {
            const twoWork = makeTimer({ steps: [work(10, 'A'), work(10, 'B')], repeats: 1 });

            expect(timerStateAt(twoWork, 10_000)).toMatchObject({
                phase: 'work',
                stepIndex: 1,
                phaseElapsedMs: 0,
            });
        });
    });
});
