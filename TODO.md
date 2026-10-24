# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Phase 1: Foundations

Do these first: everything after builds on them. The data is ready for sync (#81) and has exercises in it (#86: your own exercises and notes, steps and sets linked to exercises, `data-version` 4, backup version 4). All 80 built-in exercises are written (#79–#88; more can be added at the end of the backlog in `docs/writing-exercises.md`, by the `exercise-writer` agent). Create picks exercises, your own can be renamed and edited, and your notes show mid-workout (EXR-1–3, EXR-9, EXR-10). Timers are called workouts throughout, in the code and saved data too (EXR-5). The Exercises list and a page per exercise are built (EXR-6–8), and Create shows an exercise's details (EXR-11), with hiding, deleting your own, how-to steps and tips, and your equipment remembered; Phase 3's progress goes on the exercise page. The history is in IndexedDB with no cap (SYN-5), so years of progress fit. Phase 1 is done.

### Phase 2: Feedback in the workout

Making it clearer which part of the workout is happening, as agreed with Dan on 2026-10-22, is done: Pause and End workout (Stop is gone from the running screen), the workout summary (RUN-7) with Back to workout and "Use these settings next time?", "Next:" pulsing in a step's last seconds, and each step sliding in like the number wheels (sideways for a new round). A different look per step type is under Design. Next:

- [x] **Last time (PRG-1):** on each rep step, "Last time: 10, 10, 8 @ 60 kg".
- [x] **Personal bests (PRG-2):** called out on the workout summary (RUN-7), which has room left for them.

### Phase 3: Progress pages

Timed sets are logged now (a set per timed work step of an exercise that runs to its end), so timed exercises have a history for the longest hold and the muscles worked; workouts from before have rep sets only. PRG-3 and PRG-4 are done (the exercises list's latest and best, and the exercise page's bests, chart and recent sessions; history set lines link there), and so is PRG-6:

- [x] **Muscles worked this week (PRG-6):** the body map on the history page, shaded by sets in the last 7 days.

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

### Exercises list (any time)

Filtering the Exercises list (EXR-6) by muscle, asked for by Dan on 2026-10-23:

- [x] **Keep the muscle filter when coming back:** pick a muscle, open an exercise, then go back with the "Exercises" link at the top left, and the same muscles are still picked. Keeping the filter in the address (e.g. `/exercises?muscles=quads,glutes`) would make the browser's Back button keep it too, and the search could go there as well.
- [x] **Pick more than one muscle:** the pills toggle on and off, with "All muscles" clearing them. Draft: an exercise shows if any of the picked muscles is one of its main ones.
- [x] **Pick muscles on the body map:** tapping a muscle on the figure picks it, the same as its pill, and the picked muscles are shaded on the figure, so the pills and the figure always match. The figure needs tappable, keyboard-reachable shapes with names for screen readers; the abductors can't be picked there until the body map has them (see Known issues).

## 2. Design

- [x] **Weights on library cards:** a card sums up a round (e.g. "4 steps · 01:30 + reps") rather than listing steps. Now that they're workouts (EXR-5), a workout card could list its exercises (e.g. "Squats, Bench press + 1 more"), which would make weights on cards unnecessary.

- [ ] **A different look per step type on the workout page:** timed, rep and rest steps could each have their own look or motion (e.g. the "Next:" line rising into the ring and becoming the new label). The slides are in (`workout-motion.scss`), so this can be picked up whenever Dan wants.

### Apple-style design review

From a review against Apple's WWDC design talks (Designing Fluid Interfaces, Principles of Great Design) on 2026-10-24, highest impact first:

- [x] **Calmer workout screen:** the face holds a steady tint and pulses only in a step's last seconds, with "Next:"; the Pause button has no light band, and elsewhere the band crosses once rather than every few seconds.
- [x] **Press feedback on phones:** every button shrinks a little the moment it's pressed, and menu and list rows light up; hover looks only show where there's a mouse, so they don't stick after a tap (`src/styles/_interaction.scss`).
- [x] **Pause grows from its button:** Resume glides up from where Pause was into the ring, and back down on resume, on a no-bounce spring; it can be pressed mid-glide and turns round from where it is (`src/app/shared/spring.ts`). A FLIP animation rather than a view transition, which would block taps while it ran.
- [ ] **A tab bar on phones:** six pages sit behind ☰, and Home is an extra stop. A translucent bottom tab bar (Library, Exercises, History, Settings), hidden while a workout runs, says where you are and where you can go. If the ∞ home stays, give Create and Library a visible button shape. Prototype it first.
- [ ] **Type:** Audiowide is on everything at one weight. Keep it for titles and big numbers, and use `system-ui` for body text, labels and lists so weight can build hierarchy. The countdown on the face has no `tabular-nums`, so its digits shift each second. Letter spacing should change with size too (tighter on large text).
- [ ] **Sheets and dialogs leave the way they came:** the confirm, exercise editor and details dialogs have no enter or exit motion, and the summary has none on exit (`animate.leave`). On a phone, make the summary a bottom sheet that drags down to close, with rubber-banding and the flick's speed deciding close or snap back.
- [ ] **Undo rather than "are you sure?":** the library and exercise pages confirm deletes, while History deletes with Undo. Use Undo everywhere it can be; swipe left on a library card to delete, long-press for Edit, in place of ⋮.
- [ ] **One tap to start from the library:** a card takes a tap to select, then a tap on Play.
- [ ] **Reduced transparency and more contrast:** under `prefers-reduced-transparency`, make `--panel`, `--card` and `--raised` solid with no blur; under `prefers-contrast: more`, stronger borders. Tokens only, in `styles.scss`.
- [ ] **Small things:**
    - `viewport-fit=cover` (without it the `env(safe-area-inset-*)` already used is always 0), a `theme-color` per theme, and a manifest so it looks installed from the Home Screen.
    - Momentum when a wheel is flicked with a mouse (touch already has it).
    - Lift a dragged step (a slight grow and a deeper shadow).
    - Make Done feel finished: fill the ring, with the sound and a vibration on the same frame.
    - Check the beep, vibration and the face's slide all fire from the same tick in `ActiveRunService`.

## 3. Known issues

- [ ] **Some stylesheets are over the 4 kB warning budget:** `ng build` warns for workout-setup (5.6 kB), workout (5.7 kB), exercise-list and exercise-progress (4.6 kB each); the hover and press styles added a little to each. They're warnings, not errors (the limit is 8 kB). Fix by moving shared looks into `src/styles/` partials, as #109 did for the info tip (a component can now `@use` one by name, e.g. `@use 'interaction' as *;`, as `src/styles` is on the Sass include path), or raise the budget if the size is fine.
- [ ] **The initial bundle is over its 500 kB warning budget:** `ng build` says 524 kB (523 kB before the press styles, so it was already over). A warning, not an error (the limit is 1 MB). Look at what's loaded up front (Angular Material, the fonts' CSS) or raise the budget.
- [ ] **The body map can't shade abductors:** react-native-body-highlighter has no abductor shapes on either figure, so exercises that work them (side plank, hip abduction) list them without shading. Fix by drawing the shapes ourselves, or swap to a diagram that has them.
- [ ] **Two devices can each make the same exercise of their own:** typing "Sled push" on a phone and on a laptop makes two exercises with different ids, and importing one device's backup on the other keeps both (steps link to whichever was there first). Merge exercises of your own that share a name when importing, or before sync (SYN-3).
