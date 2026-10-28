# Run a workout

## Stories

- **RUN-1** As a user I want to see at a glance which step I'm on, how long is left and which round it is, from across the room.
- **RUN-2** As a user I want to see what's coming next, so I can get ready for it.
- **RUN-3** As a user I want the workout to wait while I do a set of reps, and carry on when I tap Done.
- **RUN-4** As a user I want to know when I've finished, and be able to note how it went.
- **RUN-5** As a user I want the countdown to stay right even if my phone sleeps or I switch apps.
- **RUN-6** As a user I want to change the reps or weight while I'm on a rep step (e.g. going up a weight, or managing fewer reps), so what I log is what I did, and next time starts from there.
- **RUN-7** As a user I want a summary of how a workout went when I finish or end it, where I can correct a set, add a note, and go back to the workout if I ended it early.
- **RUN-8** As a user I want a workout with a time limit to count my rounds up, show the time left, warn me as it runs out, and stop when time's up, so I can just keep going until then.
- **RUN-9** As a user I want to check how a step's exercise is done, mid-workout, without leaving it.

## Rules

### Timing

- Each step counts down from its full time, in whole seconds, then the next starts at once. Rounds follow straight on.
- Rest after the last work or rep step of the **last round is skipped** (see [build-a-workout](build-a-workout.md)), so the workout finishes there.
- A workout that runs **until stopped never finishes** on its own.
- The countdown is worked out **from the clock** (now minus when it started, less any pauses), never by counting ticks. If the app is held up, it shows the right time as soon as it can, rather than running slow. The clock ticks on each quarter second of the run, and on each alarm, so the face rolls on to a step and the phone vibrates in the same tick the step's beep was booked for.
- Whole workout length = rounds × (sum of timed steps in a round) − (rest at the end of a round). Rep steps add whatever time they take on top.

### A time limit (RUN-8)

- Rounds go on one after another, **as many as fit**. Time's up when the countdown plus the time spent on rep steps reaches the limit: **reps and rests count**, pauses don't.
- When time's up the workout **finishes at once**, part-way through a step or not, as if it ran to its end: "Time's up" on the summary, the finish alarm, and logged as finished.
- **The score** is the full rounds done, and the steps done of the round it ran out in, rests left out: "7 rounds + 3". The step it ran out in isn't done, so a timed set of it isn't logged.
- **Alarms**: the steps' alarms as usual, up to the end; a short tick (see [alarms](alarms.md)) at 10 seconds left, and at 3, 2 and 1; then the finish. The end is known even while a rep step is waited on, so it's booked then too.

### Rep steps

- When the clock reaches a rep step, the workout **stops and waits**, however long it takes. The ring is full and still, in violet, and the face shows the reps, e.g. "20 reps", with the weight under them, e.g. "60 kg", or a quiet "+ kg" with none (see RUN-6).
- **Done** is the "Next:" line under the ring: a pill in the next step's colour, e.g. "Next: Rest · 01:00 →", with an arrow on to it. Screen readers hear "Done. Next: Rest · 01:00". It moves on to the next step, which starts from its **full time**. The big button stays **Pause**, as on any other step. While paused, the line is only what's next again, not a button.
- If Done had focus and the next step isn't a rep step (so Done goes), focus moves to Pause.
- As a rep step comes round, **Done swells once**, as it's the user's move now (not with reduced motion). The phone vibrates with the step's alarm, as for any step.
- **Pressing Done** finishes the set: the full ring stays a moment over the next step's, swelling out as it fades (not with reduced motion), in the same frame as the next step's beep and vibration.
- The time spent on reps doesn't come off any countdown, but it **counts as time spent** in the history.

### What's on screen

- **Title**: the workout's title. On a phone it takes the place of the app name in the header.
- **Round line**:

    - "round 2 of 5" for a workout of more than one round, with a dot per round (done, current, to go) when there are 15 rounds or fewer.
    - "**Last one!**" in place of the count in the final round.
    - "round 3 of ∞" for a workout that runs until stopped.
    - "round 3" for a time limit, with the **time left** under it, e.g. "12:34 left", in the accent colour for its last 10 seconds. Screen readers hear it with the round as each round starts, e.g. "Timed, round 3, 12:34 left"; the time left itself isn't read out as it ticks.
    - Nothing for a single-round workout.
    - The **time left of the whole workout**, e.g. "01:20 left", beside the dots, for a set number of rounds of timed steps only. Not with rep steps, which take as long as they take, nor until stopped.
    - A **strip of the round's steps** under it, one segment per step in its kind's colour: an outline to go, filled but quieter when done, and taller with a glow for the one in progress. Only when a round has more than one work or rep step (a plain work-and-rest workout leaves it out); hidden from screen readers, which hear the step number, e.g. "step 2 of 5", with each step.

- **Ring**: fills as the step goes by. Timed steps fill clockwise in pink, with a bright dot at the fill's leading edge so the clock is plain to see from across the room; rest fills anticlockwise in blue, with no dot, as it stays calm. The face behind the time is tinted in the phase colour, and holds still for most of the step. During rest the face **breathes**, growing very slightly and back every 4 seconds (not with reduced motion).
- **Face**:
    - An **icon for the step's kind** on its own line (a stopwatch for timed, a seated figure for rest, a dumbbell for reps), so the kinds aren't told apart by colour alone.
    - The step's name under it. Unnamed work shows just the icon over the time; unnamed rest says "Rest"; unnamed reps say "Reps".
    - An **(i)** to the right of the name of a step that's an exercise (RUN-9), drawn small in the face's quieter text colour but 44px to tap. It opens the exercise's details over the workout, as Create's Details does (EXR-11): what its page shows (its description, your note, the muscles it works, how to do it and tips), without Pick another or its progress. The workout carries on underneath, the clock too; Space and Escape are left to the dialog while it's open. Done (or Escape, or a tap outside) closes it, with focus back on the (i), or on Done or Pause if the workout has moved on to a step with no exercise meanwhile. A step that's only a name, e.g. "Jog", has none. Screen readers hear it as "Details of Push-up". Hidden while paused, with the rest of the face's text.
    - A **long name** is fitted to the circle: at full size on one line if it fits; otherwise on two even lines, e.g. "Bodyweight / squat"; and only if that's still too wide, shrunk as far as it needs to be, to no less than 70% of its size. A name too long even for that, e.g. "Single-leg Romanian deadlift" on a phone, gets a third line in the same way. Past that, its last line ends in "…". It's fitted again when the screen changes size, e.g. a phone turned round.
    - The time left as mm:ss, e.g. "00:45". On each of a timed work step's **last 3 seconds** (for a step longer than that) the time pops in a little large and settles. Not rest.
    - On a rep step, the **count is the big thing**, e.g. "12 reps", with the weight and "Last time" under it.
    - During **rest, what's after it**, e.g. "then Bench press · 12 reps @ 60 kg", under the countdown, to get ready for. Screen readers hear it from "Next:".
    - While paused, the face's text gives way to "Paused · 00:23", Resume and End workout (see [pause-and-stop](pause-and-stop.md)).
- **Moving on**: the face's text is on a drum behind the face, like the number wheels: the next step's text rolls up into view from below as the last one rolls away over the top, in perspective (three quarters of a second), so a new step is plain to see. When a new **round** starts the drum turns right to left instead, and the round line and dots above the ring turn with it. **Rest** settles in more gently: from a little way below, over most of a second, as the last step fades quickly away. The ring stays put. The text on its way out keeps showing the step it was, e.g. its last "00:01".
- **Your note** on the step's exercise (EXR-10), if you've written one, in a box under the ring, e.g. "Pause at the bottom". Any work or rep step linked to an exercise shows it; screen readers hear it with the step, e.g. "Push-ups, 20 reps, your note: Elbows in".
- **Next**: "Next: Plank · 00:45", "Next: Push-ups · 20 reps", "Next: Squats · 10 reps @ 60 kg", or "Next: finish" before the last step. Unnamed steps use their kind ("Timed", "Rest", "Reps").
    - In the **last 5 seconds** of a timed step (the last 3 for a step under 15 seconds), "Next:" becomes a pill in the next step's colour (pink for timed, blue for rest, violet for reps, the accent colour for finish) that swells and glows once a second, to get ready. Not on a rep step, where it's Done instead (above), and not while paused.
    - In the same seconds the **face** flares to full colour on each second and eases back to its tint, in time with "Next:": one "get ready" cue, rather than a flash all step long.

### Changing reps or weight mid-workout (RUN-6)

- While a rep step is waiting, the **reps and weight on the face are wheels**: closed, each is just its number in the face's text, with a short faint line under it (no box) that says it can be changed, with its unit beside it ("reps", "kg"). Tapping one opens it there, over the ring, as wheels open anywhere else: **Reps** 1–100, and **Weight** none, then halves, in the unit chosen in settings. No weight shows as "+", to add one. Screen readers hear them as spin buttons named "reps" and "Weight, kg".
- A change applies at once, to **this set, the rest of this workout's rounds, and the saved workout**, so next time starts from there. If the workout has been deleted from the library meanwhile, only this workout changes.
- A wheel closes by itself as it does anywhere else (on a pick, or two fifths of a second after it stops turning).
- Space on a focused wheel is left to the wheel, rather than pressing Done.

### Finishing, and the summary (RUN-4, RUN-7)

- The face says "**You're finished!**", the controls go, and the **summary** opens over the page by itself. End workout opens the same summary (see [pause-and-stop](pause-and-stop.md)).
- It's a sheet: the whole screen on a phone, a card in the middle on anything wider. Focus starts on its heading and stays inside it.
- It **rises in** on a spring with no bounce (from the bottom of the screen on a phone, a little way on a wider one) as the page behind dims, and **sinks back out the same way** when it closes.
- On a phone, a workout ended early can be **dragged down** by the grabber at the top of the sheet to go back to it, as Back to workout does; while it's scrolled to the top, its heading and title drag it too. The sheet follows the finger, resists being pulled up, and the page behind brightens as it goes. On letting go, where the flick would carry it decides: past halfway it carries on down at the finger's speed and goes back to the workout; short of that it springs back up, with a little bounce if it was flicked. It can be grabbed again mid-spring, even on its way down, and then it stays. A finished workout has no grabber, as there's nothing to go back to.
- It shows:
    - "**Workout finished**", "**Time's up**" (a time limit that ran out) or "**Workout ended**", and the workout's title.
    - **Time** (as in the history, pauses left out) and **Rounds**, e.g. "1 of 3 rounds · stopped", or "7 rounds + 3 in 20:00" for a time limit.
    - When time ran out part-way through a rep step: "**Time ran out during Push-ups. How many reps did you get?**", with a Reps wheel (starting at the step's reps) and **Add set**, which logs that many reps at the step's weight. It's a set like any other after that, and can be changed with the rest, but it doesn't make the score "+ 1", as the step wasn't finished, and "Use these settings next time?" leaves it out.
    - **Personal bests** this workout set (PRG-2), and "Most rounds: 7 rounds + 3" for a time limit beaten (PRG-7; see [progress](progress.md)).
    - **Sets**, one line per step as in the history, e.g. "Squats: 10, 10, 8 @ 60 kg" or "Plank: 3 × 0:45".
    - A **Note** box, saved to this workout in the history as you leave it.
    - Buttons: **Done** (the main one: on to the history, with this workout highlighted), and **Back to workout** for a workout ended early or one that runs until stopped. Escape does the same as Back to workout, where there is one.
- **Change reps or weight** (shown when there are rep sets) turns each rep set into a Reps and a Weight wheel, so a set logged wrongly can be corrected (e.g. the last set was 8, not 10). Timed sets ran as set, so they can't be changed. A change goes into this workout's history entry at once, and then asks "**Use these settings next time?**":
    - **Yes, use next time**: each rep step of the saved workout starts next time from its last set in this workout. It says "Saved: next time starts from these."
    - **No, just this time**: only the history changes.
- A workout ended before its first step was done has nothing logged: the summary says "Nothing to log", with no note box. Done still goes to the history.
- The workout is logged in the history once, when it finishes, wherever the user is in the app (see [history](history.md)). It's dated when it actually finished, even if the app only noticed later.

### No workout

- The workout page with no workout running says "No workout selected." with a link to choose one from the library.

## Acceptance criteria

- Given work 0:03, rest 0:02, 2 rounds, then it shows work 00:03 at the start, switches to rest exactly at 3s, starts round 2 at 5s, and finishes at 8s with no rest after the last work.
- Given rest of 0:00, then there's no rest phase at all.
- Given a workout of 5 rounds in its last round, then it says "Last one!".
- Given a workout of 20 rounds, then it says "round 1 of 20" with no dots.
- Given the app is held up for 10 seconds mid-step, when it catches up, then it shows the right time and phase straight away.
- Given a rep step is reached, when an hour goes by, then it's still waiting on the same step.
- Given a rep step, when Done is pressed, then the next step starts from its full time.
- Given a rep step at the very end of the last round, then the workout only finishes after Done.
- Given a round of only rep steps, then it runs with no countdown at all, waiting on each in turn.
- Given a rep step of 10 squats at 60 kg, then the face's wheels show 10 reps and 60 kg, "Next:" before it says "Squats · 10 reps @ 60 kg", and a screen reader hears "Squats, 10 reps at 60 kg".
- Given 20 push-ups in round 1, when I change them to 15 at 22.5 kg, then the face's wheels show 15 and 22.5, the saved workout has 15 at 22.5 kg, and round 2 starts from 15 at 22.5 kg.
- Given a step at 40 kg, when I set the weight to +, then the step has no weight.
- Given steps Squats (work), Rest, Plank (work), then the strip shows Squats as the first of three, screen readers hear "step 1 of 3", and it says "Next: Rest · 00:15".
- Given a step named "Bodyweight squat", then the face shows it on two lines at full size; given "Single-leg Romanian deadlift", then it's on two lines on a wide screen, and on three on a phone, never smaller than 70%.
- Given the workout finishes, then the summary opens with no Back to workout, and a note typed there is saved to it in the history.
- Given the summary, when I press Done, then the workout is over and the history opens with it highlighted.
- Given a workout ended early, on a phone, when I drag the summary down past halfway (or flick it down), then it goes back to the workout, paused; when I let go above halfway, then it springs back up.
- Given 20 push-ups at 40 kg in round 1 and the workout ended in round 2, when I change the set to 18 reps on the summary, then the history has 18; on "Yes, use next time" the saved workout starts from 18 at 40 kg, and on "No, just this time" it stays at 20.
- Given a workout ended early, when I press Back to workout, then it is paused where it was ended, with focus on Resume.
- Given work 0:20 then rest, then "Next: Rest" pulses in the rest colour from 00:05 left, and stops when paused.
- Given work 0:10, then "Next:" pulses only from 00:03 left.
- Given a rep step, then "Next:" never pulses.
- Given work 0:20, then the face holds a steady pink tint until 00:05 left, then flares once a second with "Next:".
- Given a new step in the same round, then its text rolls up from below; given round 2 starting, then the text and "round 2 of 3" turn in from the right; given a rest, then it settles in gently from just below.
- Given work 0:03, rest 0:02 and a time limit of 1:04, then 12s in it says "round 3" and "00:52 left", and screen readers heard "Timed, round 1, 01:04 left" at the start.
- Given that workout, when 1:04 has gone by, then it finishes with "Time's up" and "12 rounds + 1 in 1:04", logged as finished with 12 rounds and 1 step.
- Given work 0:03 then 10 push-ups and a time limit of 0:20, when the push-ups take 12 seconds, then after Done 00:05 are left.
- Given time runs out while push-ups are waited on, then the summary asks how many reps I got; Add set with 6 logs 6 push-ups, and the score stays as it was.
- Given work 0:03, rest 0:02, 2 rounds, then it says "00:08 left" at the start and "00:05 left" at the rest; given a rep step in the round, then there's no time left.
- Given Squats, Plank and Rest, then the strip shows work (current), work, rest (to go); at the rest, the two works are done and rest is current.
- Given work 0:10, then the time pops at 00:03, 00:02 and 00:01, and not in the rest after.
- Given Squats, Plank, Rest in round 1 of 2, then the rest's face says "then Squats · 00:03".
- Given a rep step comes round, then Done swells once; with reduced motion it doesn't.
- Given Jog (timed, just a name) then Push-ups (the Push-up exercise), then Jog has no (i); at Push-ups an (i) named "Details of Push-up" opens its details, with no Pick another, and the workout still waits on the push-ups; Space there doesn't press Done; Done closes them, with focus back on the (i).

## Platform notes

- **Web:** the maths is pure and has no Angular in it, so it can be ported line for line: `workoutStateAt()` in `src/app/workout/workout-state.ts` (where a workout is after so many ms, given the rep steps done and, for a time limit, the time they took; `stepsIntoRound()` gives the score's steps) and the helpers in `src/app/models/workout.ts`. The run itself is `ActiveRunService` (`src/app/shared/run/`), and the page is `WorkoutComponent` (`src/app/workout/`), with each kind of step's look and motion in `workout-steps.scss` and `workout-motion.scss`, the step strip in `step-strip/`, an exercise's details in the shared `ExerciseDetailsDialogComponent` (RUN-9), and long names fitted to the face by `fitName()` (`fit-name.ts`), which measures the text rather than counting letters.
- **iOS:** keep the same "work it out from the clock" design: store when the run started (moved on by pauses and rep steps) and derive everything else. That's also what makes a relaunch carry on correctly (see [pause-and-stop](pause-and-stop.md)). A `TimelineView` or a display-link tick only needs to redraw. The face's drum is a `rotation3DEffect` about the x axis (the y axis for a new round) with an anchor behind the face; a long name can use `ViewThatFits`, or `lineLimit(3)` with `minimumScaleFactor(0.7)`.
