import { BUILT_IN_EXERCISES } from './built-in-exercises';

// The content rules from docs/features/exercises.md, so each new batch is held to them
describe('built-in exercises', () => {
    const normalise = (name: string) => name.trim().toLowerCase();

    it('each have an id made from the name, that no other uses', () => {
        const ids = BUILT_IN_EXERCISES.map((exercise) => exercise.id);
        expect(new Set(ids).size).toBe(ids.length);
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.id).toMatch(/^builtin:[a-z0-9]+(-[a-z0-9]+)*$/);
        }
    });

    it('each have names, other names included, that no other exercise uses', () => {
        const names = BUILT_IN_EXERCISES.flatMap((exercise) =>
            [exercise.name, ...exercise.otherNames].map(normalise)
        );
        expect(names.filter((name, i) => names.indexOf(name) !== i)).toEqual([]);
    });

    it('each work some main muscles, and no muscle is both main and supporting', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.mainMuscles.length, exercise.name).toBeGreaterThan(0);
            const both = exercise.mainMuscles.filter((m) => exercise.supportingMuscles.includes(m));
            expect(both, exercise.name).toEqual([]);
        }
    });

    it('each have some equipment, or none, but not both', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.equipment.length, exercise.name).toBeGreaterThan(0);
            if (exercise.equipment.includes('none')) {
                expect(exercise.equipment, exercise.name).toEqual(['none']);
            }
        }
    });

    it('are short enough to read between sets', () => {
        for (const exercise of BUILT_IN_EXERCISES) {
            expect(exercise.description.length, exercise.name).toBeLessThanOrEqual(140);
            expect(exercise.steps.length, exercise.name).toBeGreaterThanOrEqual(3);
            expect(exercise.steps.length, exercise.name).toBeLessThanOrEqual(5);
            expect(exercise.tips.length, exercise.name).toBeGreaterThanOrEqual(1);
            expect(exercise.tips.length, exercise.name).toBeLessThanOrEqual(2);
            for (const line of [...exercise.steps, ...exercise.tips]) {
                expect(line.length, line).toBeLessThanOrEqual(140);
            }
        }
    });
});
