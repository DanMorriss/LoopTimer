# LoopTimer

[![CI](https://github.com/DanMorriss/LoopTimer/actions/workflows/ci.yml/badge.svg)](https://github.com/DanMorriss/LoopTimer/actions/workflows/ci.yml)

LoopTimer is an interval timer for anything done in timed repetitions: workouts, study sessions, or other structured activities. You set a work time, a rest time and a number of rounds, save the timer to a library, and run it whenever you need it.

**Try it:** https://loop-timer-eight.vercel.app

Built with Angular 22 (standalone components, signals and Signal Forms), Angular Material and Tailwind CSS.

## What it does today

- **Create a timer** with a work time (up to 99:59), an optional rest time, and 1–30 rounds. Give it a title, or leave it untitled.
- **Run it.** A ring fills as each phase goes by. Work fills clockwise in pink, rest fills anticlockwise in blue, and the face flashes in the phase colour. The page shows the rounds left and "Last one!" for the final round. There's no rest after the last round.
- **Keep accurate time.** The countdown is worked out from the clock, not by counting ticks. It stays correct if the tab is in the background or the phone is locked, and catches up as soon as you come back. Refreshing the page carries on where you were.
- **Save and reuse timers** in the library: start, edit or delete any of them. Timers are saved in the browser (`localStorage`), so they stay on that device.
- **Accessible:**
  - Everything works with a keyboard.
  - Screen readers hear "Work, round 1 of 3", "Rest" and "Finished" as each phase starts.
  - Looping animations stop when the system's reduced-motion setting is on.
  - Every page passes automated axe checks (WCAG 2.1 AA).

## Running it locally

You'll need **Node 24** (see `.nvmrc`) and npm.

```bash
nvm use        # switches to Node 24, if you use nvm
npm ci         # install dependencies
npm start      # dev server at http://localhost:4200, reloads as you edit
```

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/loop-timer` |
| `npm test` | Unit tests with Karma, in watch mode |
| `npx ng test --watch=false --browsers=ChromeHeadless` | Run the tests once in headless Chrome (what CI runs) |
| `npm run format:check` / `npm run format` | Check or apply Prettier formatting |

## Tests

Every pull request runs the format check, these tests and the production build in GitHub Actions (`.github/workflows/ci.yml`).

There are around 140 unit tests (Jasmine and Karma, running in Chrome). As well as the usual component and service tests, they include:

- **Timer logic** (`src/app/timer/timer-state.ts`): phase changes on exact seconds, no rest after the last round, zero rest skipped, and catching up after delayed ticks.
- **Accessibility** (`src/app/a11y.spec.ts`): renders the whole app and runs [axe-core](https://github.com/dequelabs/axe-core) over every page and state, including the delete dialog and the timer mid-workout. Any WCAG 2.1 A/AA or best-practice violation fails the test.

## Project layout

```
src/app/
  home/              Landing page with the infinity logo (Create / Library)
  nav/               Header: site title and home button
  timer-setup/       Create or edit a timer (Signal Forms)
  timer-library/     Saved timers
    timer-card/        One timer in the list: start, edit, delete
    delete-timer-dialog/
  timer/             The running timer: ring, countdown, announcements
    timer-state.ts     Works out phase, time left and round from elapsed time
  shared/
    state/timer-store.service.ts   Saved timers and the active timer
    components/infinity-button/    Animated button used on the empty library
    reduced-motion.ts              Follows the system reduced-motion setting
  a11y.spec.ts       axe checks across the whole app
```

## Roadmap

These come from the original plan and aren't built yet:

- **Multiple intervals per timer**, e.g. 30 seconds then 45 seconds, rather than a single work/rest pair.
- **Run until stopped:** repeat with no fixed number of rounds.
- **Controls while running:** pause, resume and stop.
- **Alarms:** a different sound, vibration or notification for each interval, including when the phone is locked. Today work and rest only look different on screen.
- **Settings:** alarm order and sounds, light/dark theme, vibration on or off.
- **History:** a log of completed workouts.

Smaller technical follow-ups are tracked in [TODO.md](TODO.md).

## User stories

| | Story | Status |
|---|---|---|
| 1 | As a user I want to be able to create an alarm telling me when to start and end an 'x' second exercise with a 'y' second break that repeats 'z' times. | ✅ Done |
| 2 | As a user I want to be able to create an alarm telling me when to start and end an 'x' second exercise with a 'y' second break that repeats until I turn it off manually. | Planned |
| 3 | As a user I want to be able to set different notifications for each different interval of time so I know when I am entering a different period of time. | Partly: work and rest are clearly different on screen; sounds and vibration are planned |
| 4 | As a user I want the timers to continue if my phone screen locks so I can work out with my phone in my pocket. | Partly: the countdown keeps correct time while locked and catches up when you return; alerts while locked are planned |
| 5 | As a user I want to be able to see the alarms I have created in the past so I can reuse them. | ✅ Done (the library) |

<details>
<summary>Original design notes (wireframes)</summary>

These are the screens from the original plan. Some have been built differently (for example, saving happens when you start a timer, and the library uses a menu for edit and delete), and some are still on the roadmap.

1. **Home screen.** Landing page with the title and links to Set Timer, Timer Library and Settings.
2. **Setup screen.** Configure timers and cycles:
   - Add multiple intervals with "+ Add Interval", each with a duration input and a delete icon.
   - A cycle count, with an infinite-loop option that disables it.
   - "Start Timer", "Reset" and "Save" buttons.
3. **Save modal.** Name input with "Save" and "Cancel".
4. **Active timer screen:**
   - A big countdown for the current interval.
   - Smaller text such as "Interval 2 of 3, Cycle 1 of 5".
   - An overall progress bar.
   - Pause/Resume, Stop and Save controls.
5. **Timer library screen.** A list of saved timers with "Edit" and "Delete".
6. **Confirm delete modal.** "Do you want to delete the timer {name}?" with "Yes" and "No".
7. **Settings screen (optional):**
   - Default alarm order: drag to reorder sounds, with a play button to preview each one.
   - Light/dark theme.
   - Vibration on or off.
8. **History screen (optional).** A log of completed cycles: start time, cycles and total duration, with an option to delete entries.

</details>
