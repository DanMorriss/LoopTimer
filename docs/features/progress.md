# Progress

Planned (see [direction](../direction.md)). Builds on [exercises](exercises.md). Rules are a first draft and get firmed up, with acceptance criteria, when this is built.

## Stories

- **PRG-1** As a user, mid-workout, I want to see what I did last time on each rep step, so I know what to beat.
- **PRG-2** As a user I want to be told when I've set a personal best, when the workout finishes.
- **PRG-3** As a user I want a list of my exercises, each with its latest and best.
- **PRG-4** As a user I want a page per exercise with a chart over time, its bests and its recent sessions.
- **PRG-5** As a user I want the app to suggest the next weight to try, based on how my last sessions went.
- **PRG-6** As a user I want to see which muscles I've worked this week, on the body map, so I can spot what I'm missing.

## Rules (draft)

- **Last time (PRG-1):** the sets of that exercise from the most recent workout that had it, in the history's set format, e.g. "Last time: 10, 10, 8 @ 60 kg". Nothing is shown the first time.
- **Personal bests (PRG-2, PRG-4):**
    - heaviest weight lifted for at least 1 rep
    - most reps at a weight
    - estimated one-rep max, by the Epley formula: weight × (1 + reps ÷ 30)
    - for timed exercises, the longest hold
    - a bodyweight exercise (no weight) has most reps in a set only.
- A best only counts from a logged set, so stopped workouts count for the sets that were done.
- **Chart (PRG-4):** one point per workout: the best estimated one-rep max for weighted exercises, the most reps for bodyweight, the longest time for timed. Over 4 weeks, 3 months, a year, or all.
- **Muscles this week (PRG-6):** the [exercises](exercises.md) body map, shaded by sets in the last 7 days: each set counts 1 for its exercise's main muscles and ½ for supporting ones. Shown on the history page with "Last 7 days". As text too, e.g. "Most worked: quads (12 sets), chest (9). Not worked: hamstrings, calves."
- **Suggested weight (PRG-5), later:** double progression: hit the target reps on every set → suggest one step up (2.5 kg, or 5 lb); otherwise suggest the same weight. Shown as a suggestion only; the weight can still be changed mid-workout (RUN-6).

## Open questions

- Should PBs count across all workouts an exercise appears in, or per workout? (Draft: across all, since that's the point of EXR-1.)
- Is the weight step for PRG-5 a setting, or per exercise?
