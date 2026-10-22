import { BuiltInExercise } from './exercise';

/**
 * The exercises that come with the app, in our own words (see docs/features/exercises.md).
 * free-exercise-db was a reference for which to include and their muscles, each checked by
 * hand; none of its text is used. Ids never change once released.
 *
 * In batches of 10; each reviewed before the next is written.
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

    // Second batch: squat and press variations, the cable and machine basics, arms, hips
    {
        id: 'builtin:front-squat',
        name: 'Front squat',
        otherNames: ['Barbell front squat'],
        equipment: ['barbell', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['quads'],
        supportingMuscles: ['glutes', 'adductors', 'upper-back', 'abs'],
        description:
            'A squat with the bar resting on the front of your shoulders. It keeps you more upright and hits the quads harder.',
        steps: [
            'Set the bar in a rack at shoulder height. Step in so it rests on the front of your shoulders, close to your throat.',
            'Hold it with your fingertips just outside your shoulders, elbows pointing forward and high.',
            'Step back, feet shoulder-width apart, and sit straight down between your heels, keeping your elbows up.',
            'Push through your whole foot to stand back up.',
        ],
        tips: [
            "Wrists won't bend that far? Cross your arms over the bar instead.",
            'If your elbows drop, the bar rolls forward: lead with them on the way up.',
        ],
    },
    {
        id: 'builtin:goblet-squat',
        name: 'Goblet squat',
        otherNames: ['Dumbbell goblet squat', 'Kettlebell goblet squat'],
        equipment: [['dumbbells', 'kettlebell']],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['adductors', 'abs', 'upper-back'],
        description:
            'A squat holding one dumbbell or kettlebell against your chest. The easiest way to learn a good squat.',
        steps: [
            'Hold one end of a dumbbell, or a kettlebell by its horns, against your chest, elbows pointing down.',
            'Stand with your feet a little wider than your shoulders, toes turned out a little.',
            'Sit down between your heels until your elbows touch the inside of your knees.',
            'Push through your whole foot to stand back up.',
        ],
        tips: ['Keep the weight touching your chest the whole time.'],
    },
    {
        id: 'builtin:incline-dumbbell-press',
        name: 'Incline dumbbell press',
        otherNames: ['Incline press', 'Incline dumbbell bench press'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders', 'triceps'],
        description:
            'Lying on a bench set at an angle, you press two dumbbells up from your chest. Works the upper chest.',
        steps: [
            'Set the bench to a low angle, about 30 degrees, and sit with a dumbbell on each thigh.',
            'Lie back, bringing the dumbbells up beside your chest, palms facing your feet.',
            'Press them up until your arms are straight, bringing them together over your chest.',
            'Lower them slowly back to the sides of your chest.',
        ],
        tips: ["The higher the bench, the more it's a shoulder press: keep it low."],
    },
    {
        id: 'builtin:dumbbell-shoulder-press',
        name: 'Dumbbell shoulder press',
        otherNames: ['Seated dumbbell press', 'Seated shoulder press'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['triceps', 'traps'],
        description:
            'Sitting on an upright bench, you press two dumbbells from your shoulders to overhead.',
        steps: [
            'Set the bench upright and sit with your back against it, a dumbbell on each thigh.',
            'Bring them up to your shoulders, palms facing forward, elbows under your hands.',
            'Press them up until your arms are straight, the dumbbells nearly touching overhead.',
            'Lower them slowly back to your shoulders.',
        ],
        tips: ['Keep your back against the bench; arching it shifts the work off your shoulders.'],
    },
    {
        id: 'builtin:lat-pulldown',
        name: 'Lat pulldown',
        otherNames: ['Pulldown', 'Lat pull-down', 'Cable pulldown'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'forearms'],
        description:
            'Sitting at a machine, you pull a wide bar down to your chest. A pull-up you can set the weight for.',
        steps: [
            'Set the knee pad so your thighs are held down, and grip the bar a little wider than your shoulders.',
            'Sit down with your arms straight, leaning back just a little.',
            'Pull the bar down to the top of your chest, driving your elbows down and back.',
            'Let it back up slowly until your arms are straight.',
        ],
        tips: ["Don't swing back to move the weight; if you have to, lower it."],
    },
    {
        id: 'builtin:seated-cable-row',
        name: 'Seated cable row',
        otherNames: ['Cable row', 'Seated row'],
        equipment: ['cable'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'shoulders', 'forearms', 'lower-back'],
        description:
            'Sitting with your feet braced, you pull a cable handle to your stomach. Builds the middle of your back.',
        steps: [
            'Sit with your feet on the platform, knees slightly bent, and hold the handle with your arms straight.',
            'Sit up tall, chest up, without leaning back.',
            'Pull the handle to your stomach, squeezing your shoulder blades together.',
            'Let it forward slowly until your arms are straight again.',
        ],
        tips: ['Keep your body still and let only your arms and shoulder blades move.'],
    },
    {
        id: 'builtin:dumbbell-curl',
        name: 'Dumbbell curl',
        otherNames: ['Biceps curl', 'Bicep curl', 'Dumbbell biceps curl'],
        equipment: ['dumbbells'],
        measuredBy: 'reps',
        mainMuscles: ['biceps'],
        supportingMuscles: ['forearms'],
        description:
            'Standing with a dumbbell in each hand, you bend your elbows to lift them to your shoulders.',
        steps: [
            'Stand tall with a dumbbell in each hand, arms by your sides, palms facing forward.',
            'Keeping your elbows by your sides, bend them to lift the dumbbells towards your shoulders.',
            'Lower them slowly until your arms are straight.',
        ],
        tips: ["If you're swinging your body to lift them, they're too heavy."],
    },
    {
        id: 'builtin:triceps-pushdown',
        name: 'Triceps pushdown',
        otherNames: ['Tricep pushdown', 'Cable pushdown', 'Pushdown'],
        equipment: ['cable'],
        measuredBy: 'reps',
        mainMuscles: ['triceps'],
        supportingMuscles: ['forearms'],
        description:
            'Standing at a cable, you push a bar or rope down until your arms are straight. Works the backs of your arms.',
        steps: [
            'Set the cable high and hold the bar or rope with your elbows bent and tucked into your sides.',
            'Push it down until your arms are straight, keeping your elbows where they are.',
            'Let it back up slowly until your forearms are just above level.',
        ],
        tips: ['Your elbows stay pinned to your sides; only your forearms move.'],
    },
    {
        id: 'builtin:hip-thrust',
        name: 'Hip thrust',
        otherNames: ['Barbell hip thrust'],
        equipment: ['barbell', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['glutes'],
        supportingMuscles: ['hamstrings', 'quads'],
        description:
            'With your upper back on a bench and a bar across your hips, you lift your hips until your body is flat.',
        steps: [
            'Sit on the floor with your upper back against the side of a bench, and roll the bar over your hips.',
            'Plant your feet hip-width apart, close enough that your shins are upright at the top.',
            'Push through your heels to lift your hips until your body is flat from shoulders to knees.',
            'Squeeze your glutes at the top, then lower your hips back down.',
        ],
        tips: ['A pad or folded towel under the bar makes it far more comfortable.'],
    },
    {
        id: 'builtin:kettlebell-swing',
        name: 'Kettlebell swing',
        otherNames: ['KB swing', 'Russian swing', 'Swing'],
        equipment: ['kettlebell'],
        measuredBy: 'reps',
        mainMuscles: ['glutes', 'hamstrings'],
        supportingMuscles: ['lower-back', 'abs', 'shoulders', 'forearms'],
        description:
            'You swing a kettlebell from between your legs to chest height by snapping your hips forward.',
        steps: [
            'Stand with your feet a little wider than your shoulders, the kettlebell on the floor in front of you.',
            'Push your hips back, grip it with both hands, and hike it back between your legs.',
            'Snap your hips forward to stand tall, letting the kettlebell float up to chest height.',
            'Let it fall back between your legs, pushing your hips back, and go straight into the next one.',
        ],
        tips: ["Your hips do the work, not your arms: they're only there to hold on."],
    },

    // Third batch: leg machines, calves, more pulling, dips, shoulders and a hanging core move
    {
        id: 'builtin:leg-press',
        name: 'Leg press',
        otherNames: ['Machine leg press', 'Seated leg press'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'adductors'],
        description:
            'Sitting in a machine, you push a loaded platform away with your feet. Heavy leg work without a bar on your back.',
        steps: [
            'Sit with your back flat against the pad and your feet hip-width apart in the middle of the platform.',
            'Push the platform up and release the safety handles.',
            'Lower it by bending your knees towards your chest, until they are at about a right angle.',
            'Push it back up without locking your knees out at the top.',
        ],
        tips: [
            "Don't let your lower back lift off the pad at the bottom; stop a little higher if it does.",
        ],
    },
    {
        id: 'builtin:leg-curl',
        name: 'Leg curl',
        otherNames: ['Hamstring curl', 'Lying leg curl', 'Seated leg curl'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['hamstrings'],
        supportingMuscles: ['calves'],
        description:
            'At a machine, you bend your knees against a padded bar. The simplest way to work your hamstrings alone.',
        steps: [
            'Set the machine so your knees line up with its pivot and the pad sits just above your heels.',
            'Bend your knees to curl the pad as far as it will go.',
            'Squeeze for a moment, then let it back slowly until your legs are nearly straight.',
        ],
        tips: ['Keep your hips down on the pad; lifting them takes the work off your hamstrings.'],
    },
    {
        id: 'builtin:leg-extension',
        name: 'Leg extension',
        otherNames: ['Machine leg extension', 'Quad extension'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['quads'],
        supportingMuscles: [],
        description:
            'Sitting at a machine, you straighten your legs against a padded bar. Works the quads on their own.',
        steps: [
            'Set the machine so your knees line up with its pivot and the pad sits on the front of your ankles.',
            'Hold the handles and straighten your legs until they are nearly locked out.',
            'Lower the pad slowly until your knees are back at a right angle.',
        ],
        tips: ['Go slowly on the way down; that half of the rep counts as much as the lift.'],
    },
    {
        id: 'builtin:calf-raise',
        name: 'Calf raise',
        otherNames: ['Standing calf raise', 'Heel raise'],
        equipment: ['step'],
        measuredBy: 'reps',
        mainMuscles: ['calves'],
        supportingMuscles: [],
        description:
            'Standing on the edge of a step, you rise up onto your toes and lower your heels below the step.',
        steps: [
            'Stand with the balls of your feet on the edge of a step, holding something for balance.',
            'Lower your heels below the step until you feel a stretch in your calves.',
            'Rise up onto your toes as high as you can, and hold for a moment at the top.',
        ],
        tips: ['Too easy? Hold a dumbbell in your free hand, or do one leg at a time.'],
    },
    {
        id: 'builtin:dumbbell-row',
        name: 'Dumbbell row',
        otherNames: ['One-arm dumbbell row', 'Single-arm row', 'One-arm row'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'shoulders', 'forearms'],
        description:
            'With one hand and knee on a bench, you pull a dumbbell up to your hip with the other arm.',
        steps: [
            'Put your left knee and left hand on a bench, back flat, and hold a dumbbell in your right hand.',
            'Let it hang with your arm straight, below your shoulder.',
            'Pull it up towards your hip, elbow close to your side, until your elbow passes your back.',
            'Lower it slowly, then do all your reps before swapping sides.',
        ],
        tips: ['Pull towards your hip, not your shoulder: think of starting a lawnmower.'],
    },
    {
        id: 'builtin:chin-up',
        name: 'Chin-up',
        otherNames: ['Chin up', 'Chinup'],
        equipment: ['pull-up bar'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back', 'biceps'],
        supportingMuscles: ['forearms', 'shoulders'],
        description:
            'Like a pull-up, but with your palms facing you. Usually a little easier, and harder on your biceps.',
        steps: [
            'Grip the bar shoulder-width apart, palms facing you, and hang with your arms straight.',
            'Pull your shoulders down, then pull yourself up until your chin is over the bar.',
            'Lower yourself all the way, under control, until your arms are straight again.',
        ],
        tips: ["Don't kick or swing to get up; slow reps you can control count for more."],
    },
    {
        id: 'builtin:dip',
        name: 'Dip',
        otherNames: ['Parallel bar dip', 'Triceps dip', 'Chest dip'],
        equipment: ['parallel bars'],
        measuredBy: 'reps',
        mainMuscles: ['triceps', 'chest'],
        supportingMuscles: ['shoulders'],
        description:
            'Holding yourself up on two bars, you lower your body by bending your elbows and press back up.',
        steps: [
            'Grip the bars and jump or step up so your arms are straight and your body hangs between them.',
            'Lean forward slightly and bend your elbows to lower yourself until your upper arms are level with the bars.',
            'Press back up until your arms are straight.',
        ],
        tips: [
            'Stop lower if your shoulders ache at the bottom.',
            'Too hard? Use the assisted dip machine, or a band looped over the bars.',
        ],
    },
    {
        id: 'builtin:lateral-raise',
        name: 'Lateral raise',
        otherNames: ['Side raise', 'Dumbbell lateral raise', 'Side lateral raise'],
        equipment: ['dumbbells'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['traps'],
        description:
            'Standing with light dumbbells, you raise your arms out to the sides. Builds broader shoulders.',
        steps: [
            'Stand tall with a dumbbell in each hand by your sides, elbows slightly bent.',
            'Raise your arms out to the sides until your hands are level with your shoulders.',
            'Lower them slowly back to your sides.',
        ],
        tips: [
            'Go lighter than you think; swinging heavy ones up works your traps, not your shoulders.',
        ],
    },
    {
        id: 'builtin:face-pull',
        name: 'Face pull',
        otherNames: ['Cable face pull', 'Rope face pull'],
        equipment: ['cable'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['upper-back', 'traps'],
        description:
            'At a high cable, you pull a rope towards your face, hands apart. Good for the backs of your shoulders.',
        steps: [
            'Set the cable at head height with a rope, and hold an end in each hand, thumbs towards you.',
            'Step back until your arms are straight, and stand tall.',
            'Pull the rope towards your face, pulling the ends apart so your hands finish beside your ears.',
            'Let it forward slowly until your arms are straight.',
        ],
        tips: ['Keep it light and slow: this is about control, not weight.'],
    },
    {
        id: 'builtin:hanging-leg-raise',
        name: 'Hanging leg raise',
        otherNames: ['Hanging knee raise', 'Leg raise'],
        equipment: ['pull-up bar'],
        measuredBy: 'reps',
        mainMuscles: ['abs'],
        supportingMuscles: ['obliques', 'forearms'],
        description:
            'Hanging from a bar, you lift your legs up in front of you. One of the hardest moves for your abs.',
        steps: [
            'Hang from a bar with your hands shoulder-width apart and your legs straight.',
            'Lift your legs up in front of you until they are level with the floor, or higher.',
            'Lower them slowly, without swinging, until they hang straight again.',
        ],
        tips: ['Too hard? Bend your knees and lift them to your chest instead.'],
    },

    // Fourth batch: core, carries and variations
    {
        id: 'builtin:side-plank',
        name: 'Side plank',
        otherNames: ['Side bridge', 'Forearm side plank'],
        equipment: ['none'],
        measuredBy: 'timed',
        mainMuscles: ['obliques'],
        supportingMuscles: ['abs', 'shoulders', 'abductors'],
        description:
            'You hold your body in a straight line on one forearm and the side of one foot. Works the sides of your middle.',
        steps: [
            'Lie on your side with your forearm on the floor, elbow under your shoulder, legs straight and stacked.',
            'Lift your hips until your body makes a straight line from head to feet.',
            'Brace your middle and hold, breathing steadily, then lower your hips and swap sides.',
        ],
        tips: [
            "Don't let your hips sag towards the floor or push back behind you.",
            'Too hard? Bend your knees and rest on the side of your bottom knee instead of your foot.',
        ],
    },
    {
        id: 'builtin:dead-bug',
        name: 'Dead bug',
        otherNames: ['Deadbug'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['abs'],
        supportingMuscles: ['obliques'],
        description:
            'Lying on your back, you lower the opposite arm and leg while keeping your back flat. Teaches your middle to hold still.',
        steps: [
            'Lie on your back with your arms pointing at the ceiling and your knees bent at a right angle over your hips.',
            'Press your lower back into the floor and brace your middle.',
            'Slowly lower your right arm behind your head and your left leg towards the floor, without touching it.',
            'Bring them back to the start, then do the same with your left arm and right leg.',
        ],
        tips: [
            'If your lower back lifts off the floor, you have gone too far: stop a little higher.',
        ],
    },
    {
        id: 'builtin:russian-twist',
        name: 'Russian twist',
        otherNames: ['Seated twist', 'Seated Russian twist'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['obliques', 'abs'],
        supportingMuscles: ['lower-back'],
        description:
            'Sitting leaning back with your feet up, you turn your body from side to side. Works the sides of your middle.',
        steps: [
            'Sit on the floor with your knees bent, and lean back until your body is at about 45 degrees.',
            'Hold your hands together in front of your chest, and lift your feet a little off the floor.',
            'Turn your shoulders to one side, then the other, keeping your back long.',
        ],
        tips: [
            'Turn your shoulders, not just your arms: your hands follow your chest.',
            'Too easy? Hold a dumbbell or a plate. Too hard? Keep your heels on the floor.',
        ],
    },
    {
        id: 'builtin:farmers-carry',
        name: "Farmer's carry",
        otherNames: ["Farmer's walk", 'Farmers walk', 'Farmers carry'],
        equipment: [['dumbbells', 'kettlebell']],
        measuredBy: 'timed',
        mainMuscles: ['forearms', 'traps'],
        supportingMuscles: ['abs', 'obliques', 'upper-back', 'glutes'],
        description:
            'You walk holding a heavy weight in each hand, standing tall. Builds a strong grip and a steady middle.',
        steps: [
            'Stand between two heavy dumbbells or kettlebells, and squat down to pick them up, back flat.',
            'Stand tall, shoulders down and back, arms straight by your sides.',
            'Walk with short, steady steps, keeping your body upright, until the time is up.',
            'Stop, and squat down to put them back on the floor.',
        ],
        tips: ["Don't let the weights pull your shoulders forward or tip you to one side."],
    },
    {
        id: 'builtin:sumo-deadlift',
        name: 'Sumo deadlift',
        otherNames: ['Barbell sumo deadlift', 'Sumo pull'],
        equipment: ['barbell'],
        measuredBy: 'reps',
        mainMuscles: ['glutes', 'quads', 'adductors'],
        supportingMuscles: ['hamstrings', 'lower-back', 'traps', 'forearms'],
        description:
            'A deadlift with your feet wide and your hands inside your legs. Keeps you more upright and works your inner thighs.',
        steps: [
            'Stand with your feet wide, toes turned out, and the bar over the middle of your feet.',
            'Bend down and grip the bar inside your legs, hands shoulder-width apart. Shins to the bar, chest up.',
            'Take a big breath and brace, then push your knees out and the floor away until you stand tall.',
            'Lower it the same way, keeping the bar close to your legs.',
        ],
        tips: [
            'Push your knees out over your toes the whole way up.',
            "Don't let your hips shoot up first; your chest and hips rise together.",
        ],
    },
    {
        id: 'builtin:bulgarian-split-squat',
        name: 'Bulgarian split squat',
        otherNames: ['Rear-foot-elevated split squat', 'RFESS', 'Bulgarian squat'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'adductors', 'calves'],
        description:
            'With your back foot up on a bench, you lower your back knee towards the floor. Hard work for one leg at a time.',
        steps: [
            'Stand about a stride in front of a bench with a dumbbell in each hand, and rest the top of one foot on it.',
            'Bend your front knee to lower your back knee towards the floor, keeping your chest up.',
            'Go down until your front thigh is about level with the floor.',
            'Push through your front foot to stand back up. Do all your reps, then swap legs.',
        ],
        tips: [
            'Wobbly? Move your front foot a little further out to the side.',
            'Learn it with no weight first; it is harder than it looks.',
        ],
    },
    {
        id: 'builtin:step-up',
        name: 'Step-up',
        otherNames: ['Step up', 'Box step-up'],
        equipment: ['step'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'calves'],
        description:
            'You step up onto a box or bench with one foot and stand tall on it. Works your legs one at a time.',
        steps: [
            'Stand facing a box or bench about knee height, and put one whole foot on top of it.',
            'Push through that foot to stand up on the box, bringing your other foot up beside it.',
            'Step back down with the same foot you brought up last, under control.',
            'Do all your reps on one leg, then swap.',
        ],
        tips: [
            "Push with the leg on the box, not the one on the floor; don't bounce off it.",
            'Too easy? Hold a dumbbell in each hand.',
        ],
    },
    {
        id: 'builtin:hammer-curl',
        name: 'Hammer curl',
        otherNames: ['Dumbbell hammer curl', 'Neutral-grip curl'],
        equipment: ['dumbbells'],
        measuredBy: 'reps',
        mainMuscles: ['biceps', 'forearms'],
        supportingMuscles: [],
        description:
            'A dumbbell curl with your palms facing each other, like holding a hammer. Works your forearms as well as biceps.',
        steps: [
            'Stand tall with a dumbbell in each hand, arms by your sides, palms facing your legs.',
            'Keeping your elbows by your sides, bend them to lift the dumbbells towards your shoulders.',
            'Lower them slowly until your arms are straight, palms still facing in.',
        ],
        tips: ["Keep your thumbs pointing up the whole time; don't let your wrists turn."],
    },
    {
        id: 'builtin:skull-crusher',
        name: 'Skull crusher',
        otherNames: ['Lying triceps extension', 'Skullcrusher', 'Lying tricep extension'],
        equipment: [['barbell', 'dumbbells'], 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['triceps'],
        supportingMuscles: ['forearms'],
        description:
            'Lying on a bench, you lower a bar or dumbbells towards your forehead by bending your elbows, then straighten them.',
        steps: [
            'Lie on a bench holding a bar, or a dumbbell in each hand, straight up over your chest.',
            'Keeping your upper arms still, bend your elbows to lower the weight towards your forehead.',
            'Stop just above your head, then straighten your arms to press it back up.',
        ],
        tips: [
            'Keep your elbows pointing at the ceiling; letting them flare out takes the work off your triceps.',
            'A bent EZ bar is kinder on your wrists than a straight one.',
        ],
    },
    {
        id: 'builtin:glute-bridge',
        name: 'Glute bridge',
        otherNames: ['Hip bridge', 'Floor glute bridge'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['glutes'],
        supportingMuscles: ['hamstrings', 'abs'],
        description:
            'Lying on your back with your knees bent, you lift your hips off the floor. A hip thrust you can do anywhere.',
        steps: [
            'Lie on your back with your knees bent, feet flat on the floor hip-width apart, arms by your sides.',
            'Push through your heels to lift your hips until your body is straight from shoulders to knees.',
            'Squeeze your glutes at the top for a moment, then lower your hips back to the floor.',
        ],
        tips: [
            "Don't arch your lower back to get higher; stop when your hips are in line.",
            'Too easy? Do one leg at a time, or rest a weight across your hips.',
        ],
    },

    // Fifth batch: chest, shoulders and arms
    {
        id: 'builtin:dumbbell-bench-press',
        name: 'Dumbbell bench press',
        otherNames: ['Flat dumbbell press', 'Dumbbell chest press', 'DB bench press'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders', 'triceps'],
        description:
            'Lying on a flat bench, you press two dumbbells up from your chest. Each arm has to do its own share.',
        steps: [
            'Sit on the end of a flat bench with a dumbbell on each thigh.',
            'Lie back, bringing the dumbbells up beside your chest, palms facing your feet, feet flat on the floor.',
            'Press them up until your arms are straight, bringing them together over your chest.',
            'Lower them slowly back to the sides of your chest, elbows angled in a little from your sides.',
        ],
        tips: [
            'Done? Bring the dumbbells to your chest and sit up with them, rather than dropping them out to the sides.',
        ],
    },
    {
        id: 'builtin:incline-bench-press',
        name: 'Incline bench press',
        otherNames: ['Incline barbell press', 'Barbell incline bench press', 'Incline bench'],
        equipment: ['barbell', 'bench', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders', 'triceps'],
        description:
            'A bench press on a bench set at an angle. Works the upper chest, with more help from your shoulders.',
        steps: [
            'Set the bench to about 30 degrees and lie back with your eyes just under the bar.',
            'Grip the bar a little wider than your shoulders, squeeze your shoulder blades together, and lift it off.',
            'Lower it slowly to the top of your chest, just under your collarbones.',
            'Press it back up until your arms are straight, over your shoulders.',
        ],
        tips: [
            'Use a spotter, or safety bars, when you go heavy.',
            'Keep your bottom on the bench; lifting it turns this back into a flat press.',
        ],
    },
    {
        id: 'builtin:close-grip-bench-press',
        name: 'Close-grip bench press',
        otherNames: ['Close grip bench press', 'Close-grip bench', 'CGBP'],
        equipment: ['barbell', 'bench', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['triceps', 'chest'],
        supportingMuscles: ['shoulders'],
        description:
            'A bench press with your hands about shoulder-width apart. Puts more of the work on the backs of your arms.',
        steps: [
            'Lie on the bench with your eyes under the bar and your feet flat on the floor.',
            'Grip the bar with your hands about shoulder-width apart, and lift it off.',
            'Lower it slowly to the bottom of your chest, keeping your elbows close to your sides.',
            'Press it back up until your arms are straight.',
        ],
        tips: [
            "Don't go narrower than your shoulders: it's harder on your wrists without working your triceps more.",
        ],
    },
    {
        id: 'builtin:dumbbell-fly',
        name: 'Dumbbell fly',
        otherNames: ['Dumbbell flye', 'Flat dumbbell fly', 'Dumbbell chest fly'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders'],
        description:
            'Lying on a bench, you open your arms wide with a dumbbell in each hand, then bring them back together.',
        steps: [
            'Lie on a flat bench holding a dumbbell in each hand straight up over your chest, palms facing each other.',
            'With a slight bend in your elbows, lower your arms out to the sides in a wide arc.',
            'Stop when you feel a stretch across your chest, with your hands about level with the bench.',
            'Bring them back up over your chest the same way, as if hugging a tree.',
        ],
        tips: [
            'Keep the bend in your elbows the same all the way; bending more turns it into a press.',
            'Go lighter than for a press, and stop short of where your shoulders feel strained.',
        ],
    },
    {
        id: 'builtin:cable-crossover',
        name: 'Cable crossover',
        otherNames: ['Cable fly', 'Cable chest fly', 'Standing cable fly'],
        equipment: ['cable'],
        measuredBy: 'reps',
        mainMuscles: ['chest'],
        supportingMuscles: ['shoulders', 'abs'],
        description:
            'Standing between two high cables, you pull the handles down and together in front of you. Keeps your chest working throughout.',
        steps: [
            'Set both cables high, take a handle in each hand, and step forward to stand between them.',
            'Stand with one foot in front of the other, leaning forward a little, arms out to the sides, elbows slightly bent.',
            'Pull the handles down and together in a wide arc until they meet in front of your hips.',
            'Let them back out slowly until you feel a stretch across your chest.',
        ],
        tips: ['Set the cables low and pull up and together to work the upper chest instead.'],
    },
    {
        id: 'builtin:arnold-press',
        name: 'Arnold press',
        otherNames: ['Arnold dumbbell press', 'Arnold shoulder press'],
        equipment: ['dumbbells', 'bench'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['triceps', 'traps'],
        description:
            'A seated dumbbell shoulder press that starts with your palms facing you and turns them out as you press.',
        steps: [
            'Set the bench upright and sit with your back against it, a dumbbell in each hand.',
            'Hold them in front of your shoulders, palms facing you, elbows bent and in front of your body.',
            'Press them up, turning your palms to face forward as they rise, until your arms are straight overhead.',
            'Lower them the same way, turning your palms back towards you as they reach your shoulders.',
        ],
        tips: ['Go lighter than for a plain shoulder press, and keep the turn smooth and slow.'],
    },
    {
        id: 'builtin:rear-delt-fly',
        name: 'Rear delt fly',
        otherNames: [
            'Reverse fly',
            'Rear delt raise',
            'Bent-over reverse fly',
            'Reverse dumbbell fly',
        ],
        equipment: ['dumbbells'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['upper-back', 'traps', 'lower-back'],
        description:
            'Leaning forward with light dumbbells, you raise your arms out to the sides. Works the backs of your shoulders.',
        steps: [
            'Stand with a dumbbell in each hand, then push your hips back and lean forward until your back is nearly flat.',
            'Let the dumbbells hang below your shoulders, palms facing each other, elbows slightly bent.',
            'Raise your arms out to the sides until your hands are level with your shoulders.',
            'Lower them slowly until they hang below your shoulders again.',
        ],
        tips: [
            "Use light ones and lead with your elbows; if you're swinging your body, they're too heavy.",
            'Back tired? Do it sitting on the end of a bench, leaning forward over your knees.',
        ],
    },
    {
        id: 'builtin:shrug',
        name: 'Shrug',
        otherNames: ['Dumbbell shrug', 'Barbell shrug', 'Shoulder shrug'],
        equipment: [['dumbbells', 'barbell']],
        measuredBy: 'reps',
        mainMuscles: ['traps'],
        supportingMuscles: ['forearms', 'neck'],
        description:
            'Standing with a heavy weight in your hands, you lift your shoulders up towards your ears. Builds the traps.',
        steps: [
            'Stand tall holding a dumbbell in each hand by your sides, or a bar in front of your thighs.',
            'Keeping your arms straight, lift your shoulders straight up towards your ears as high as you can.',
            'Hold for a moment at the top, then lower them slowly all the way down.',
        ],
        tips: ["Lift straight up; there's no need to roll your shoulders round."],
    },
    {
        id: 'builtin:preacher-curl',
        name: 'Preacher curl',
        otherNames: ['Preacher bench curl', 'Scott curl', 'EZ bar preacher curl'],
        equipment: [
            ['barbell', 'dumbbells'],
            ['preacher bench', 'bench'],
        ],
        measuredBy: 'reps',
        mainMuscles: ['biceps'],
        supportingMuscles: ['forearms'],
        description:
            'A curl with the backs of your arms resting on an angled pad. Stops you swinging, so your biceps do all the work.',
        steps: [
            'Sit at a preacher bench with the backs of your upper arms flat on the pad, armpits at its top edge.',
            'Hold a bar, or a dumbbell in each hand, palms facing up, arms nearly straight.',
            'Bend your elbows to curl the weight up towards your shoulders, keeping your arms on the pad.',
            'Lower it slowly until your arms are nearly straight again.',
        ],
        tips: [
            "Don't let the weight drop the last part of the way; go slowly where it's hardest.",
            'No preacher bench? Kneel behind an incline bench and rest your arm over its back.',
        ],
    },
    {
        id: 'builtin:overhead-triceps-extension',
        name: 'Overhead triceps extension',
        otherNames: [
            'Overhead tricep extension',
            'Dumbbell overhead extension',
            'Overhead dumbbell extension',
        ],
        equipment: ['dumbbells'],
        measuredBy: 'reps',
        mainMuscles: ['triceps'],
        supportingMuscles: ['shoulders', 'abs'],
        description:
            'Holding one dumbbell overhead in both hands, you lower it behind your head and straighten your arms again.',
        steps: [
            'Stand or sit tall, holding one end of a dumbbell in both hands straight up over your head.',
            'Keeping your upper arms still and close to your head, bend your elbows to lower it behind your head.',
            'Go down until you feel a stretch in the backs of your arms.',
            'Straighten your arms to lift it back overhead.',
        ],
        tips: [
            'Keep your elbows pointing forward, not out to the sides.',
            'Arching your back? Brace your middle, or sit on a bench with a backrest.',
        ],
    },

    // Sixth batch: legs
    {
        id: 'builtin:hack-squat',
        name: 'Hack squat',
        otherNames: ['Machine hack squat', 'Hack squat machine'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['quads'],
        supportingMuscles: ['glutes', 'adductors', 'hamstrings'],
        description:
            'A squat in a machine, with your back against a sloped pad and the weight on your shoulders. Hits the quads hard.',
        steps: [
            'Stand on the platform with your back flat against the pad and your shoulders under the shoulder pads.',
            'Put your feet shoulder-width apart, a little forward of your hips, then stand up and release the safety handles.',
            'Bend your knees to lower yourself until your thighs are at least level with the platform.',
            'Push through your whole foot to stand back up, without locking your knees out at the top.',
        ],
        tips: [
            'Feet lower on the platform work your quads more; higher brings in your glutes and hamstrings.',
        ],
    },
    {
        id: 'builtin:walking-lunge',
        name: 'Walking lunge',
        otherNames: ['Dumbbell walking lunge', 'Walking lunge with dumbbells'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'adductors', 'calves'],
        description:
            'You lunge forward one leg after the other, moving across the floor. Works your legs and tests your balance.',
        steps: [
            'Stand tall with your feet together and plenty of clear floor in front of you.',
            'Take a long step forward and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to stand up, bringing your back foot forward into the next step.',
            'Keep going, one leg after the other, until you have done your reps.',
        ],
        tips: [
            'Count each leg as a rep, or each pair, but always count the same way.',
            'Too easy? Hold a dumbbell in each hand.',
        ],
    },
    {
        id: 'builtin:reverse-lunge',
        name: 'Reverse lunge',
        otherNames: ['Backward lunge', 'Step-back lunge', 'Rear lunge'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['glutes', 'quads'],
        supportingMuscles: ['hamstrings', 'adductors', 'calves'],
        description:
            'You step backwards and drop your back knee towards the floor. Kinder on your knees than stepping forward.',
        steps: [
            'Stand tall with your feet hip-width apart.',
            'Take a long step back with one foot and bend both knees until your back knee nearly touches the floor.',
            'Push through your front foot to bring your back foot forward and stand up again.',
            'Swap legs each time, or do all your reps on one leg, then the other.',
        ],
        tips: [
            'Keep most of your weight on your front foot; the back one is only there for balance.',
            'Too easy? Hold a dumbbell in each hand.',
        ],
    },
    {
        id: 'builtin:single-leg-romanian-deadlift',
        name: 'Single-leg Romanian deadlift',
        otherNames: ['Single-leg RDL', 'One-leg Romanian deadlift', 'Single-leg deadlift'],
        equipment: [['dumbbells', 'kettlebell']],
        measuredBy: 'reps',
        mainMuscles: ['hamstrings', 'glutes'],
        supportingMuscles: ['lower-back', 'abductors', 'forearms'],
        description:
            'Standing on one leg, you tip forward with a weight in your hand, your other leg reaching back. Works hamstrings and balance.',
        steps: [
            'Stand on your left leg, knee slightly bent, holding a dumbbell or kettlebell in your right hand.',
            'Push your hips back and tip forward, letting your right leg rise behind you in line with your body.',
            'Lower the weight towards the floor until you feel a strong stretch in your left hamstring.',
            'Squeeze your glutes to stand back up. Do all your reps, then swap sides.',
        ],
        tips: [
            'Keep your hips level, as if both were headlights pointing at the floor.',
            'Wobbly? Rest a fingertip on a wall, or start with no weight.',
        ],
    },
    {
        id: 'builtin:good-morning',
        name: 'Good morning',
        otherNames: ['Barbell good morning'],
        equipment: ['barbell', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['hamstrings', 'glutes'],
        supportingMuscles: ['lower-back', 'abs'],
        description:
            'With a bar across your upper back, you bow forward from your hips and stand back up. Works the whole back of your legs.',
        steps: [
            'Take the bar from a rack so it rests across your upper back, as for a back squat, and step back.',
            'Stand with your feet hip-width apart, knees slightly bent, and brace your middle.',
            'Push your hips back and lean forward, back flat, until your body is nearly level with the floor.',
            'Push your hips forward to stand back up.',
        ],
        tips: ['Start much lighter than you squat; only go as low as you can with a flat back.'],
    },
    {
        id: 'builtin:back-extension',
        name: 'Back extension',
        otherNames: ['Hyperextension', 'Roman chair back extension', '45-degree back extension'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['lower-back', 'glutes'],
        supportingMuscles: ['hamstrings'],
        description:
            'With your hips on a pad and your heels held, you lower your body forward and lift it back up. Builds a strong lower back.',
        steps: [
            'Set the pad so its top edge sits just below your hips, and hook your heels under the foot pads.',
            'Cross your arms over your chest, with your body in a straight line.',
            'Bend at your hips to lower your body towards the floor, keeping your back flat.',
            'Lift yourself back up until your body is straight again, without leaning back past it.',
        ],
        tips: ['Too easy? Hold a plate against your chest.'],
    },
    {
        id: 'builtin:nordic-curl',
        name: 'Nordic curl',
        otherNames: ['Nordic hamstring curl', 'Nordic ham curl'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['hamstrings'],
        supportingMuscles: ['glutes', 'calves'],
        description:
            'Kneeling with your heels held down, you lower your body slowly towards the floor. One of the hardest hamstring moves.',
        steps: [
            "Kneel on a pad with your heels held down by a partner, or hooked under something that won't move.",
            'Keep your body straight from knees to head, arms in front of your chest.',
            'Lower yourself forward as slowly as you can, holding it with your hamstrings.',
            'Catch yourself on your hands, then push off the floor to get back up.',
        ],
        tips: [
            "It's the lowering that counts: most people can't pull themselves back up at first.",
        ],
    },
    {
        id: 'builtin:seated-calf-raise',
        name: 'Seated calf raise',
        otherNames: ['Machine seated calf raise', 'Seated calf machine'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['calves'],
        supportingMuscles: [],
        description:
            'Sitting at a machine with a pad on your knees, you lift your heels. Works the lower part of your calves.',
        steps: [
            'Sit at the machine with the balls of your feet on the step and the pad resting on your thighs, just above your knees.',
            'Lift your heels to raise the pad, and release the safety lever.',
            'Lower your heels below the step until you feel a stretch in your calves.',
            'Rise up onto your toes as high as you can, and hold for a moment at the top.',
        ],
        tips: ["Don't bounce at the bottom; pause there for a moment before lifting."],
    },
    {
        id: 'builtin:hip-abduction',
        name: 'Hip abduction',
        otherNames: ['Hip abduction machine', 'Abductor machine', 'Seated hip abduction'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['abductors'],
        supportingMuscles: ['glutes'],
        description:
            'Sitting at a machine, you push your knees out against pads. Works the outsides of your hips.',
        steps: [
            'Sit at the machine with your back against the pad and the pads on the outsides of your knees.',
            'Push your knees out as far as they will go.',
            'Hold for a moment, then let them back in slowly, without letting the weights touch.',
        ],
        tips: ['Lean forward a little to work more of your glutes.'],
    },
    {
        id: 'builtin:hip-adduction',
        name: 'Hip adduction',
        otherNames: ['Hip adduction machine', 'Adductor machine', 'Seated hip adduction'],
        equipment: ['machine'],
        measuredBy: 'reps',
        mainMuscles: ['adductors'],
        supportingMuscles: [],
        description:
            'Sitting at a machine, you squeeze your knees together against pads. Works your inner thighs.',
        steps: [
            'Sit at the machine with your back against the pad and the pads on the insides of your knees.',
            'Set it so your legs start apart, as wide as is comfortable.',
            'Squeeze your knees together until the pads meet.',
            'Hold for a moment, then let them back out slowly.',
        ],
        tips: [
            "Don't start wider than feels comfortable; the stretch at the start is where it's hardest.",
        ],
    },

    // Seventh batch: back, pulling and bodyweight pushing
    {
        id: 'builtin:inverted-row',
        name: 'Inverted row',
        otherNames: ['Bodyweight row', 'Australian pull-up', 'Body row'],
        // A barbell in a rack, or a Smith machine, or rings: each choice is met by either.
        equipment: [
            ['barbell', 'smith machine', 'rings'],
            ['rack', 'smith machine', 'rings'],
        ],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'shoulders', 'forearms', 'abs'],
        description:
            'Lying under a bar set at waist height, you pull your chest up to it. A row using your own weight.',
        steps: [
            'Set a bar in a rack or Smith machine at about waist height (or hang rings there), and lie under it.',
            'Grip a little wider than your shoulders, and lift your hips so your body is straight from heels to head.',
            'Pull your chest up to the bar, squeezing your shoulder blades together.',
            'Lower yourself slowly until your arms are straight.',
        ],
        tips: [
            'Too hard? Set the bar higher, or bend your knees and put your feet flat. Too easy? Set it lower.',
        ],
    },
    {
        id: 'builtin:t-bar-row',
        name: 'T-bar row',
        otherNames: ['T bar row', 'Landmine row'],
        equipment: ['barbell'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['biceps', 'shoulders', 'lower-back', 'forearms'],
        description:
            'Leaning forward over a bar fixed at one end, you pull the loaded end up to your chest. Lets you row heavy.',
        steps: [
            'Wedge one end of a bar into a corner or landmine, load the other end, and stand astride it facing the plates.',
            'Push your hips back and lean forward until your back is nearly flat, and grip the bar just behind the plates.',
            'Pull it up to your chest, elbows back, squeezing your shoulder blades together.',
            'Lower it until your arms are straight, without letting your back round.',
        ],
        tips: [
            'A V-shaped cable handle hooked under the bar gives you a grip for both hands.',
            'Keep your back still: only your arms move.',
        ],
    },
    {
        id: 'builtin:straight-arm-pulldown',
        name: 'Straight-arm pulldown',
        otherNames: ['Straight arm pulldown', 'Straight-arm lat pulldown', 'Cable pullover'],
        equipment: ['cable'],
        measuredBy: 'reps',
        mainMuscles: ['upper-back'],
        supportingMuscles: ['triceps', 'abs'],
        description:
            'Standing at a high cable, you sweep a bar down to your thighs with straight arms. Works your back without your biceps.',
        steps: [
            'Set the cable high with a straight bar or rope, and hold it with your hands shoulder-width apart.',
            'Step back, lean forward a little from your hips, and hold your arms out straight at about head height.',
            'Keeping your arms straight, pull the bar down in an arc until it touches your thighs.',
            'Let it back up slowly until your arms are at head height again.',
        ],
        tips: [
            'Keep a slight bend in your elbows, but never more: bending them turns it into a pushdown.',
        ],
    },
    {
        id: 'builtin:rack-pull',
        name: 'Rack pull',
        otherNames: ['Rack deadlift', 'Block pull'],
        equipment: ['barbell', 'rack'],
        measuredBy: 'reps',
        mainMuscles: ['lower-back', 'glutes', 'traps'],
        supportingMuscles: ['hamstrings', 'upper-back', 'forearms'],
        description:
            'A deadlift from a bar resting on the rack, about knee height. Works the top of the lift, usually heavier.',
        steps: [
            "Set the rack's safety bars so the bar rests just below or just above your knees.",
            'Stand close to the bar, feet hip-width apart, and grip it just outside your legs.',
            'Push your hips back, flatten your back, take a big breath and brace.',
            'Push your hips forward to stand tall, then lower the bar back to the safety bars under control.',
        ],
        tips: ["Don't lean back at the top or shrug it up; just stand up straight."],
    },
    {
        id: 'builtin:band-pull-apart',
        name: 'Band pull-apart',
        otherNames: ['Band pull apart', 'Resistance band pull-apart'],
        equipment: ['band'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['upper-back', 'traps'],
        description:
            'Holding a band out in front of you, you pull it apart until it touches your chest. Good for the backs of your shoulders.',
        steps: [
            'Stand tall holding a light band in both hands, arms straight out in front at shoulder height.',
            'Pull your hands apart and out to the sides, squeezing your shoulder blades together.',
            'Stop when the band touches your chest, then let your hands come back together slowly.',
        ],
        tips: [
            'Keep your shoulders down, away from your ears.',
            'Too easy? Hold the band with your hands closer together.',
        ],
    },
    {
        id: 'builtin:cable-curl',
        name: 'Cable curl',
        otherNames: ['Cable biceps curl', 'Cable bicep curl', 'Standing cable curl'],
        equipment: ['cable'],
        measuredBy: 'reps',
        mainMuscles: ['biceps'],
        supportingMuscles: ['forearms'],
        description:
            'Standing at a low cable, you bend your elbows to lift a bar to your shoulders. The cable keeps the pull steady.',
        steps: [
            'Set the cable low with a straight or bent bar, and hold it with your palms facing up.',
            'Stand tall, close to the cable, arms straight and elbows by your sides.',
            'Keeping your elbows where they are, bend them to lift the bar towards your shoulders.',
            'Lower it slowly until your arms are straight.',
        ],
        tips: ["If you're leaning back to lift it, it's too heavy."],
    },
    {
        id: 'builtin:bench-dip',
        name: 'Bench dip',
        otherNames: ['Chair dip', 'Triceps bench dip', 'Tricep bench dip'],
        equipment: ['bench'],
        measuredBy: 'reps',
        mainMuscles: ['triceps'],
        supportingMuscles: ['chest', 'shoulders'],
        description:
            'With your hands on a bench behind you, you lower your body by bending your elbows and press back up.',
        steps: [
            'Sit on the edge of a bench, hands beside your hips, fingers over the edge.',
            'Walk your feet out and slide your bottom off the bench, arms straight.',
            'Bend your elbows to lower yourself until your upper arms are about level with the floor.',
            'Press back up until your arms are straight.',
        ],
        tips: [
            'Keep your back close to the bench, and stop higher if your shoulders ache.',
            'Too easy? Put your feet up on a second bench.',
        ],
    },
    {
        id: 'builtin:diamond-push-up',
        name: 'Diamond push-up',
        otherNames: ['Diamond press-up', 'Close-grip push-up', 'Triangle push-up'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['triceps', 'chest'],
        supportingMuscles: ['shoulders', 'abs'],
        description:
            'A push-up with your hands close together under your chest. Puts more of the work on the backs of your arms.',
        steps: [
            'Put your hands on the floor under your chest, thumbs and first fingers touching to make a diamond.',
            'Step your feet back so your body makes a straight line from head to heels.',
            'Lower yourself until your chest nearly touches your hands, elbows close to your sides.',
            'Push back up until your arms are straight.',
        ],
        tips: ['Too hard? Do them from your knees, or with your hands on a bench.'],
    },
    {
        id: 'builtin:pike-push-up',
        name: 'Pike push-up',
        otherNames: ['Pike press-up', 'Pike pushup'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['shoulders'],
        supportingMuscles: ['triceps', 'traps', 'abs'],
        description:
            'With your hips high in an upside-down V, you lower your head towards the floor and press back up. A shoulder press with no weights.',
        steps: [
            'Start in a push-up position, then walk your feet in and lift your hips high, so your body makes an upside-down V.',
            'Bend your elbows to lower the top of your head towards the floor, just in front of your hands.',
            'Press back up until your arms are straight, keeping your hips high.',
        ],
        tips: ['Too easy? Put your feet up on a bench or step.'],
    },
    {
        id: 'builtin:dead-hang',
        name: 'Dead hang',
        otherNames: ['Bar hang', 'Passive hang'],
        equipment: ['pull-up bar'],
        measuredBy: 'timed',
        mainMuscles: ['forearms'],
        supportingMuscles: ['upper-back', 'shoulders'],
        description:
            'You hang from a bar with your arms straight for as long as you can. Builds your grip and stretches your shoulders.',
        steps: [
            'Grip the bar about shoulder-width apart, palms facing away.',
            'Lift your feet, or step off a box, so you hang with your arms straight.',
            'Let your body relax and hang still, breathing steadily, until the time is up.',
        ],
        tips: [
            'Keep your feet just off the floor, or a box under you, so you can step down when your grip goes.',
        ],
    },

    // Eighth batch: conditioning and abs
    {
        id: 'builtin:burpee',
        name: 'Burpee',
        otherNames: ['Burpie', 'Full burpee'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'chest'],
        supportingMuscles: ['glutes', 'shoulders', 'triceps', 'abs'],
        description:
            'From standing, you drop to a push-up, jump your feet back in and jump up. Works nearly everything and gets you breathing hard.',
        steps: [
            'Stand tall with your feet shoulder-width apart.',
            'Squat down, put your hands on the floor, and jump your feet back into a push-up position.',
            'Do a push-up, then jump your feet back in towards your hands.',
            'Jump straight up, reaching your arms overhead, and land softly into the next one.',
        ],
        tips: [
            'Too hard? Step your feet back and in instead of jumping, and leave out the push-up.',
            "Keep your body straight when your feet land back; don't let your hips sag.",
        ],
    },
    {
        id: 'builtin:mountain-climber',
        name: 'Mountain climber',
        otherNames: ['Running plank'],
        equipment: ['none'],
        measuredBy: 'timed',
        mainMuscles: ['abs'],
        supportingMuscles: ['shoulders', 'quads', 'obliques'],
        description:
            'From a push-up position, you drive your knees to your chest in turn, quickly. Works your abs and gets your heart going.',
        steps: [
            'Start in a push-up position, hands under your shoulders and your body in a straight line.',
            'Bring one knee towards your chest, then step it back as you bring the other knee in.',
            'Keep swapping legs at a steady, quick pace until the time is up.',
        ],
        tips: [
            'Keep your hips level with your shoulders; letting them rise makes it easier than it should be.',
            'Too hard? Slow down and step each foot in, rather than running.',
        ],
    },
    {
        id: 'builtin:jumping-jack',
        name: 'Jumping jack',
        otherNames: ['Star jump', 'Side-straddle hop'],
        equipment: ['none'],
        measuredBy: 'timed',
        mainMuscles: ['calves', 'quads'],
        supportingMuscles: ['abductors', 'adductors', 'glutes', 'shoulders'],
        description:
            'You jump your feet out wide as your arms go up overhead, then jump back. A simple way to warm up or get breathing hard.',
        steps: [
            'Stand tall with your feet together and your arms by your sides.',
            'Jump your feet out wider than your shoulders, swinging your arms out and up over your head.',
            'Jump your feet back together as your arms come down to your sides, and keep going.',
        ],
        tips: [
            'Land softly on the balls of your feet.',
            'No jumping? Step one foot out to the side at a time instead.',
        ],
    },
    {
        id: 'builtin:jump-squat',
        name: 'Jump squat',
        otherNames: ['Squat jump', 'Jumping squat'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'calves'],
        description:
            'A squat where you jump as high as you can on the way up. Builds power in your legs.',
        steps: [
            'Stand with your feet shoulder-width apart, arms by your sides.',
            'Sit your hips back and down into a squat, swinging your arms back.',
            'Push hard through your feet to jump straight up, swinging your arms forward.',
            'Land softly with your knees bent, and go straight down into the next squat.',
        ],
        tips: [
            "Land quietly: if you're thudding down, bend your knees more as you land.",
            "Knees follow your toes; don't let them cave in when you land.",
        ],
    },
    {
        id: 'builtin:box-jump',
        name: 'Box jump',
        otherNames: ['Plyo box jump', 'Plyometric box jump'],
        equipment: ['step'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'calves'],
        description:
            'You jump from the floor up onto a sturdy box, landing softly. Trains your legs to push hard and fast.',
        steps: [
            'Stand facing a sturdy box about a step away, feet hip-width apart.',
            'Swing your arms back as you dip into a quarter squat.',
            'Swing your arms forward and jump up onto the box, landing softly on both feet with your knees bent.',
            'Stand up tall on the box, then step back down one foot at a time.',
        ],
        tips: [
            "Step down rather than jumping back off; it's far kinder on your ankles and knees.",
            'Start with a low box: if you land in a deep squat, it is too high.',
        ],
    },
    {
        id: 'builtin:bodyweight-squat',
        name: 'Bodyweight squat',
        otherNames: ['Air squat', 'Freehand squat', 'Body-weight squat'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['quads', 'glutes'],
        supportingMuscles: ['hamstrings', 'adductors'],
        description:
            'A squat with no weight: you sit down and stand back up. A good warm-up, and the place to start before adding weight.',
        steps: [
            'Stand with your feet shoulder-width apart, toes turned out a little, arms out in front of you.',
            'Sit your hips back and down, chest up, until your thighs are at least level with the floor.',
            'Push through your whole foot to stand back up.',
        ],
        tips: [
            "Knees follow your toes; don't let them cave in.",
            'Heels lifting? Turn your toes out a little more, and sit back as if onto a chair.',
        ],
    },
    {
        id: 'builtin:wall-sit',
        name: 'Wall sit',
        otherNames: ['Wall squat', 'Wall seat'],
        equipment: ['none'],
        measuredBy: 'timed',
        mainMuscles: ['quads'],
        supportingMuscles: ['glutes', 'adductors'],
        description:
            'With your back flat against a wall, you hold a sitting position with no chair. Works your quads without moving.',
        steps: [
            'Stand with your back against a wall, feet hip-width apart and about a stride out from it.',
            'Slide down the wall until your thighs are level with the floor and your knees are at a right angle.',
            'Keep your back flat against the wall and hold, breathing steadily, until the time is up.',
            'Slide back up the wall to stand.',
        ],
        tips: [
            'Keep your knees over your ankles; move your feet further out if they come past your toes.',
            'Too hard? Stop higher up the wall. Too easy? Rest a weight on your thighs.',
        ],
    },
    {
        id: 'builtin:crunch',
        name: 'Crunch',
        otherNames: ['Crunches', 'Ab crunch', 'Floor crunch'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['abs'],
        supportingMuscles: ['obliques'],
        description:
            'Lying on your back, you curl your shoulders up off the floor towards your knees. The simplest move for your abs.',
        steps: [
            'Lie on your back with your knees bent, feet flat, and your hands lightly by your ears or crossed on your chest.',
            'Breathe out and curl your head and shoulders off the floor, bringing your ribs towards your hips.',
            'Lower your shoulders back to the floor slowly.',
        ],
        tips: [
            "Don't pull on your head with your hands; they're only resting there.",
            "Your lower back stays on the floor: it's a small curl, not a sit-up.",
        ],
    },
    {
        id: 'builtin:bicycle-crunch',
        name: 'Bicycle crunch',
        otherNames: ['Bicycle crunches', 'Bicycle sit-up'],
        equipment: ['none'],
        measuredBy: 'reps',
        mainMuscles: ['obliques', 'abs'],
        supportingMuscles: [],
        description:
            'Lying on your back, you bring each elbow to the opposite knee in turn, pedalling your legs. Works the sides of your middle.',
        steps: [
            'Lie on your back with your hands lightly by your ears and your knees lifted over your hips.',
            'Curl your shoulders up, then bring your right knee in and turn your left elbow towards it, straightening your left leg.',
            'Swap sides: bring your left knee in and turn your right elbow towards it, straightening your right leg.',
            'Keep going from side to side, slowly, with your shoulders off the floor.',
        ],
        tips: [
            'Turn your shoulders, not just your elbows: slow and controlled counts for more than fast.',
            'Count each side as a rep, or each pair, but always count the same way.',
        ],
    },
    {
        id: 'builtin:ab-wheel-rollout',
        name: 'Ab wheel rollout',
        otherNames: ['Ab rollout', 'Ab wheel', 'Ab roller'],
        equipment: ['ab wheel'],
        measuredBy: 'reps',
        mainMuscles: ['abs'],
        supportingMuscles: ['obliques', 'shoulders', 'upper-back', 'lower-back'],
        description:
            'Kneeling with your hands on an ab wheel, you roll it out in front of you and pull it back. Hard work for your abs.',
        steps: [
            "Kneel on a mat holding the ab wheel's handles, the wheel on the floor under your shoulders.",
            'Brace your middle and roll the wheel forward slowly, letting your body lower towards the floor.',
            'Go as far as you can without your lower back sagging.',
            'Pull the wheel back towards your knees with your abs, to come back to the start.',
        ],
        tips: [
            'Start with short rollouts, and go further as you get stronger.',
            'Too easy? Do it from your feet instead of your knees.',
        ],
    },
];
