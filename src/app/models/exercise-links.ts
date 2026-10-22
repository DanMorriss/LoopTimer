import { Exercise, exerciseKey, MeasuredBy } from './exercise';
import { LoggedSet } from './history';
import { Step } from './timer';

/** Finds an exercise by name, or makes one of your own, for linking steps and sets to. */
export interface ExerciseFinder {
    find(name: string): Exercise | undefined;
    byId(id: string): Exercise | undefined;
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

/** An exercise found by a search, and the other name it was found by, if not its own name. */
export interface ExerciseMatch {
    exercise: Exercise;
    otherName?: string;
}

/**
 * The exercises a search finds, best first, for the picker in setup (EXR-2): each name and
 * other name is matched as `exerciseKey()` does, the same name first, then those starting
 * with what's typed, then those with a word starting with it, then any containing it. An
 * exercise's own name beats its other names; otherwise they're in alphabetical order.
 */
export function searchExercises(
    query: string,
    exercises: readonly Exercise[],
    limit = 8
): ExerciseMatch[] {
    const key = exerciseKey(query);
    if (key === '') {
        return [];
    }
    const rank = (name: string): number | null => {
        const text = name.trim().replace(/\s+/g, ' ').toLowerCase();
        if (exerciseKey(name) === key) {
            return 0;
        }
        if (text.startsWith(key)) {
            return 1;
        }
        if (text.split(/[\s-]/).some((word) => word.startsWith(key))) {
            return 2;
        }
        return text.includes(key) ? 3 : null;
    };
    const found: { match: ExerciseMatch; rank: number }[] = [];
    for (const exercise of exercises) {
        let best: { match: ExerciseMatch; rank: number } | null = null;
        const ownRank = rank(exercise.name);
        if (ownRank !== null) {
            best = { match: { exercise }, rank: ownRank };
        }
        for (const otherName of exercise.otherNames) {
            const otherRank = rank(otherName);
            // Half a step down, so a match on the exercise's own name comes first
            if (otherRank !== null && (best === null || otherRank + 0.5 < best.rank)) {
                best = { match: { exercise, otherName }, rank: otherRank + 0.5 };
            }
        }
        if (best) {
            found.push(best);
        }
    }
    found.sort(
        (a, b) => a.rank - b.rank || a.match.exercise.name.localeCompare(b.match.exercise.name)
    );
    return found.slice(0, limit).map(({ match }) => match);
}

/**
 * Links each named work step to an exercise (EXR-1, EXR-2, EXR-4). A step already linked,
 * e.g. by the picker in setup, keeps its exercise while that's still there; any other goes
 * by the exercise its name means, making one of your own where none does. Setup drops a
 * step's link when its name is typed over, so a renamed step links anew. Rest and unnamed
 * steps aren't exercises, and lose any link.
 */
export function linkSteps(steps: readonly Step[], exercises: ExerciseFinder): Step[] {
    return steps.map((step) => {
        const { exerciseId: linked, ...unlinked } = step;
        if (step.kind === 'rest' || step.name.trim() === '') {
            return unlinked;
        }
        const exercise =
            (linked === undefined ? undefined : exercises.byId(linked)) ??
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
