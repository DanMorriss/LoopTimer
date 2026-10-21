# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Phase 1: Foundations

Do these first: everything after builds on them. Exercises and the sync-ready data are one reshaping of the saved data, so do them together, with one conversion on load.

- [ ] **Write the built-in exercise list (for EXR-6, EXR-7):** about 60–100 common exercises in our own words, each with other names, equipment, how it's measured, main and supporting muscles, a one-line description, 3–5 how-to steps and a tip or two. Use free-exercise-db as a reference for which to include and their muscles, checked by hand; don't copy its text or photos. 20 so far in `src/app/models/built-in-exercises.ts` (batch 1 in #76, batch 2 in #77), with the content rules checked by its spec; keep writing them in batches of 10, each reviewed by Dan. Not used by the app until the exercises work below.
- [ ] **Body map component (for EXR-8):** front and back figures from react-native-body-highlighter's MIT shapes (keep the licence notice), as an Angular component that shades main and supporting muscles from colour tokens, with the muscle labels underneath as its key and text. Male and female figures, picked by a new "Body figure" setting (SET-5). Design: "A + C" in the exercise page options canvas linked from `docs/features/exercises.md`.
- [ ] **Exercises as things in their own right (EXR-1–4, EXR-9, EXR-10):** built-in and your own exercises, steps and logged sets pointing to an exercise id, a picker in Create (search the list, or type a new name to make one), renaming your own everywhere, your own note on any exercise, and existing step names and history converted on load (matched to built-in exercises where they can be). Add your own exercises to the backup file. Steps can still have no exercise; weights follow the settings unit.
- [ ] **Exercise pages (EXR-6–8):** browse and search the list, and a page per exercise with its description, how-to steps and the body map shaded for main and supporting muscles. Phase 3's progress goes on the same page.
- [ ] **Data ready for sync (groundwork for SYN-3):** random ids for workouts, exercises and history (convert the existing 1, 2, 3… timer ids), `updatedAt` on every record, and deletions kept as `deletedAt` markers in place of `history-deleted`. Bump the backup file to version 2 (converting version 1 on import) and merge imports by id and `updatedAt` instead of matching timers by content. Update `docs/features/data.md`.
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

Nothing open.
