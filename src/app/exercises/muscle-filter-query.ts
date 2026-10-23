import { MUSCLE_LABELS, MuscleGroup } from '../models/exercise';

const ALL_MUSCLES = new Set(Object.keys(MUSCLE_LABELS) as MuscleGroup[]);

/**
 * Reads ?muscles=quads,glutes as muscle ids in order, dropping invalid and duplicate values.
 */
export function parseMusclesParam(value: string | null): MuscleGroup[] {
    if (!value) {
        return [];
    }
    const picked: MuscleGroup[] = [];
    for (const token of value.split(',')) {
        const muscle = token.trim() as MuscleGroup;
        if (!ALL_MUSCLES.has(muscle) || picked.includes(muscle)) {
            continue;
        }
        picked.push(muscle);
    }
    return picked;
}

/** Writes muscle ids for the URL query, or null to clear ?muscles=. */
export function serialiseMusclesParam(muscles: readonly MuscleGroup[]): string | null {
    return muscles.length > 0 ? muscles.join(',') : null;
}
