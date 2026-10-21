import { BuiltInExercise } from './exercise';

/**
 * The exercises that come with the app, in our own words (see docs/features/exercises.md).
 * free-exercise-db was a reference for which to include and their muscles, each checked by
 * hand; none of its text is used. Ids never change once released.
 *
 * First batch, for review: the big barbell lifts, two bodyweight moves, a lunge and a plank.
 */
export const BUILT_IN_EXERCISES: readonly BuiltInExercise[] = [
    {
        id: 'builtin:back-squat',
        name: 'Back squat',
        otherNames: ['Barbell squat', 'Squat'],
        equipment: ['barbell', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'adductors', 'lower-back'],
        description:
            'The bar sits across your upper back, and you sit down and stand up with it. Few exercises build the legs and glutes as much.',
        steps: [
            'Set the bar in a rack at shoulder height. Step under it so it rests across your upper back.',
            'Stand up to lift it off, take two steps back, feet shoulder-width apart, toes turned out a little.',
            'Breathe in, then sit your hips back and down, chest up, until your thighs are at least level with the floor.',
            'Push through your whole foot to stand back up, breathing out.',
        ],
        tips: [
            "Knees follow your toes; don't let them cave in.",
            "Set the rack's safety bars just below the bottom of your squat.",
        ],
    },
    {
        id: 'builtin:deadlift',
        name: 'Deadlift',
        otherNames: ['Conventional deadlift', 'Barbell deadlift'],
        equipment: ['barbell'],
        measuredBy: 'reps',
        mainMuscles: ['glutes', 'hamstrings', 'lower-back'],
        supportingMuscles: ['quads', 'traps', 'upper-back', 'forearms'],
        description:
            'Lifting a loaded bar from the floor until you stand tall. It works almost everything from your grip to your calves.',
        steps: [
            'Stand with the bar over the middle of your feet, feet hip-width apart.',
            'Bend down and grip the bar just outside your legs. Shins to the bar, back flat, chest up.',
            'Take a big breath and brace, then push the floor away until you stand tall, the bar close to your legs.',
            'Lower it the same way: hips back first, then bend your knees once it passes them.',
        ],
        tips: [
            'Keep the bar touching your legs all the way up and down.',
            "Don't lean back at the top; just stand up straight.",
        ],
    },
    {
        id: 'builtin:bench-press',
        name: 'Bench press',
        otherNames: ['Barbell bench press', 'Flat bench press', 'Bench'],
        equipment: ['barbell', 'bench', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders', 'triceps'],
        description:
            'Lying on a bench, you lower a bar to your chest and press it back up. The main lift for chest strength.',
        steps: [
            'Lie on the bench with your eyes under the bar and your feet flat on the floor.',
            'Grip the bar a little wider than your shoulders, squeeze your shoulder blades together, and lift it off.',
            'Lower it slowly to the middle of your chest, elbows angled in a little from your sides.',
            'Press it back up until your arms are straight.',
        ],
        tips: [
            'Use a spotter, or safety bars, when you go heavy.',
            'Keep your bottom on the bench and your feet on the floor.',
        ],
    },
    {
        id: 'builtin:overhead-press',
        name: 'Overhead press',
        otherNames: ['Military press', 'Shoulder press', 'OHP', 'Standing press'],
        equipment: ['barbell', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['triceps', 'traps', 'abs'],
        description:
            'Standing, you press a bar from your shoulders to straight overhead. Builds strong shoulders and a steady middle.',
        steps: [
            'Take the bar from a rack at chest height, hands just wider than your shoulders, so it rests on the front of your shoulders.',
            'Stand tall with your feet hip-width apart. Squeeze your glutes and brace your middle.',
            'Press the bar straight up, moving your head back out of the way, then forward again once the bar passes it.',
            'Finish with your arms straight and the bar over the middle of your feet, then lower it to your shoulders.',
        ],
        tips: ["Don't lean back to get it up; if you have to, it's too heavy."],
    },
    {
        id: 'builtin:barbell-row',
        name: 'Barbell row',
        otherNames: ['Bent-over row', 'Bent over row'],
        equipment: ['barbell'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'shoulders', 'lower-back', 'forearms'],
        description:
            "Leaning forward, you pull a bar up to your stomach. It builds the back that you don't see in the mirror.",
        steps: [
            'Hold the bar with your hands just wider than your knees, and stand up with it.',
            'Push your hips back and lean forward until your back is nearly flat, knees slightly bent.',
            'Pull the bar up to your stomach, elbows back, squeezing your shoulder blades together.',
            'Lower it until your arms are straight, without letting your back round.',
        ],
        tips: ['Keep your back still: only your arms move.'],
    },
    {
        id: 'builtin:pull-up',
        name: 'Pull-up',
        otherNames: ['Pull up', 'Pullup'],
        equipment: ['pull-up bar'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'forearms', 'shoulders'],
        description:
            'Hanging from a bar with your palms facing away, you pull yourself up until your chin is over it.',
        steps: [
            'Grip the bar a little wider than your shoulders, palms facing away, and hang with your arms straight.',
            'Pull your shoulders down, then pull yourself up until your chin is over the bar.',
            'Lower yourself all the way, under control, until your arms are straight again.',
        ],
        tips: [
            "Can't do one yet? Loop a band over the bar to stand in, or just lower yourself slowly from the top.",
        ],
    },
    {
        id: 'builtin:push-up',
        name: 'Push-up',
        otherNames: ['Press-up', 'Push up', 'Pushup', 'Press up'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders', 'triceps', 'abs'],
        description:
            'From a plank on your hands, you lower your chest to the floor and push back up. A bench press you can do anywhere.',
        steps: [
            'Put your hands on the floor just wider than your shoulders, and step your feet back into a straight line.',
            'Lower yourself until your chest is just above the floor, elbows angled back a little.',
            'Push back up until your arms are straight, keeping your body in one straight line.',
        ],
        tips: ['Too hard? Put your hands on a bench or step to make it easier.'],
    },
    {
        id: 'builtin:romanian-deadlift',
        name: 'Romanian deadlift',
        otherNames: ['RDL', 'Stiff-leg deadlift'],
        equipment: ['barbell'],
        measuredBy: 'reps',
        mainMuscles: ['hamstrings', 'glutes'],
        supportingMuscles: ['lower-back', 'forearms'],
        description:
            'From standing, you lower a bar down your legs by pushing your hips back, then stand back up. Great for hamstrings.',
        steps: [
            'Stand tall holding the bar in front of your thighs, hands just outside your legs.',
            'With your knees slightly bent, push your hips back and let the bar slide down your legs.',
            'Go down until you feel a strong stretch in your hamstrings, usually just below your knees.',
            'Push your hips forward to stand back up.',
        ],
        tips: ["It's a hip movement, not a squat: your knees barely bend more as you go down."],
    },
    {
        id: 'builtin:dumbbell-lunge',
        name: 'Dumbbell lunge',
        otherNames: ['Lunge', 'Forward lunge'],
        equipment: ['dumbbells'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'adductors', 'calves'],
        description:
            'With a dumbbell in each hand, you step forward and drop your back knee towards the floor. One leg at a time.',
        steps: [
            'Stand tall with a dumbbell in each hand, arms by your sides.',
            'Take a long step forward and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to step back to standing.',
            'Swap legs each time, or do all your reps on one leg, then the other.',
        ],
        tips: ['Count each leg as a rep, or each pair, but always count the same way.'],
    },
    {
        id: 'builtin:plank',
        name: 'Plank',
        otherNames: ['Front plank', 'Forearm plank'],
        equipment: ['none'],
        measuredBy: 'timed',
        mainMuscles: ['abs'],
        supportingMuscles: ['obliques', 'shoulders', 'glutes'],
        description:
            'You hold your body in a straight line on your forearms and toes. Builds a middle that holds steady.',
        steps: [
            'Put your forearms on the floor, elbows under your shoulders.',
            'Step your feet back so your body makes a straight line from head to heels.',
            'Squeeze your glutes, brace your middle, and hold, breathing steadily.',
        ],
        tips: ["Stop when your hips start to sag; that's the end of the set."],
    },
];
