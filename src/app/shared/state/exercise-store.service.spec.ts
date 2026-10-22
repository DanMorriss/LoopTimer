import { TestBed } from '@angular/core/testing';
import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import { MAX_EXERCISE_NOTE_LENGTH } from '../../models/exercise';
import {
    EXERCISE_NOTES_KEY,
    EXERCISES_KEY,
    ExerciseStore,
    readExerciseNote,
    readOwnExercise,
} from './exercise-store.service';

const NOW = 5_000_000;
const saved = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null');

describe('ExerciseStore', () => {
    beforeEach(() => {
        localStorage.clear();
        localStorage.setItem('data-version', '4');
        vi.spyOn(Date, 'now').mockReturnValue(NOW);
    });
    afterEach(() => localStorage.clear());

    const createStore = () => TestBed.inject(ExerciseStore);

    it('has every built-in exercise, and none of your own to begin with', () => {
        const store = createStore();

        expect(store.exercises()).toEqual(BUILT_IN_EXERCISES);
        expect(store.own()).toEqual([]);
    });

    it('makes an exercise of your own, tidied, dated and saved, listed after the built-in ones', () => {
        const store = createStore();

        const made = store.addOwn('  Zercher   squat ', 'reps');

        expect(made).toEqual({
            id: expect.stringMatching(/^[0-9a-f-]{36}$/),
            updatedAt: NOW,
            name: 'Zercher squat',
            otherNames: [],
            equipment: [],
            measuredBy: 'reps',
            mainMuscles: [],
            supportingMuscles: [],
            description: '',
            steps: [],
            tips: [],
        });
        expect(store.exercises().at(-1)).toEqual(made);
        expect(store.byId(made.id)).toEqual(made);
        expect(saved(EXERCISES_KEY)).toEqual([made]);
    });

    it('finds by name for linking, and makes your own when nothing matches', () => {
        const store = createStore();

        expect(store.finder.find('deadlifts')?.id).toBe('builtin:deadlift');
        const made = store.finder.create('Sled push', 'reps');
        expect(store.finder.find('sled pushes')).toBeUndefined();
        expect(store.finder.find('Sled push')?.id).toBe(made.id);
    });

    it('loads your saved exercises, dropping broken ones', () => {
        const good = createStore().addOwn('Sled push', 'reps');
        localStorage.setItem(
            EXERCISES_KEY,
            JSON.stringify([
                good,
                { id: 'builtin:fake', name: 'X', measuredBy: 'reps', updatedAt: 1 },
                'x',
            ])
        );
        TestBed.resetTestingModule();

        expect(createStore().own()).toEqual([good]);
    });

    describe('changing your own exercise', () => {
        const details = {
            name: 'Sled push',
            measuredBy: 'reps' as const,
            equipment: [],
            mainMuscles: [],
            supportingMuscles: [],
            description: '',
        };

        it('renames it and saves its details, tidied and dated', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');
            vi.spyOn(Date, 'now').mockReturnValue(NOW + 1);

            const updated = store.updateOwn(mine.id, {
                name: '  Sled   drag ',
                measuredBy: 'timed',
                equipment: ['machine'],
                mainMuscles: ['quads', 'glutes'],
                // A muscle in both counts as main
                supportingMuscles: ['glutes', 'calves'],
                description: '  Pulled backwards.  ',
            });

            expect(updated).toEqual({
                ...mine,
                name: 'Sled drag',
                measuredBy: 'timed',
                equipment: ['machine'],
                mainMuscles: ['quads', 'glutes'],
                supportingMuscles: ['calves'],
                description: 'Pulled backwards.',
                updatedAt: NOW + 1,
            });
            expect(store.byId(mine.id)).toEqual(updated);
            expect(saved(EXERCISES_KEY)).toEqual([updated]);
        });

        it('keeps its own name, in any case or spacing', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            expect(store.updateOwn(mine.id, { ...details, name: 'sled  PUSH' })?.name).toBe(
                'sled PUSH'
            );
        });

        it("won't take a name another exercise has, built-in names and other names included", () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');
            store.addOwn('Farmer walk', 'timed');

            for (const name of ['Farmer walks', 'Bench press', 'press-ups', '  ']) {
                expect(store.updateOwn(mine.id, { ...details, name })).toBeNull();
            }
            expect(store.byId(mine.id)?.name).toBe('Sled push');
        });

        it("can't change a built-in exercise, or one that isn't there", () => {
            const store = createStore();

            expect(store.updateOwn('builtin:plank', { ...details, name: 'Plonk' })).toBeNull();
            expect(store.updateOwn('gone', details)).toBeNull();
        });

        it('says whether a name is taken by another exercise', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            expect(store.nameTaken('SLED  push ')).toBe(true);
            expect(store.nameTaken('SLED  push ', mine.id)).toBe(false);
            expect(store.nameTaken('Squat', mine.id)).toBe(true);
            expect(store.nameTaken('Zercher squat')).toBe(false);
        });
    });

    describe('notes', () => {
        it('saves a note on any exercise, trimmed, cut short and dated', () => {
            const store = createStore();

            store.setNote('builtin:back-squat', '  Pause at the bottom  ');
            store.setNote('builtin:plank', 'x'.repeat(MAX_EXERCISE_NOTE_LENGTH + 10));

            expect(store.noteFor('builtin:back-squat')).toBe('Pause at the bottom');
            expect(store.noteFor('builtin:plank')).toHaveLength(MAX_EXERCISE_NOTE_LENGTH);
            expect(saved(EXERCISE_NOTES_KEY)[0]).toEqual({
                id: 'builtin:back-squat',
                text: 'Pause at the bottom',
                updatedAt: NOW,
            });
        });

        it('removes a note set to nothing, leaving a deletion behind', () => {
            const store = createStore();
            store.setNote('builtin:back-squat', 'Pause at the bottom');

            store.setNote('builtin:back-squat', '   ');

            expect(store.noteFor('builtin:back-squat')).toBeUndefined();
            expect(saved('deleted')).toEqual([
                { kind: 'exercise-note', id: 'builtin:back-squat', deletedAt: NOW },
            ]);
        });
    });

    describe('merging', () => {
        it('takes new and more recently changed exercises of your own', () => {
            const store = createStore();
            const mine = store.addOwn('Sled push', 'reps');

            const result = store.mergeOwn(
                [
                    { ...mine, name: 'Sled push (heavy)', updatedAt: NOW + 1 },
                    { ...mine, id: 'other', name: 'Farmer walk', updatedAt: 1 },
                ],
                []
            );

            expect(result).toEqual({ added: 1, updated: 1, removed: 0 });
            expect(store.own().map((e) => e.name)).toEqual(['Sled push (heavy)', 'Farmer walk']);
        });

        it('takes the most recent note on each exercise, and notes removed there', () => {
            const store = createStore();
            store.setNote('builtin:back-squat', 'Old');
            store.setNote('builtin:plank', 'Kept');

            store.mergeNotes(
                [{ id: 'builtin:back-squat', text: 'New', updatedAt: NOW + 1 }],
                [{ kind: 'exercise-note', id: 'builtin:plank', deletedAt: NOW + 1 }]
            );

            expect(store.noteFor('builtin:back-squat')).toBe('New');
            expect(store.noteFor('builtin:plank')).toBeUndefined();
        });
    });
});

describe('reading saved exercises', () => {
    it('needs an id that is not built-in, a name, how it is measured and a date', () => {
        const ok = { id: 'a', name: 'Sled push', measuredBy: 'timed', updatedAt: 1 };
        expect(readOwnExercise(ok)?.name).toBe('Sled push');
        for (const broken of [
            { ...ok, id: '' },
            { ...ok, id: 'builtin:x' },
            { ...ok, name: ' ' },
            { ...ok, measuredBy: 'distance' },
            { ...ok, updatedAt: 'soon' },
        ]) {
            expect(readOwnExercise(broken)).toBeNull();
        }
    });

    it('reads missing or broken lists as empty, and drops unknown muscles', () => {
        const read = readOwnExercise({
            id: 'a',
            name: 'Sled push',
            measuredBy: 'reps',
            updatedAt: 1,
            mainMuscles: ['quads', 'wings'],
            otherNames: 'nope',
        });

        expect(read?.mainMuscles).toEqual(['quads']);
        expect(read?.otherNames).toEqual([]);
        expect(read?.steps).toEqual([]);
    });

    it('reads a note only with an id and some text', () => {
        expect(readExerciseNote({ id: 'a', text: 'Hi', updatedAt: 1 })).toEqual({
            id: 'a',
            text: 'Hi',
            updatedAt: 1,
        });
        expect(readExerciseNote({ id: 'a', text: '', updatedAt: 1 })).toBeNull();
        expect(readExerciseNote({ id: '', text: 'Hi', updatedAt: 1 })).toBeNull();
    });
});
