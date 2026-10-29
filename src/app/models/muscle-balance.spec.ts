import { makeWorkout, reps, rest } from '../shared/testing/make-workout';
import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { HistoryEntry, LoggedSet } from './history';
import { muscleBalance, muscleStatus, setsByMuscle, suggestNextWorkout } from './muscle-balance';
import { Step } from './workout';
import { ALL_MUSCLES } from './workout-muscles';

const byId = (id: string) => BUILT_IN_EXERCISES.find((exercise) => exercise.id === id);
const linked = (step: Step, exerciseId: string): Step => ({ ...step, exerciseId });

function entry(...exerciseIds: (string | undefined)[]): HistoryEntry {
    const sets: LoggedSet[] = exerciseIds.map((exerciseId, step) => ({
        round: 0,
        step,
        name: '',
        reps: 10,
        exerciseId,
    }));
    return {
        id: '1-w',
        workoutId: 'w',
        title: 'Workout',
        startedAt: 1,
        endedAt: 2,
        updatedAt: 2,
        activeSeconds: 1,
        roundsCompleted: 1,
        totalRounds: 1,
        outcome: 'finished',
        sets,
    };
}

describe('setsByMuscle', () => {
    it('counts 1 a set for main muscles and ½ for supporting ones', () => {
        // Back squat: quads and glutes, helped by the hamstrings, adductors and lower back
        const counts = setsByMuscle([entry('builtin:back-squat', 'builtin:back-squat')], byId);

        expect(Object.fromEntries(counts)).toEqual({
            quads: 2,
            glutes: 2,
            hamstrings: 1,
            adductors: 1,
            'lower-back': 1,
        });
    });

    it("leaves out sets with no exercise, or one that's gone", () => {
        expect(setsByMuscle([entry(undefined, 'own:deleted')], byId).size).toBe(0);
    });

    it('counts a left and a right side as one set between them', () => {
        const sided = entry('builtin:back-squat', 'builtin:back-squat');
        sided.sets = sided.sets!.map((set, i) => ({
            ...set,
            step: 0,
            side: i === 0 ? 'left' : 'right',
        }));

        expect(setsByMuscle([sided], byId).get('quads')).toBe(1);
        expect(setsByMuscle([sided], byId).get('hamstrings')).toBe(0.5);
    });
});

describe('muscleStatus', () => {
    it('is under below 10 sets, in range from 10 to 20, and over past 20', () => {
        expect([0, 9.5, 10, 20, 20.5].map(muscleStatus)).toEqual([
            'under',
            'under',
            'in-range',
            'in-range',
            'over',
        ]);
    });
});

describe('muscleBalance', () => {
    it('lists every muscle group, most worked first and A to Z on a tie', () => {
        const balance = muscleBalance(
            new Map([
                ['quads', 12],
                ['chest', 22],
                ['glutes', 12],
            ])
        );

        expect(balance).toHaveLength(ALL_MUSCLES.length);
        expect(balance.slice(0, 4)).toEqual([
            { muscle: 'chest', sets: 22, status: 'over' },
            { muscle: 'glutes', sets: 12, status: 'in-range' },
            { muscle: 'quads', sets: 12, status: 'in-range' },
            { muscle: 'abductors', sets: 0, status: 'under' },
        ]);
    });
});

describe('suggestNextWorkout', () => {
    const legs = makeWorkout({
        id: 'legs',
        title: 'Legs',
        steps: [linked(reps(5), 'builtin:back-squat'), rest(60)],
    });
    const push = makeWorkout({
        id: 'push',
        title: 'Push',
        steps: [linked(reps(5), 'builtin:bench-press')],
    });
    const calves = makeWorkout({
        id: 'calves',
        title: 'Calves',
        steps: [linked(reps(15), 'builtin:calf-raise')],
    });

    it('picks the workout for the least worked muscles, with them least first', () => {
        const counts = new Map([
            ['quads', 12],
            ['glutes', 10],
            ['chest', 3],
            ['triceps', 6],
        ] as const);

        expect(suggestNextWorkout([legs, push], counts, byId, new Map())).toEqual({
            workout: push,
            muscles: ['chest'],
        });
    });

    it('on a tie, picks the one done longest ago, and one never done before that', () => {
        const lastDone = new Map([
            ['legs', 200],
            ['push', 100],
        ]);

        expect(suggestNextWorkout([legs, push], new Map(), byId, lastDone)?.workout).toBe(push);
        expect(suggestNextWorkout([legs, push, calves], new Map(), byId, lastDone)?.workout).toBe(
            calves
        );
    });

    it('is null when no workout has a step linked to an exercise', () => {
        expect(suggestNextWorkout([makeWorkout()], new Map(), byId, new Map())).toBeNull();
    });
});
