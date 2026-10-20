# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

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

- [ ] **Weights on library cards:** the weights item (#70) planned showing them on library cards where they fit, which wasn't done: a card sums up a round (e.g. "4 steps · 01:30 + reps") rather than listing steps. Decide whether a card should show weights at all (e.g. "+ reps @ 60 kg" for one weighted step), or leave it for the app-direction work.

## 3. Known issues

Nothing open.
