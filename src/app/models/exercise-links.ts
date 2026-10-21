import { Exercise, exerciseKey, MeasuredBy } from './exercise';
import { LoggedSet } from './history';
import { Step } from './timer';

/** Finds an exercise by name, or makes one of your own, for linking steps and sets to. */
export interface ExerciseFinder {
    find(name: string): Exercise | undefined;
    /** Makes and keeps a new exercise of your own, so the next find() finds it. */
    create(name: string, measuredBy: MeasuredBy): Exercise;
}

/**
 * The exercise a name means, if any: a built-in one by its name or other names, else one of
 * your own by its name, matched as `exerciseKey()` does.
 */
export function findByName(name: string, exercises: readonly Exercise[]): Exercise | undefined {
    const key = exerciseKey(name);
    if (key === '') {
        return undefined;
    }
    return exercises.find((exercise) =>
        [exercise.name, ...exercise.otherNames].some((other) => exerciseKey(other) === key)
    );
}

/**
 * Links each named work step to the exercise its name means, making one of your own where
 * none does (EXR-1, EXR-4). Until there's a picker, the name is what chooses the exercise,
 * so a renamed step links anew. Rest and unnamed steps aren't exercises, and lose any link.
 */
export function linkSteps(steps: readonly Step[], exercises: ExerciseFinder): Step[] {
    return steps.map((step) => {
        const { exerciseId: _old, ...unlinked } = step;
        if (step.kind === 'rest' || step.name.trim() === '') {
            return unlinked;
        }
        const exercise =
            exercises.find(step.name) ??
            exercises.create(step.name, step.kind === 'reps' ? 'reps' : 'timed');
        return { ...unlinked, exerciseId: exercise.id };
    });
}

/**
 * Links logged sets with a name and no exercise yet, the same way, e.g. ones saved before
 * exercises existed. A set already linked keeps its exercise.
 */
export function linkSets(sets: readonly LoggedSet[], exercises: ExerciseFinder): LoggedSet[] {
    return sets.map((set) => {
        if (set.exerciseId !== undefined || set.name.trim() === '') {
            return set;
        }
        const exercise = exercises.find(set.name) ?? exercises.create(set.name, 'reps');
        return { ...set, exerciseId: exercise.id };
    });
}
