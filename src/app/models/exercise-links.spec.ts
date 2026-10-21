import { BUILT_IN_EXERCISES } from './built-in-exercises';
import { Exercise, exerciseKey, MeasuredBy, OwnExercise } from './exercise';
import { ExerciseFinder, findByName, linkSets, linkSteps } from './exercise-links';
import { Step } from './timer';

function own(id: string, name: string, otherNames: string[] = []): OwnExercise {
    return {
        id,
        updatedAt: 1,
        name,
        otherNames,
        equipment: [],
        measuredBy: 'reps',
        mainMuscles: [],
        supportingMuscles: [],
        description: '',
        steps: [],
        tips: [],
    };
}

/** Finds among the built-in exercises and `mine`, making new ones into `mine`. */
function finder(mine: OwnExercise[] = []): ExerciseFinder & { made: [string, MeasuredBy][] } {
    const made: [string, MeasuredBy][] = [];
    return {
        made,
        find: (name) => findByName(name, [...BUILT_IN_EXERCISES, ...mine] as Exercise[]),
        create: (name, measuredBy) => {
            made.push([name, measuredBy]);
            const exercise = own(`own-${made.length}`, name);
            mine.push(exercise);
            return exercise;
        },
    };
}

describe('exerciseKey', () => {
    it('ignores case, spaces and a plural "s"', () => {
        expect(exerciseKey('  Squats ')).toBe(exerciseKey('squat'));
        expect(exerciseKey('Push-ups')).toBe(exerciseKey('push-up'));
        expect(exerciseKey('Bench   press')).toBe(exerciseKey('bench press'));
        expect(exerciseKey('Deadlift')).not.toBe(exerciseKey('Deadlifts plus'));
    });
});

describe('findByName', () => {
    const exercises = [
        ...BUILT_IN_EXERCISES,
        own('mine', 'Zercher squat', ['Zerchers']),
    ] as Exercise[];

    it('finds a built-in exercise by its name or other names', () => {
        expect(findByName('Push-ups', exercises)?.id).toBe('builtin:push-up');
        expect(findByName('press-ups', exercises)?.id).toBe('builtin:push-up');
        expect(findByName('Squats', exercises)?.id).toBe('builtin:back-squat');
    });

    it('finds your own exercise the same way', () => {
        expect(findByName('zercher squats', exercises)?.id).toBe('mine');
        expect(findByName('Zerchers', exercises)?.id).toBe('mine');
    });

    it('finds nothing for a name no exercise has, or no name', () => {
        expect(findByName('Wall walks', exercises)).toBeUndefined();
        expect(findByName('  ', exercises)).toBeUndefined();
    });
});

describe('linkSteps', () => {
    const steps: Step[] = [
        { kind: 'reps', reps: 10, name: 'Squats' },
        { kind: 'rest', seconds: 60, name: 'Breathe', exerciseId: 'stale' },
        { kind: 'work', seconds: 30, name: 'Wall sit hold' },
        { kind: 'reps', reps: 5, name: '' },
        { kind: 'work', seconds: 20, name: 'wall sit holds' },
    ];

    it('links named work steps by name, built-in first, making your own where none matches', () => {
        const exercises = finder();

        const linked = linkSteps(steps, exercises);

        expect(linked.map((s) => s.exerciseId)).toEqual([
            'builtin:back-squat',
            undefined,
            'own-1',
            undefined,
            // The same name, so the same exercise: one is made, not two
            'own-1',
        ]);
        expect(exercises.made).toEqual([['Wall sit hold', 'timed']]);
    });

    it("makes a rep step's exercise measured by reps", () => {
        const exercises = finder();

        linkSteps([{ kind: 'reps', reps: 8, name: 'Ring row' }], exercises);

        expect(exercises.made).toEqual([['Ring row', 'reps']]);
    });

    it('takes away any link from a rest or an unnamed step, keeping the rest of the step', () => {
        const linked = linkSteps(
            [
                { kind: 'rest', seconds: 60, name: 'Breathe', exerciseId: 'stale' },
                { kind: 'reps', reps: 5, name: ' ', exerciseId: 'stale', weight: 20 },
            ],
            finder()
        );

        expect(linked).toEqual([
            { kind: 'rest', seconds: 60, name: 'Breathe' },
            { kind: 'reps', reps: 5, name: ' ', weight: 20 },
        ]);
    });

    it('links a renamed step anew, since the name chooses the exercise', () => {
        const [linked] = linkSteps(
            [{ kind: 'reps', reps: 10, name: 'Push-ups', exerciseId: 'builtin:back-squat' }],
            finder()
        );

        expect(linked.exerciseId).toBe('builtin:push-up');
    });
});

describe('linkSets', () => {
    it('links named sets with no exercise yet, and leaves linked and unnamed ones be', () => {
        const exercises = finder();

        const linked = linkSets(
            [
                { round: 0, step: 0, name: 'Squats', reps: 10 },
                { round: 0, step: 1, name: 'Squats', reps: 8, exerciseId: 'kept' },
                { round: 0, step: 2, name: '', reps: 5 },
                { round: 0, step: 3, name: 'Sled push', reps: 3 },
            ],
            exercises
        );

        expect(linked.map((s) => s.exerciseId)).toEqual([
            'builtin:back-squat',
            'kept',
            undefined,
            'own-1',
        ]);
        expect(exercises.made).toEqual([['Sled push', 'reps']]);
    });
});
