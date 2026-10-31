import { BuiltInExercise } from './exercise';
import { ExerciseMotion } from './exercise-motion';

/**
 * How built-in exercises move, by id, for their animated demos (EXR-13). Not every exercise
 * has one yet. Kept apart, as their words are, so they aren't in the first download: the
 * exercise store loads them when an exercise's details are shown. How a motion is written
 * is in `exercise-motion.ts`.
 */
export const BUILT_IN_EXERCISE_MOTION: Readonly<
    Partial<Record<BuiltInExercise['id'], ExerciseMotion>>
> = {
    'builtin:back-squat': {
        view: 'side',
        props: ['barbell-on-back'],
        frames: [
            {
                label: 'Standing',
                hold: 400,
                ms: 1500,
                pose: {
                    hips: [0, -92],
                    torso: 178,
                    head: 180,
                    arms: [
                        { reach: 'bar', bend: 'ccw' },
                        { reach: 'bar', bend: 'ccw' },
                    ],
                    legs: [
                        { reach: [0, -4], bend: 'ccw' },
                        { reach: [-3, -4], bend: 'ccw' },
                    ],
                },
            },
            {
                label: 'Bottom',
                hold: 150,
                ms: 1200,
                pose: {
                    hips: [-22, -46],
                    torso: 137,
                    head: 155,
                    arms: [
                        { reach: 'bar', bend: 'ccw' },
                        { reach: 'bar', bend: 'ccw' },
                    ],
                    legs: [
                        { reach: [0, -4], bend: 'ccw' },
                        { reach: [-3, -4], bend: 'ccw' },
                    ],
                },
            },
        ],
    },
    'builtin:push-up': {
        view: 'side',
        frames: [
            {
                label: 'Top',
                hold: 300,
                ms: 1300,
                pose: {
                    hips: [82.9, -47.5],
                    torso: 109.55,
                    arms: [
                        { reach: [128, -5.5], bend: 'cw' },
                        { reach: [125, -5.5], bend: 'cw' },
                    ],
                    legs: [{ angles: [-70.45, -70.45] }, { angles: [-70.45, -70.45] }],
                    feet: [15, 15],
                },
            },
            {
                label: 'Bottom',
                hold: 100,
                ms: 1000,
                pose: {
                    hips: [88, -19.3],
                    torso: 90.82,
                    arms: [
                        { reach: [128, -5.5], bend: 'cw' },
                        { reach: [125, -5.5], bend: 'cw' },
                    ],
                    legs: [{ angles: [-89.18, -89.18] }, { angles: [-89.18, -89.18] }],
                    feet: [5, 5],
                },
            },
        ],
    },
    'builtin:lateral-raise': {
        view: 'front',
        props: ['dumbbells'],
        frames: [
            {
                label: 'Arms down',
                hold: 300,
                ms: 1200,
                pose: {
                    hips: [0, -99.5],
                    torso: 180,
                    arms: [{ angles: [-12, -8] }, { angles: [12, 8] }],
                    legs: [{ angles: [-1.5, -1.5] }, { angles: [1.5, 1.5] }],
                },
            },
            {
                label: 'Arms up',
                hold: 300,
                ms: 1500,
                pose: {
                    hips: [0, -99.5],
                    torso: 180,
                    arms: [{ angles: [-88, -80] }, { angles: [88, 80] }],
                    legs: [{ angles: [-1.5, -1.5] }, { angles: [1.5, 1.5] }],
                },
            },
        ],
    },
};
