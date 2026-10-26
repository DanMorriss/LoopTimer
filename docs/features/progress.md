# Progress

Built: last time on each rep step (PRG-1), personal bests on the workout summary (PRG-2), latest and best on the exercises list (PRG-3), progress on the exercise page (PRG-4), the muscles worked this week on the history page (PRG-6), the most rounds in a time limit (PRG-7), a bar per muscle group against the sets a week aimed for (PRG-8), and a suggested next workout (PRG-9). The suggested weight (PRG-5) is planned (see [direction](../direction.md)); its rules are a first draft and get firmed up, with acceptance criteria, when it's built. Builds on [exercises](exercises.md) and the sets in the [history](history.md).

## Stories

- **PRG-1** As a user, mid-workout, I want to see what I did last time on each rep step, so I know what to beat.
- **PRG-2** As a user I want to be told when I've set a personal best, when the workout finishes.
- **PRG-3** As a user I want a list of my exercises, each with its latest and best.
- **PRG-4** As a user I want a page per exercise with a chart over time, its bests and its recent sessions.
- **PRG-5** As a user I want the app to suggest the next weight to try, based on how my last sessions went.
- **PRG-6** As a user I want to see which muscles I've worked this week, on the body map, so I can spot what I'm missing.
- **PRG-7** As a user I want to be told when I've done more rounds than ever in a workout with a time limit, so I know I'm getting fitter.
- **PRG-8** As a user I want a bar per muscle group for this week's sets, so I can see which I'm overworking and which I'm underworking.
- **PRG-9** As a user I want the history to suggest which of my workouts to do next, one that works the muscles I've used least this week.

## Rules

### Sessions

- A **session** of an exercise is one workout in the history with sets of it: its sets linked to the exercise, from every step that was it. Sets with no exercise (an unnamed rep step) aren't anyone's.
- Bests count **across all workouts** the exercise is in, not per workout (EXR-1), and only from logged sets, so a stopped workout counts for the sets that were done.

### What it's measured by

- **Weight**, where any set of it had a weight; otherwise **reps**, where it has any rep sets; otherwise (timed sets only) **time**. It's worked out from the sets logged, not from the exercise's "Reps" or "Timed".

### Personal bests (PRG-4, PRG-2)

- **Heaviest**: the heaviest weight lifted for at least 1 rep, with the most reps done at it, e.g. "100 kg × 5".
- **Estimated one-rep max**, by the Epley formula: weight × (1 + reps ÷ 30), to the nearest 0.5 in the unit shown; a single rep is the weight itself. Shown with the set it came from, e.g. "116.5 kg, from 100 kg × 5". It isn't capped at the weight wheel's top.
- **Most reps** in one set, with its weight if it had one, e.g. "12 @ 60 kg", or "25" for bodyweight. Of equal reps, the heavier set.
- **Longest**: the longest timed set, e.g. "1:30". Timed sets are only logged from October 2026 (see [history](history.md)).
- Each shows only when a set counts towards it, so a bodyweight exercise has most reps only, and a timed one the longest only.
- On a tie, the **first time** it was done stands, dated then.

### On the exercises list (PRG-3)

- A card of an exercise with sessions adds **Latest**: its latest session's sets as the history writes them, and the date, e.g. "Latest 3 × 10 @ 60 kg · 18 Oct" (the year is added if it wasn't this year). A session with two steps of it joins them with " + ".
- And **Best**, by what it's measured by: the heaviest weight ("80 kg"), the most reps ("25 reps") or the longest ("1:30").
- Cards of exercises not done yet are unchanged.

### On the exercise page (PRG-4)

Under the body map, a **Progress** section:

- With no sessions: "Nothing logged yet. Do it in a workout and its bests and progress show up here."
- **Bests**, as tiles, each with when it was set.
- **A chart**, titled by what it shows: "Estimated one-rep max" (by weight), "Most reps in a set" (by reps) or "Longest set" (by time). One point per session: the session's best of that. A session with no set that counts (e.g. a bodyweight session of a weighted exercise) has no point.
    - **Range**: 4 weeks, 3 months, Year (365 days), or All (the default). A fixed range runs to today; All runs from the first session to the latest. With nothing in range: "Not done in the last 4 weeks." (and so on).
    - The value axis runs between round numbers (whole reps, halves of a kg or lb, round seconds) and never below 0. Dates at each end of the time axis.
    - **Reading it**: hovering snaps to the nearest workout and shows its value, date and workout. With the keyboard, the chart takes focus, starts on the latest workout, and the left and right arrows (and Home and End) step through them; screen readers hear each, e.g. "105 kg, 21 October 2026, Legs".
    - **Show as a table** lists the same points: date, workout and value.
- **Recent sessions**, newest first: the 5 latest, then "Show all N". Each has its date and workout, linking to it in the history (`/history?run=<id>`), and its sets as the history writes them.
- Weights are in the unit chosen in settings.

### Mid-workout: last time (PRG-1)

- On a rep step linked to an exercise, under its reps and weight: the rep sets of that exercise from the most recent workout that had any, in the history's set format, e.g. "Last time: 10, 10, 8 @ 60 kg". A workout with two steps of it joins them with " + ".
- Not the workout being done: it's in the history too once it's been ended (and taken back up) or the page closed, but its sets aren't "last time".
- Timed sets don't count, and nothing is shown the first time, or on an unnamed rep step.

### On the workout summary: personal bests (PRG-2)

- Under the sets, **Personal bests** lists each best above that this workout set, e.g. "Heaviest: 100 kg × 5" and "Most reps: 12 @ 60 kg", across every exercise in it.
- Only a **new** best counts: equalling one doesn't (the first time stands), and nor does doing an exercise for the first time, when everything would be a best.
- Nothing shows when it set none, or when it wasn't logged (ended before its first step was done).

### Most rounds in a time limit (PRG-7)

- A workout with a time limit (BLD-8) is scored by how far it got: full rounds, then steps done of the next, e.g. "7 rounds + 3" beats "7 rounds + 1" and "6 rounds + 5".
- On the summary, under **Personal bests**: "Most rounds: 7 rounds + 3", when it got further than every other run of the **same workout to the same time limit** that ran out. Runs stopped before time was up don't count, nor do other time limits (20:00 isn't compared with 10:00).
- As with the other bests, a tie isn't one, and nor is the first run.

### In the history

- Each set line's name links to its exercise's page, where it's linked to an exercise that's still there (see [history](history.md)).
- **Muscles worked this week (PRG-6):** under "Last 7 days", the [exercises](exercises.md) body map, shaded by the sets of workouts started in the last 7 days: each set counts 1 for its exercise's main muscles and ½ for supporting ones. A muscle with 1 or more shades as main, under 1 as supporting, and the map's lists say which. Sets with no exercise, or of an exercise since deleted, don't count. Not shown with no sets to count.
- **Bars per muscle (PRG-8):** under the body map, a bar for each of the 18 muscle groups, most worked first and A to Z on a tie, with its sets this week counted as above. Each track has the **aim** shaded as a band: **10 to 20 sets a week**, the usual advice for building muscle. Under 10 is **under** (a grey bar), 10 to 20 **in range** (cyan), over 20 **over** (pink); the bar ending short of the band or past it says the same without colour, and a screen reader hears e.g. "Glutes: 2 sets, under 10". The tracks run to 25 sets, or further when a muscle has had more. A key under them explains the band and the counting.
- **Suggested next workout (PRG-9):** a card under the muscles, with the saved workout whose muscles have had the fewest sets this week: the average of this week's sets over the muscles its exercises work, its main muscles counting twice its supporting ones, lowest wins. On a tie, the one done longest ago (never done first), then the library's order. It names up to three of its main muscles, least worked first: "For Chest (0 sets), the least worked this week.", and Start starts it, as the library's Start does. Workouts with no step linked to an exercise aren't suggested; with none to suggest, there's no card. Shown even in a week with no sets, when it's the workout done longest ago.

### Planned

- **Suggested weight (PRG-5), later:** double progression: hit the target reps on every set → suggest one step up (2.5 kg, or 5 lb); otherwise suggest the same weight. Shown as a suggestion only; the weight can still be changed mid-workout (RUN-6).

## Acceptance criteria

- Given 100 kg × 5 ten days ago and 80 kg × 10 then 60 kg × 12 two days ago, then the bests are Heaviest "100 kg × 5", Estimated one-rep max "116.5 kg" from 100 kg × 5, and Most reps "12 @ 60 kg"; in lb, Heaviest is "220.5 lb × 5".
- Given 5 reps at 60, 80 and 90 kg in three workouts, then the chart has three points, and with focus on it the latest is read first ("105 kg"); Home goes to the first ("70 kg") and the right arrow to the next ("93.5 kg").
- Given sessions 40 and 10 days ago, when I pick 4 weeks, then the chart has one point; with none in the last 4 weeks, it says "Not done in the last 4 weeks."
- Given a bodyweight exercise, then the chart is "Most reps in a set"; given only timed sets, "Longest set", with Longest the only best.
- Given 7 sessions, then the 5 latest are listed, each linking to its workout in the history, and "Show all 7" lists them all.
- Given 2 × 5 at 100 kg of back squats today, then its card says "Latest 2 × 5 @ 100 kg" and "Best 100 kg"; cards of exercises not done say neither.
- Given a history entry with back squats and an unnamed rep step, then "Squats" links to /exercises/back-squat and the unnamed step isn't a link.
- Given squats of 10, 10, 8 at 60 kg last time, when I reach a squats rep step, then it says "Last time: 10, 10, 8 @ 60 kg".
- Given squats of 10 at 60 kg last week, when this workout is in the history too (ended and taken back up, or the page refreshed), then a squats rep step still says "Last time: 10 reps @ 60 kg", not this workout's sets.
- Given 80 kg × 5 bench press last time, when I bench 100 kg × 5 and finish, then the summary lists "Personal bests" with "Heaviest: 100 kg × 5".
- Given 80 kg × 5 bench press last time, when I bench 80 kg × 5 again, or bench for the first time, then the summary has no personal bests.
- Given a 20:00 time limit run before to "7 rounds + 1", when I get to "7 rounds + 3", then the summary lists "Most rounds: 7 rounds + 3"; given "7 rounds + 1" again, or a first run, then it doesn't.
- Given two sets of back squats and one of bench press in the last 7 days, and a plank 9 days ago, then the history shows "Muscles worked this week" with 18 bars, starting Glutes (2 sets), Quads (2 sets), Adductors (1 set), all under 10.
- Given saved workouts Legs (back squats) and Push (bench press), and two sets of back squats this week, then the suggested next workout is Push, "For Chest (0 sets), the least worked this week.", and Start starts it.
- Given 22 sets for the chest this week, then its bar runs past the band and it's read as "over 20".

## Platform notes

- **Web:** the sums are in `src/app/models/progress.ts` (`sessionsByExercise`, `progressMeasure`, `exerciseBests`, `sessionValue`) and the wording in `src/app/exercises/progress-format.ts`. The page's section is `ExerciseProgressComponent` (`src/app/exercises/exercise-page/exercise-progress/`), an inline SVG chart in the `--accent` colour. `/exercises` now waits for the history to load, as `/exercises/:id` and `/history` do. Last time is `WorkoutComponent.lastTime` (with `describeSets()` from `src/app/history/history-format.ts`), the summary's bests `WorkoutSummaryComponent.personalBests` (most rounds with `isMostRounds()` in `models/progress.ts`), and the muscles this week `HistoryComponent.musclesWorked`, shown with `BodyMapComponent` and `MuscleBarsComponent` (`src/app/history/muscle-bars/`). The counting, the aim (`WEEKLY_SETS_LOW`, `WEEKLY_SETS_HIGH`) and the suggestion are in `src/app/models/muscle-balance.ts`; the bars' colours are the `--balance-*` tokens.
- **iOS:** Swift Charts (`LineMark` + `PointMark`, with `chartXSelection` for the readout) covers the chart; VoiceOver's audio graphs (`AXChartDescriptor`) can stand in for the arrow keys and the table.

## Open questions

- Is the weight step for PRG-5 a setting, or per exercise?
- Should the aim of 10 to 20 sets a week (PRG-8) be lower for small muscles (neck, shins, forearms), or a setting for people training for fitness rather than size? As it is, most people's bars are under for those.
