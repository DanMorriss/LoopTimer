# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Phase 1: Foundations

Do these first: everything after builds on them. The data is ready for sync (#81) and has exercises in it (#86: your own exercises and notes, steps and sets linked to exercises, `data-version` 3, backup version 3).

- [ ] **Write the built-in exercise list (for EXR-6, EXR-7):** all 80 written, in `src/app/models/built-in-exercises.ts`, so the list is complete for now. More can be added at the end of the backlog in `docs/writing-exercises.md`, with its rules and voice; the `exercise-writer` agent (`.claude/agents/`) writes one batch of 10 per run and raises it as a PR, for Dan to review before the next. Since #86, saved steps link to them by name; they're shown in the app once the exercise pages are built.
- [ ] **Fill the equipment gaps found in review:** a preacher bench for the preacher curl (#84 lists it as a `bench`), and rings or a Smith machine as choices for the inverted row (#87 lists `barbell` and `rack`). Add the new items to `Equipment` in `exercise.ts` and to the list in `docs/features/exercises.md`, then update those exercises.
- [ ] **Exercises in the app (EXR-1–3, EXR-9, EXR-10):** the data side is done in #86 (`ExerciseStore`; a step's name links it to an exercise when the timer is saved). Still to build: a picker in Create (search the list, or type a new name to make one), renaming your own exercises everywhere (the history could show an exercise's current name through `exerciseId`), editing your own exercise's details, and your note on an exercise shown on its page and beside the rep step mid-workout. Steps can still have no exercise; weights follow the settings unit.
- [ ] **Exercise pages (EXR-6–8):** browse and search the list, and a page per exercise with its description, how-to steps and the body map (`<app-body-map [main] [supporting]>`, built in #83). Phase 3's progress goes on the same page.
- [ ] **More room for history (SYN-5):** move it from `localStorage` to IndexedDB and lift the 500-entry cap, so years of progress fit.
- [ ] **"Workouts", not "Timers" (EXR-5):** rename in the menu, library, Create, the timer page, history ("Untitled timer") and the docs. The app keeps the name LoopTimer; code names can follow or stay.

### Phase 2: Feedback in the workout

- [ ] **Last time (PRG-1):** on each rep step, "Last time: 10, 10, 8 @ 60 kg".
- [ ] **Personal bests (PRG-2):** called out on the finished screen.

### Phase 3: Progress pages

- [ ] **Latest and best on the exercises list (PRG-3).**
- [ ] **Progress on the exercise page (PRG-4):** chart over time, bests, recent sessions, under the description and body map. History entries' set lines can link here.
- [ ] **Muscles worked this week (PRG-6):** the body map on the history page, shaded by sets in the last 7 days.

### Phase 4: Sync

- [ ] **Pick a backend and sign-in:** compare options (e.g. Supabase, Firebase, our own) for cost, offline support and an iPhone app later; write it up in `docs/features/backup-and-sync.md`.
- [ ] **Accounts and sync (SYN-3, SYN-4):** the device's copy stays the working copy; changes go up when online, most recent change wins.

### Phase 5: Simple planning

- [ ] **Weekly plan and Due today (PLN-1–3).**

### Phase 6: Suggested next weight

- [ ] **Suggested next weight (PRG-5):** double progression, as drafted in `docs/features/progress.md`.

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible once Phase 4 adds one). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

## 2. Design

- [ ] **Weights on library cards:** a card sums up a round (e.g. "4 steps · 01:30 + reps") rather than listing steps. Revisit with the "Workouts" rename in Phase 1: a workout card could list its exercises (e.g. "Squats, Bench press + 1 more"), which would make weights on cards unnecessary.

## 3. Known issues

- [ ] **Library cards show a timer's id as a tooltip:** hovering a card's title shows "ID: " and the id, which since #81 is a long random UUID. Drop the tooltip in the "Workouts" rename (EXR-5).
- [ ] **The body map can't shade abductors:** react-native-body-highlighter has no abductor shapes on either figure, so exercises that work them (side plank, hip abduction) list them without shading. Fix by drawing the shapes ourselves, or swap to a diagram that has them.
- [ ] **Two devices can each make the same exercise of their own:** typing "Sled push" on a phone and on a laptop makes two exercises with different ids, and importing one device's backup on the other keeps both (steps link to whichever was there first). Merge exercises of your own that share a name when importing, or before sync (SYN-3).
