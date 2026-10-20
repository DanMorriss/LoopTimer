# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

- [ ] **Create starts empty, and rename Work:** a new timer opens with no steps, just the Add buttons and a short hint (e.g. "Add a step to start"); Start stays disabled until there's some work, and the last step can be deleted. Editing a saved timer is unchanged. Rename the Work step to "Timer" (Dan's idea). **To decide first:** "Timer" clashes with the whole timer (the library of timers, "Start timer", Timer in the menu), giving an "Add timer" button inside a timer and "Timer, round 1 of 3" read out; "Timed" or "Time" avoids that. Only the label changes: saved data keeps `kind: 'work'`, so no migration. Touches BLD-1, BLD-5, alarm and screen reader wording (`docs/features/`).
- [ ] **Weight on rep steps, in kg or lb:** a weight wheel at the bottom of the rep step, next to the reps wheel (like minutes and seconds). Optional: blank for bodyweight moves, which show just "20 reps". Steps of 0.5, up to about 300 kg / 660 lb; typing a number works as on the other wheels. Shown on the timer ("20 reps @ 60 kg"), in "Next:", on library cards where it fits, and read out by screen readers. New setting **Weight units**: kg (default) or lb. Weights are always saved in kg, unrounded, and converted for display, so switching units loses nothing (45 lb saves as 20.41 kg and still shows 45 lb). New story in `docs/features/build-a-timer.md` and `settings.md`; update `data.md`.
- [ ] **Change reps and weight mid-workout, and log each set:** while waiting on a rep step, tap the reps or weight to change them before Done (e.g. going up a weight). The change counts for this set, the rest of this workout's rounds, and is saved to the timer, so next time starts from there. Each history entry gains a log of its sets (step, round, reps, weight), shown simply under the entry, e.g. "Squats 3 × 10 @ 60 kg", or "10, 10, 8 @ 60 kg" when the sets differed. Needs the weight item first. Anything more in the history (progress over time and so on) is for the item below.
- [ ] **Work out where the app is going: fitness tracker, planner, workout helper:** LoopTimer has grown from an interval timer towards something bigger. Before building much more, decide what it's for and how that changes it. Questions to answer:
    - Who is it for, and what's the main job: running a workout, planning a programme, or tracking progress?
    - Exercises as things in their own right (Squats used across many timers), so their history can be followed, rather than step names that happen to match.
    - History and progress: per-exercise progress over time (e.g. "Squats: 50 → 60 kg over 6 weeks"), personal bests, streaks, weekly totals. There's a lot of scope here, so plan it properly rather than adding bits.
    - Planning: a weekly plan or programme, what's due today, progressing the weight automatically.
    - Naming and navigation: is "LoopTimer" and a library of "timers" still the right shape (e.g. workouts, made of exercises)?
    - Data: backups, export/import, sync between devices, and what an iPhone app needs (`docs/features/`).
    - Output: a short written direction, then new stories in `docs/features/` and items here, replacing any of the above that change.
- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend. Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).
- [ ] **Alarm order setting:** pick which sound plays for each step, with a preview. Needs the sound files first.

## 2. Design

Nothing open.

## 3. Known issues

Nothing open.
