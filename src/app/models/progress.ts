import { HistoryEntry, isTimedSet, LoggedSet, RepSet, TimedSet } from './history';
import { MAX_WEIGHT, WEIGHT_INCREASE, WeightUnit, weightIn } from './weight';

/** How far a workout got in its time limit: full rounds, then steps done of the next. */
export interface RoundsScore {
    rounds: number;
    steps: number;
}

/** A run's score, if it ran to its time limit; null otherwise, e.g. stopped before it. */
export function roundsScore(entry: HistoryEntry): RoundsScore | null {
    return entry.timeLimitSeconds !== undefined && entry.outcome === 'finished'
        ? { rounds: entry.roundsCompleted, steps: entry.stepsIntoRound ?? 0 }
        : null;
}

/** More than 0 when `a` got further than `b`: more rounds, or as many and more steps. */
export function compareScores(a: RoundsScore, b: RoundsScore): number {
    return a.rounds - b.rounds || a.steps - b.steps;
}

/**
 * Whether `entry` got further than every other run of the same workout to the same time
 * limit (PRG-7). Not the first run of it, when there's nothing to beat, and not a tie.
 */
export function isMostRounds(entry: HistoryEntry, history: readonly HistoryEntry[]): boolean {
    const score = roundsScore(entry);
    if (!score) {
        return false;
    }
    const earlier = history
        .filter(
            (other) =>
                other.id !== entry.id &&
                other.workoutId === entry.workoutId &&
                other.timeLimitSeconds === entry.timeLimitSeconds
        )
        .map(roundsScore)
        .filter((other) => other !== null);
    return earlier.length > 0 && earlier.every((other) => compareScores(score, other) > 0);
}

/** One workout's sets of one exercise (PRG-4's recent sessions, and a point on its chart). */
export interface ExerciseSession {
    /** The history entry it's from. */
    entryId: string;
    startedAt: number;
    /** The workout's title as it ran. */
    title: string;
    /** Its sets of the exercise, in the order they were done. */
    sets: LoggedSet[];
}

/**
 * Every exercise's sessions, newest first, from the history (newest first too). A workout
 * that did an exercise in two steps is one session of it.
 */
export function sessionsByExercise(
    history: readonly HistoryEntry[]
): Map<string, ExerciseSession[]> {
    const sessions = new Map<string, ExerciseSession[]>();
    for (const entry of history) {
        const byExercise = new Map<string, LoggedSet[]>();
        for (const set of entry.sets ?? []) {
            if (set.exerciseId !== undefined) {
                byExercise.set(set.exerciseId, [...(byExercise.get(set.exerciseId) ?? []), set]);
            }
        }
        for (const [exerciseId, sets] of byExercise) {
            const session = {
                entryId: entry.id,
                startedAt: entry.startedAt,
                title: entry.title,
                sets,
            };
            sessions.set(exerciseId, [...(sessions.get(exerciseId) ?? []), session]);
        }
    }
    return sessions;
}

/**
 * What an exercise's progress is measured by: the best estimated one-rep max where any set
 * had a weight, otherwise the most reps in a set, otherwise (only timed sets) the longest.
 */
export type ProgressMeasure = 'weight' | 'reps' | 'time';

export function progressMeasure(sessions: readonly ExerciseSession[]): ProgressMeasure | null {
    const sets = sessions.flatMap((session) => session.sets);
    if (sets.some((set) => !isTimedSet(set) && set.weight !== undefined)) {
        return 'weight';
    }
    if (sets.some((set) => !isTimedSet(set))) {
        return 'reps';
    }
    return sets.length > 0 ? 'time' : null;
}

/**
 * The estimated one-rep max, in kg, by the Epley formula: weight × (1 + reps ÷ 30). One rep
 * is the weight itself.
 */
export function estimatedOneRepMax(weight: number, reps: number): number {
    return reps === 1 ? weight : weight * (1 + reps / 30);
}

/** A best, and when it was set. */
interface Best {
    /** When the workout it was in started. */
    at: number;
    entryId: string;
}

/** An exercise's personal bests (PRG-4). Each is missing where no set counts towards it. */
export interface ExerciseBests {
    /** The heaviest weight lifted for at least 1 rep, and the most reps done at it. */
    heaviest?: Best & { weight: number; reps: number };
    /** The best estimated one-rep max, in kg, and the set it came from. */
    oneRepMax?: Best & { estimate: number; weight: number; reps: number };
    /** The most reps in a set; of equals, the heaviest. Its weight is missing for none. */
    mostReps?: Best & { reps: number; weight?: number };
    /** The longest timed set, in seconds. */
    longest?: Best & { seconds: number };
}

/** The bests across every session. On a tie, the first time it was done stands. */
export function exerciseBests(sessions: readonly ExerciseSession[]): ExerciseBests {
    const bests: ExerciseBests = {};
    // Oldest first, so a later equal doesn't take the best's place
    for (const session of [...sessions].reverse()) {
        const when = { at: session.startedAt, entryId: session.entryId };
        for (const set of session.sets) {
            if (isTimedSet(set)) {
                if (set.seconds > (bests.longest?.seconds ?? 0)) {
                    bests.longest = { ...when, seconds: set.seconds };
                }
                continue;
            }
            const { reps, weight } = set;
            const most = bests.mostReps;
            if (
                !most ||
                reps > most.reps ||
                (reps === most.reps && (weight ?? 0) > (most.weight ?? 0))
            ) {
                bests.mostReps = { ...when, reps, ...(weight === undefined ? {} : { weight }) };
            }
            if (weight === undefined) {
                continue;
            }
            const heaviest = bests.heaviest;
            if (
                !heaviest ||
                weight > heaviest.weight ||
                (weight === heaviest.weight && reps > heaviest.reps)
            ) {
                bests.heaviest = { ...when, weight, reps };
            }
            const estimate = estimatedOneRepMax(weight, reps);
            if (estimate > (bests.oneRepMax?.estimate ?? 0)) {
                bests.oneRepMax = { ...when, estimate, weight, reps };
            }
        }
    }
    return bests;
}

/**
 * A session's point on the chart, as `measure` measures it: its best estimated one-rep max
 * in kg, its most reps in a set, or its longest set in seconds. Null if it has no set that
 * counts, e.g. a bodyweight session on a chart of weights.
 */
export function sessionValue(session: ExerciseSession, measure: ProgressMeasure): number | null {
    const values =
        measure === 'time'
            ? session.sets
                  .filter((set): set is TimedSet => isTimedSet(set))
                  .map((set) => set.seconds)
            : session.sets
                  .filter((set): set is RepSet => !isTimedSet(set))
                  .filter((set) => measure === 'reps' || set.weight !== undefined)
                  .map((set) =>
                      measure === 'reps' ? set.reps : estimatedOneRepMax(set.weight!, set.reps)
                  );
    return values.length > 0 ? Math.max(...values) : null;
}

/** The weight to try next (PRG-5), and the one it's from, in the unit shown. */
export interface WeightSuggestion {
    /** The heaviest weight of the last session. */
    last: number;
    /** One step up from it, or the same again. */
    next: number;
}

/**
 * The weight to try next on a rep step of `targetReps`, by double progression: where every
 * set at the last session's heaviest weight hit the reps, one step up (WEIGHT_INCREASE),
 * otherwise the same weight. Lighter sets, e.g. warm-ups, don't count. Null where the last
 * session had no weight.
 */
export function suggestedWeight(
    lastSets: readonly LoggedSet[],
    targetReps: number,
    unit: WeightUnit
): WeightSuggestion | null {
    const weighted = lastSets.filter(
        (set): set is RepSet & { weight: number } => !isTimedSet(set) && set.weight !== undefined
    );
    if (weighted.length === 0) {
        return null;
    }
    const heaviest = Math.max(...weighted.map((set) => set.weight));
    const last = weightIn(heaviest, unit);
    const hitEvery = weighted
        .filter((set) => set.weight === heaviest)
        .every((set) => set.reps >= targetReps);
    return {
        last,
        next: hitEvery ? Math.min(MAX_WEIGHT[unit], last + WEIGHT_INCREASE[unit]) : last,
    };
}
