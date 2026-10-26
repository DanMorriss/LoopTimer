import { Exercise, MUSCLE_LABELS, MuscleGroup } from './exercise';
import { Workout } from './workout';

/** Every muscle group, in the order the app lists them. */
export const ALL_MUSCLES = Object.keys(MUSCLE_LABELS) as MuscleGroup[];

/** Which muscles some workouts work: main ones, and the ones they only ever support. */
export interface MusclesWorked {
    main: MuscleGroup[];
    /** Supporting in some exercise, and main in none. */
    supporting: MuscleGroup[];
    /** Whether any step is linked to an exercise, so there's anything to go on. */
    hasExercises: boolean;
}

/**
 * The muscles the workouts' exercises work, from the steps linked to an exercise (an unnamed
 * step, or one whose exercise has gone, works nothing that's known). In the app's order.
 */
export function musclesWorked(
    workouts: readonly Workout[],
    byId: (id: string) => Exercise | undefined
): MusclesWorked {
    const main = new Set<MuscleGroup>();
    const supporting = new Set<MuscleGroup>();
    let hasExercises = false;
    for (const workout of workouts) {
        for (const step of workout.steps) {
            const exercise =
                step.kind === 'rest' || !step.exerciseId ? undefined : byId(step.exerciseId);
            if (!exercise) {
                continue;
            }
            hasExercises = true;
            exercise.mainMuscles.forEach((muscle) => main.add(muscle));
            exercise.supportingMuscles.forEach((muscle) => supporting.add(muscle));
        }
    }
    return {
        main: ALL_MUSCLES.filter((muscle) => main.has(muscle)),
        supporting: ALL_MUSCLES.filter((muscle) => supporting.has(muscle) && !main.has(muscle)),
        hasExercises,
    };
}

/** The muscle groups none of the workouts work, even as a supporting muscle. */
export function musclesMissed(worked: MusclesWorked): MuscleGroup[] {
    return ALL_MUSCLES.filter(
        (muscle) => !worked.main.includes(muscle) && !worked.supporting.includes(muscle)
    );
}
