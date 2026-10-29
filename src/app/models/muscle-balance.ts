import { Exercise, MUSCLE_LABELS, MuscleGroup } from './exercise';
import { HistoryEntry } from './history';
import { allSteps, Workout } from './workout';
import { ALL_MUSCLES } from './workout-muscles';

/**
 * The sets a week each muscle group is aimed at: 10 to 20 is the usual advice for building
 * muscle. Fewer is under, more is over.
 */
export const WEEKLY_SETS_LOW = 10;
export const WEEKLY_SETS_HIGH = 20;

export type MuscleStatus = 'under' | 'in-range' | 'over';

export interface MuscleBalance {
    muscle: MuscleGroup;
    /** Sets this week: 1 for each set where it's a main muscle, ½ where it's supporting. */
    sets: number;
    status: MuscleStatus;
}

/**
 * The sets each muscle has had in the entries (PRG-6): each set counts 1 for its exercise's
 * main muscles and ½ for supporting ones. Sets with no exercise, or of one that's gone, don't
 * count. Muscles with none are left out.
 */
export function setsByMuscle(
    entries: readonly HistoryEntry[],
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const counts = new Map<MuscleGroup, number>();
    for (const entry of entries) {
        for (const set of entry.sets ?? []) {
            const exercise = set.exerciseId ? byId(set.exerciseId) : undefined;
            if (!exercise) {
                continue;
            }
            for (const muscle of exercise.mainMuscles) {
                counts.set(muscle, (counts.get(muscle) ?? 0) + 1);
            }
            for (const muscle of exercise.supportingMuscles) {
                counts.set(muscle, (counts.get(muscle) ?? 0) + 0.5);
            }
        }
    }
    return counts;
}

export function muscleStatus(sets: number): MuscleStatus {
    if (sets < WEEKLY_SETS_LOW) {
        return 'under';
    }
    return sets > WEEKLY_SETS_HIGH ? 'over' : 'in-range';
}

/** Every muscle group with its sets and status, most worked first, A to Z on a tie. */
export function muscleBalance(counts: ReadonlyMap<MuscleGroup, number>): MuscleBalance[] {
    return ALL_MUSCLES.map((muscle) => {
        const sets = counts.get(muscle) ?? 0;
        return { muscle, sets, status: muscleStatus(sets) };
    }).sort(
        (a, b) => b.sets - a.sets || MUSCLE_LABELS[a.muscle].localeCompare(MUSCLE_LABELS[b.muscle])
    );
}

export interface SuggestedWorkout {
    workout: Workout;
    /** Its main muscles, least worked first: the ones it's suggested for. */
    muscles: MuscleGroup[];
}

/**
 * The saved workout that works the least used muscles: the lowest average of this week's
 * sets over the muscles it works, its main muscles counting twice what its supporting ones
 * do. On a tie, the one done longest ago (never done first), then the library's order.
 * Null when no workout has a step linked to an exercise.
 */
export function suggestNextWorkout(
    workouts: readonly Workout[],
    counts: ReadonlyMap<MuscleGroup, number>,
    byId: (id: string) => Exercise | undefined,
    /** When each workout was last started, by its id; missing for never. */
    lastDone: ReadonlyMap<string, number>
): SuggestedWorkout | null {
    let best: { suggestion: SuggestedWorkout; load: number; lastDone: number } | null = null;

    for (const workout of workouts) {
        const weights = muscleWeights(workout, byId);
        if (weights.size === 0) {
            continue;
        }

        let weighted = 0;
        let total = 0;
        for (const [muscle, weight] of weights) {
            weighted += weight * (counts.get(muscle) ?? 0);
            total += weight;
        }
        const load = weighted / total;
        const done = lastDone.get(workout.id) ?? -Infinity;
        if (best && (load > best.load || (load === best.load && done >= best.lastDone))) {
            continue;
        }

        const sets = (muscle: MuscleGroup) => counts.get(muscle) ?? 0;
        const muscles = [...weights]
            .filter(([, weight]) => weight === 1)
            .map(([muscle]) => muscle)
            .sort((a, b) => sets(a) - sets(b) || MUSCLE_LABELS[a].localeCompare(MUSCLE_LABELS[b]));
        best = { suggestion: { workout, muscles }, load, lastDone: done };
    }

    return best?.suggestion ?? null;
}

/** The muscles a workout works: 1 where any of its exercises has it as main, else ½. */
function muscleWeights(
    workout: Workout,
    byId: (id: string) => Exercise | undefined
): Map<MuscleGroup, number> {
    const weights = new Map<MuscleGroup, number>();
    for (const step of allSteps(workout)) {
        const exercise =
            step.kind === 'rest' || !step.exerciseId ? undefined : byId(step.exerciseId);
        for (const muscle of exercise?.supportingMuscles ?? []) {
            weights.set(muscle, Math.max(weights.get(muscle) ?? 0, 0.5));
        }
        for (const muscle of exercise?.mainMuscles ?? []) {
            weights.set(muscle, 1);
        }
    }
    return weights;
}
