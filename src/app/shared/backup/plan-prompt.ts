import { BUILT_IN_EXERCISES } from '../../models/built-in-exercises';
import {
    EQUIPMENT_CHOICES,
    MAX_EXERCISE_DESCRIPTION_LENGTH,
    MAX_EXERCISE_NAME_LENGTH,
    MAX_EXERCISE_STEPS,
    MAX_EXERCISE_TIPS,
    MuscleGroup,
    MUSCLE_LABELS,
} from '../../models/exercise';
import { MAX_WEIGHT_KG } from '../../models/weight';
import {
    MAX_REPEATS,
    MAX_REPS,
    MAX_STEP_SECONDS,
    MAX_STEPS,
    MAX_TIME_LIMIT_SECONDS,
} from '../../models/workout';
import { BACKUP_VERSION } from './backup-file';

/**
 * A prompt to give an AI with a workout plan (from a coach, a book or a spreadsheet), so it
 * writes a file Import can read: workouts with no ids, steps named after the built-in
 * exercises where they match, and exercises of your own only for the rest (see
 * docs/features/backup-and-sync.md). Made from the app's own limits and exercise list, so it
 * keeps up with them.
 */
export function planPrompt(): string {
    const muscles = (Object.keys(MUSCLE_LABELS) as MuscleGroup[]).join(', ');
    const builtIn = BUILT_IN_EXERCISES.map((exercise) =>
        exercise.otherNames.length > 0
            ? `${exercise.name} (${exercise.otherNames.join(', ')})`
            : exercise.name
    ).join('\n');
    const example = {
        app: 'Loop Workouts',
        version: BACKUP_VERSION,
        workouts: [
            {
                title: 'Day A: Legs',
                repeats: 1,
                blocks: [
                    {
                        kind: 'group',
                        rounds: 1,
                        restSeconds: 0,
                        steps: [{ kind: 'work', seconds: 60, name: 'Plank' }],
                    },
                    {
                        kind: 'group',
                        rounds: 3,
                        restSeconds: 90,
                        steps: [{ kind: 'reps', reps: 8, name: 'Back squat', weight: 60 }],
                    },
                    {
                        kind: 'group',
                        rounds: 2,
                        restSeconds: 60,
                        steps: [{ kind: 'work', seconds: 45, name: 'Wall sit hold' }],
                    },
                ],
            },
        ],
        exercises: [
            {
                name: 'Wall sit hold',
                measuredBy: 'timed',
                equipment: [],
                mainMuscles: ['quads'],
                supportingMuscles: ['glutes'],
                description: 'Sit against a wall with your thighs level, and hold.',
                steps: ['Back flat against a wall.', 'Slide down until your knees are at 90°.'],
                tips: ['Keep your weight in your heels.'],
            },
        ],
    };

    return `I use Loop Workouts, a workout app. I'll give you a workout plan below. Please turn it into a JSON file that Loop Workouts can import, following these rules exactly.

THE FILE
Reply with one JSON object, in a code block, that I can save as a .json file:
- "app": always "Loop Workouts"
- "version": always ${BACKUP_VERSION}
- "workouts": a list of workouts
- "exercises": a list of exercises that aren't built in (see below); leave it empty if every exercise is built in
Leave out ids and dates ("id", "updatedAt"): the app adds them.

A WORKOUT
- "title": its name, e.g. "Day A: Legs"
- "blocks": its exercises, in order, each as a group (below), up to ${MAX_STEPS} steps in all
- "repeats": how many times the whole workout runs, 1–${MAX_REPEATS}; or 0 for until stopped. Nearly always 1; more for a circuit done several times through.
- "timeLimitSeconds" (optional): for as many rounds of the whole workout as fit in a time, 1–${MAX_TIME_LIMIT_SECONDS} seconds. Only with "repeats": 0.
A workout needs at least one step that isn't rest.

A GROUP is one exercise and its sets: { "kind": "group", "rounds": 3, "restSeconds": 90, "steps": [one step] }
- "rounds": how many sets, 1–${MAX_REPEATS}
- "restSeconds": the rest between sets, 0–${MAX_STEP_SECONDS} seconds; it never comes after the last set. 0 for none, or for one set.
- "steps": the one step it is, as below
So "3 × 8 squats, 90 seconds rest" is one group with "rounds": 3 and "restSeconds": 90. A rest between one exercise and the next is a group of one rest step, with "rounds": 1. Something done once, e.g. a warm-up, is a group with "rounds": 1.

A STEP is one of:
- Reps: { "kind": "reps", "reps": 1–${MAX_REPS}, "name": "Bench press", "weight": 60 } — the app waits until I press Done. "weight" is optional, in kilograms (more than 0, up to ${MAX_WEIGHT_KG}); convert pounds (1 lb = 0.45359237 kg). Leave it out for bodyweight.
- Timed: { "kind": "work", "seconds": 1–${MAX_STEP_SECONDS}, "name": "Plank" } — a countdown, e.g. a hold or an interval.
- Rest: { "kind": "rest", "seconds": 1–${MAX_STEP_SECONDS}, "name": "" }
Names are up to ${MAX_EXERCISE_NAME_LENGTH} characters. Write durations as whole seconds: 1:30 is 90.

EXERCISE NAMES
Name each step after a built-in exercise where one matches, spelled as below (other names it goes by are in brackets, but the first name is best):
${builtIn}

For anything not on the list, use a short, plain name, and add it to "exercises":
- "name": the same as on its steps
- "measuredBy": "reps" or "timed"
- "equipment": what it needs, any of: ${EQUIPMENT_CHOICES.join(', ')}; empty for nothing
- "mainMuscles" and "supportingMuscles": any of: ${muscles}
- "description" (optional): one or two sentences, up to ${MAX_EXERCISE_DESCRIPTION_LENGTH} characters
- "steps" (optional): up to ${MAX_EXERCISE_STEPS} short how-to steps; "tips" (optional): up to ${MAX_EXERCISE_TIPS}
Only describe it from the plan or well-known technique; leave out what you're unsure of.

AN EXAMPLE
${JSON.stringify(example, null, 2)}

If anything in the plan doesn't fit (e.g. a weight as a percentage of a max, or a range like 8–12 reps), pick a sensible value, e.g. the low end of a range, and list what you changed under the JSON, after a line saying "Notes:", so I can check it.

MY PLAN
`;
}
