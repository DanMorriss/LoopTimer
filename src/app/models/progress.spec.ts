import { HistoryEntry, LoggedSet } from './history';
import {
    estimatedOneRepMax,
    exerciseBests,
    ExerciseSession,
    progressMeasure,
    sessionsByExercise,
    sessionValue,
} from './progress';

const squat = (reps: number, weight?: number, round = 0): LoggedSet => ({
    round,
    step: 0,
    name: 'Squats',
    reps,
    ...(weight === undefined ? {} : { weight }),
    exerciseId: 'squat',
});
const plank = (seconds: number, round = 0): LoggedSet => ({
    round,
    step: 1,
    name: 'Plank',
    seconds,
    exerciseId: 'plank',
});

function entry(startedAt: number, sets: LoggedSet[], title = 'Legs'): HistoryEntry {
    return {
        id: `${startedAt}-w`,
        workoutId: 'w',
        title,
        startedAt,
        endedAt: startedAt + 1000,
        updatedAt: startedAt + 1000,
        activeSeconds: 60,
        roundsCompleted: 1,
        totalRounds: 1,
        outcome: 'finished',
        sets,
    };
}

function session(startedAt: number, sets: LoggedSet[]): ExerciseSession {
    return { entryId: `${startedAt}-w`, startedAt, title: 'Legs', sets };
}

describe('progress', () => {
    describe('sessionsByExercise', () => {
        it("gathers each exercise's sets per workout, newest first", () => {
            const history = [
                entry(2000, [squat(8, 60), plank(45), squat(8, 60, 1)]),
                entry(1000, [squat(10, 50)]),
            ];

            const sessions = sessionsByExercise(history);

            expect(sessions.get('squat')).toEqual([
                session(2000, [squat(8, 60), squat(8, 60, 1)]),
                session(1000, [squat(10, 50)]),
            ]);
            expect(sessions.get('plank')).toEqual([session(2000, [plank(45)])]);
        });

        it('leaves out sets with no exercise', () => {
            const { exerciseId: _id, ...unnamed } = squat(10) as LoggedSet & { exerciseId: string };

            expect(sessionsByExercise([entry(1000, [unnamed])]).size).toBe(0);
        });
    });

    it('measures by weight where any set had one, then reps, then time', () => {
        expect(progressMeasure([session(1, [squat(10), squat(5, 20)])])).toBe('weight');
        expect(progressMeasure([session(1, [squat(10)])])).toBe('reps');
        expect(progressMeasure([session(1, [plank(30)])])).toBe('time');
        expect(progressMeasure([])).toBeNull();
    });

    it('estimates a one-rep max by the Epley formula, with one rep as the weight itself', () => {
        expect(estimatedOneRepMax(60, 10)).toBe(80);
        expect(estimatedOneRepMax(100, 1)).toBe(100);
    });

    describe('exerciseBests', () => {
        it('finds the heaviest, the best estimate and the most reps', () => {
            const bests = exerciseBests([
                session(3000, [squat(3, 100)]),
                session(2000, [squat(12, 60), squat(12, 40)]),
                session(1000, [squat(8, 90)]),
            ]);

            expect(bests.heaviest).toEqual({ at: 3000, entryId: '3000-w', weight: 100, reps: 3 });
            // 90 × (1 + 8/30) = 114, more than 100 × 1.1 = 110
            expect(bests.oneRepMax).toMatchObject({ at: 1000, weight: 90, reps: 8 });
            expect(bests.oneRepMax!.estimate).toBeCloseTo(114);
            expect(bests.mostReps).toEqual({ at: 2000, entryId: '2000-w', reps: 12, weight: 60 });
            expect(bests.longest).toBeUndefined();
        });

        it('keeps the first time a best was set, when it was matched later', () => {
            const bests = exerciseBests([
                session(2000, [squat(5, 80)]),
                session(1000, [squat(5, 80)]),
            ]);

            expect(bests.heaviest?.at).toBe(1000);
            expect(bests.mostReps?.at).toBe(1000);
        });

        it('counts more reps at the heaviest weight as heavier', () => {
            const bests = exerciseBests([session(1000, [squat(3, 80), squat(5, 80)])]);

            expect(bests.heaviest).toMatchObject({ weight: 80, reps: 5 });
        });

        it('has only most reps for a bodyweight exercise, and the longest for a timed one', () => {
            expect(exerciseBests([session(1000, [squat(20)])])).toEqual({
                mostReps: { at: 1000, entryId: '1000-w', reps: 20 },
            });
            expect(exerciseBests([session(1000, [plank(45), plank(60, 1)])])).toEqual({
                longest: { at: 1000, entryId: '1000-w', seconds: 60 },
            });
        });
    });

    it("gives a session's point by the measure: best estimate, most reps or longest", () => {
        const sets = session(1000, [squat(10, 60), squat(3, 70), squat(15)]);

        expect(sessionValue(sets, 'weight')).toBe(80);
        expect(sessionValue(sets, 'reps')).toBe(15);
        expect(sessionValue(sets, 'time')).toBeNull();
        expect(sessionValue(session(1000, [squat(15)]), 'weight')).toBeNull();
        expect(sessionValue(session(1000, [plank(30), plank(40)]), 'time')).toBe(40);
    });
});
