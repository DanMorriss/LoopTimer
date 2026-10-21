/**
 * The muscle groups the body map can shade, one per shape on its figure (see
 * docs/features/exercises.md). Front, side and rear shoulders, and the lats, aren't apart
 * on the figure, so they aren't here either.
 */
export type MuscleGroup =
    | 'chest'
    | 'shoulders'
    | 'biceps'
    | 'triceps'
    | 'forearms'
    | 'abs'
    | 'obliques'
    | 'traps'
    | 'upper-back'
    | 'lower-back'
    | 'glutes'
    | 'abductors'
    | 'adductors'
    | 'quads'
    | 'hamstrings'
    | 'calves'
    | 'shins'
    | 'neck';

/** How each muscle group is written in the app, e.g. on the body map's labels. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
    chest: 'Chest',
    shoulders: 'Shoulders',
    biceps: 'Biceps',
    triceps: 'Triceps',
    forearms: 'Forearms',
    abs: 'Abs',
    obliques: 'Obliques',
    traps: 'Traps',
    'upper-back': 'Upper back',
    'lower-back': 'Lower back',
    glutes: 'Glutes',
    abductors: 'Abductors',
    adductors: 'Adductors',
    quads: 'Quads',
    hamstrings: 'Hamstrings',
    calves: 'Calves',
    shins: 'Shins',
    neck: 'Neck',
};

export type Equipment =
    | 'barbell'
    | 'dumbbells'
    | 'kettlebell'
    | 'bench'
    | 'rack'
    | 'pull-up bar'
    | 'parallel bars'
    | 'cable'
    | 'machine'
    | 'band'
    | 'none';

/** Reps (with a weight where there is one), or a time held, e.g. a plank. */
export type MeasuredBy = 'reps' | 'timed';

/** One of the exercises that comes with the app (EXR-6, EXR-7). */
export interface BuiltInExercise {
    /** Fixed for good, so history keeps pointing to it: `builtin:<name-in-kebab-case>`. */
    id: `builtin:${string}`;
    name: string;
    /** Other names it goes by, matched by the picker and when old steps carry over. */
    otherNames: string[];
    equipment: Equipment[];
    measuredBy: MeasuredBy;
    /** The muscles doing most of the work: bright on the body map. */
    mainMuscles: MuscleGroup[];
    /** Muscles that help or hold steady: darker on the body map. */
    supportingMuscles: MuscleGroup[];
    /** One line: what it is, and why do it. */
    description: string;
    /** 3–5 short steps, in order. */
    steps: string[];
    /** One or two. */
    tips: string[];
}
