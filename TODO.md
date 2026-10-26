# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Phase 1: Foundations

Do these first: everything after builds on them. The data is ready for sync (#81) and has exercises in it (#86: your own exercises and notes, steps and sets linked to exercises, `data-version` 4, backup version 4). All 80 built-in exercises are written (#79–#88; more can be added at the end of the backlog in `docs/writing-exercises.md`, by the `exercise-writer` agent). Create picks exercises, your own can be renamed and edited, and your notes show mid-workout (EXR-1–3, EXR-9, EXR-10). Timers are called workouts throughout, in the code and saved data too (EXR-5). The Exercises list and a page per exercise are built (EXR-6–8), and Create shows an exercise's details (EXR-11), with hiding, deleting your own, how-to steps and tips, and your equipment remembered; Phase 3's progress goes on the exercise page. The history is in IndexedDB with no cap (SYN-5), so years of progress fit. Phase 1 is done.

### Phase 2: Feedback in the workout

Making it clearer which part of the workout is happening, as agreed with Dan on 2026-10-22, is done: Pause and End workout (Stop is gone from the running screen), the workout summary (RUN-7) with Back to workout and "Use these settings next time?", "Next:" pulsing in a step's last seconds, and each step rolling in on a drum like the number wheels (sideways for a new round). So are "Last time" on each rep step (PRG-1) and personal bests on the workout summary (PRG-2), and a different look per step type: an icon each, work's ring tip and last-second pops, rest's gentle settling in and breathing with what's after it on the face, the big rep count and Done's swell, long names fitted to the circle, the step strip, and the whole workout's time left. Phase 2 is done.

### Phase 3: Progress pages

Timed sets are logged now (a set per timed work step of an exercise that runs to its end), so timed exercises have a history for the longest hold and the muscles worked; workouts from before have rep sets only. PRG-3 and PRG-4 are done (the exercises list's latest and best, and the exercise page's bests, chart and recent sessions; history set lines link there), and so is PRG-6 (the body map on the history page, shaded by sets in the last 7 days). Phase 3 is done.

### Phase 4: Sync

- [ ] **Pick a backend and sign-in:** compare options (e.g. Supabase, Firebase, our own) for cost, offline support and an iPhone app later; write it up in `docs/features/backup-and-sync.md`.
- [ ] **Accounts and sync (SYN-3, SYN-4):** the device's copy stays the working copy; changes go up when online, most recent change wins.

### Phase 5: Simple planning

- [ ] **Weekly plan and Due today (PLN-1–3).**

### Phase 6: Suggested next weight

A rep step offers a step up (2.5 kg or 5 lb) when every set hit its reps last time (PRG-5). Phase 6 is done.

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible once Phase 4 adds one). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

## 2. Design

### Feedback by page (2026-10-26)

From Dan going through the app on 2026-10-26.

The Library page's items are done (LIB-3–5).

#### General

The General items are done: swiping the workout bar right ends the workout and opens its summary, the summary's Done goes on to the workout in the history (View history is gone), the Privacy notice and Terms of use are linked under About in Settings (SET-6), and the favicon is the ∞ and its light on the Start button's cyan (option E of the mock-ups).

#### Workout page

The Workout page's items are done: the reps and weight on the face are wheels, and Done is the "Next:" pill.

#### Exercises page

The Exercises page's items are done: an exercise's page slides in over the list and back off, and swiping right on it goes back.

#### History page

The History page's items are done: a bar per muscle group against 10 to 20 sets a week (PRG-8), and a suggested next workout for the least worked muscles (PRG-9).

### Apple-style design review

From reviews against Apple's WWDC design talks (Designing Fluid Interfaces, Principles of Great Design) on 2026-10-24 and 2026-10-25. Everything they found is done, the small things last: a `theme-color` per theme and a manifest, a dragged step lifted off the list, Done finishing the ring with its beep and vibration, and the clock ticking on each alarm so the beep, the vibration and the face's roll come together.

## 3. Known issues

- [ ] **Try adding the app to the Home Screen on an iPhone:** the manifest and `theme-color` were added on 2026-10-26 and checked only in Chromium. Check that it opens on its own (no Safari bars) with the ∞ icon, that the status bar takes the page colour in both themes (switch theme in Settings while it's open), and that nothing at the top of a page hides under the status bar. If it does, the header needs `env(safe-area-inset-top)`.
- [ ] **Try swiping the workout bar right on an iPhone:** added on 2026-10-26 and tested only in Chromium with simulated touches. Check that the bar follows the finger with End workout showing behind it, letting go past halfway ends the workout and opens its summary, short of that it springs back, scrolling up and down over the bar still works, and the link or Pause a swipe starts on isn't pressed.
- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does (data on the device only; Vercel hosting and Google Fonts see an IP address), with GitHub issues for questions. They name no country's law and no contact email; decide whether they should, and update the privacy notice before sync (Phase 4) sends anything off the device.
- [ ] **The favicon's light only moves in Firefox:** `favicon.svg` moves it round the loop with SMIL, which Chrome, Edge and Safari don't run in a tab, so they show it still. Moving it everywhere would mean redrawing the icon from script (e.g. while a workout runs), which background tabs slow to about once a second.

- [ ] **A progress chart test can fail when the whole suite runs at once:** "narrows the chart to a range, and says when nothing falls in it" failed once in a full local run on 2026-10-24, once in eight on 2026-10-25 and once in two on 2026-10-26, and passes on its own. Ruled out on 2026-10-25: the history's background load landing mid-test (waiting for `HistoryStore.ready` first didn't stop it), and spec files sharing storage (files run at once, but each has its own localStorage). Its message, caught in a full run on 2026-10-26: after picking "4 weeks" the chart has 0 dots where 1 is expected (`exercise-progress.component.spec.ts:130`), so the narrowed range sometimes leaves out the set it should keep; look at how the range's start is worked out against the test's dates (e.g. a set right on the 4-week edge, or "now" read at different moments). The wheel picker's "turns with a mouse drag and snaps to a whole row", which failed with it on 2026-10-24, now waits for the wheel to stop rather than a fixed time.
- [ ] **Try the swipe back on an exercise's page on an iPhone:** added on 2026-10-26 with pointer events and tested only in Chromium with simulated touches. Check that a swipe right follows the finger and slides back to the list, that scrolling up and down still works, and what happens when the swipe starts at the very left edge, where Safari has its own Back swipe (which plays its own slide and skips ours).
- [ ] **Try the summary's drag from its content on an iPhone:** added on 2026-10-25 with touch events (Safari has no `touch-action: pan-down`), and tested only in Chromium with simulated touches. Check that, scrolled to the top, a finger moving down on the stats drags the sheet; moving up scrolls; a scrolled-down wheel in the sets still turns; and the button a drag starts on isn't pressed.
- [ ] **The initial load is close to its 500 kB budget:** 493 kB on 2026-10-25, after the built-in exercises' words moved out to load on demand. 498.7 kB on 2026-10-26, after the workout bar learnt to swipe right to end a workout (it's on every page, so it loads up front), and 499.2 kB after the theme learnt to colour the browser's bars. Each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment), so only a few more would reach the budget: make the saving below first. The next saving found then was Material's icon module in the tab bar, run bar and undo bar (about 16 kB), as inline SVG instead.
- [ ] **The body map can't shade abductors:** react-native-body-highlighter has no abductor shapes on either figure (still none upstream on 2026-10-25, though its slug is mapped in `tools/build-body-shapes.mjs`), so exercises that work them (side plank, hip abduction) list them without shading. Fix by drawing the shapes ourselves, or swap to a diagram that has them.
- [ ] **Try holding and dragging a library card on an iPhone:** added on 2026-10-26 and tested only in Chromium with simulated touches. Check that holding a card lifts it (with no text selection or link menu), dragging it then moves it and doesn't scroll the page, letting go of it unmoved opens its options, and a quick swipe left still deletes.
- [ ] **The library's order won't sync:** it's the order of the saved list, not part of a workout's record, so when sync comes (SYN-3) a workout moved on one device won't move on another (an open question in `docs/features/library.md`).
- [ ] **Try the face's reps and weight wheels on an iPhone:** added on 2026-10-26 and tested only in Chromium. Check that tapping the count opens its wheel over the ring (not cut off by the circle), a finger can carry straight on and turn it, it closes on its own, and the face doesn't scroll or slide while it's open.
- [ ] **The muscle bars' aim is the same for every muscle:** 10 to 20 sets a week (PRG-8), the usual advice for building muscle, so small muscles hardly anyone trains on their own (neck, shins, abductors) always show as under, and so does most of the body for someone training for fitness rather than size. Decide whether small muscles get a lower aim, or the aim becomes a setting (an open question in `docs/features/progress.md`).
