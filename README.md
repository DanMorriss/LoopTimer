# LoopTimer

[![CI](https://github.com/DanMorriss/LoopTimer/actions/workflows/ci.yml/badge.svg)](https://github.com/DanMorriss/LoopTimer/actions/workflows/ci.yml)

LoopTimer is an interval timer for anything done in timed repetitions: workouts, study sessions, or other structured activities. You build a round from work and rest steps, choose how many rounds (or until stopped), save the timer to a library, and run it whenever you need it.

**Try it:** https://loop-timer-eight.vercel.app

Built with Angular 22 (standalone components, signals and Signal Forms), Angular Material and Tailwind CSS.

## What it does today

- **Create a timer** from a list of work and rest steps in any order (up to 20), each up to 99:59 and optionally named, e.g. "Squats". Add steps, drag them into order (or use the up and down buttons), or delete them. Then pick 1–30 rounds or ∞ (until stopped). Times are picked on iPhone-style wheels: swipe, scroll or drag a wheel, click a number, or type one, and the one in the middle is selected. Give it a title, or leave it untitled. For ∞, scroll the rounds wheel past 30, or flip the ∞ switch beside it: the dot races round the loop and the wheel spins to ∞. Turning the switch off spins back to the rounds you had.
- **Run it.** A ring fills as each phase goes by. Work fills clockwise in pink, rest fills anticlockwise in blue, and the face flashes in the phase colour. The face shows the step's name and, when a round has several work steps, which step it is; underneath, what's up next. The page shows the rounds left and "Last one!" for the final round. Rest at the end of the last round is skipped.
- **Hear each phase start.** Two short high beeps for work, a long low tone for rest, and three rising notes at the finish, with matching vibrations on phones that support them (not iPhones). The beeps are scheduled ahead on the audio clock, so they stay on time in a background tab. Browsers only allow sound after a tap, so after a refresh the timer page shows a "Tap to turn on sound" button.
- **Pause, resume or stop** while it runs, or press Space to pause and resume. Pausing freezes the countdown and the ring where they are; stopping ends the workout and goes back to the library.
- **Keep accurate time.** The countdown is worked out from the clock, not by counting ticks. It stays correct if the tab is in the background or the phone is locked, and catches up as soon as you come back. Refreshing the page carries on where you were, paused or not.
- **Settings** (the gear, top left): a dark, light or match-system theme; turn sound or vibration off; and play each alarm sound to hear what it is. Saved in the browser, like timers.
- **Save and reuse timers** in the library: start, edit or delete any of them. Timers are saved in the browser (`localStorage`), so they stay on that device.
- **Accessible:**
  - Everything works with a keyboard, and Space pauses and resumes the timer.
  - Screen readers hear "Work, round 1 of 3", "Rest" and "Finished" as each phase starts, and "Paused" when paused.
  - Looping animations stop when the system's reduced-motion setting is on.
  - Every page passes automated axe checks (WCAG 2.1 AA) in both themes, and every text and control colour is checked for contrast against the surfaces it sits on.

## Running it locally

You'll need **Node 24** (see `.nvmrc`) and npm.

```bash
nvm use        # switches to Node 24, if you use nvm
npm ci         # install dependencies
npx playwright install chromium   # one-off: the browser the tests run in
npm start      # dev server at http://localhost:4200, reloads as you edit
```

Other commands:

| Command | What it does |
|---|---|
| `npm run build` | Production build into `dist/loop-timer` |
| `npm test` | Unit tests with Vitest in headless Chromium, re-running as you edit |
| `npx ng test --watch=false` | Run the tests once (what CI runs) |
| `npm run format:check` / `npm run format` | Check or apply Prettier formatting |

## Tests

Every pull request runs the format check, these tests and the production build in GitHub Actions (`.github/workflows/ci.yml`).

There are around 140 unit tests, run with [Vitest](https://vitest.dev) in browser mode: a real headless Chromium via Playwright, so layout and colour contrast are checked as a browser renders them. Timer tests use Vitest's fake clock (`vi.useFakeTimers()`). As well as the usual component and service tests, they include:

- **Timer logic** (`src/app/timer/timer-state.ts`): phase changes on exact seconds, no rest after the last round, zero rest skipped, and catching up after delayed ticks.
- **Accessibility** (`src/app/a11y.spec.ts`): renders the whole app and runs [axe-core](https://github.com/dequelabs/axe-core) over every page and state, including the delete dialog and the timer mid-workout. Any WCAG 2.1 A/AA or best-practice violation fails the test.

## Project layout

```
src/app/
  home/              Landing page with the infinity logo (Create / Library)
  nav/               Header: settings button, site title and home button
  settings/          Sound and vibration switches, and alarm previews
  timer-setup/       Create or edit a timer (Signal Forms)
  timer-library/     Saved timers
    timer-card/        One timer in the list: start, edit, delete
    delete-timer-dialog/
  timer/             The running timer: ring, countdown, announcements
    timer-state.ts     Works out phase, time left and round from elapsed time
    alarm-schedule.ts  When each alarm is due
  shared/
    state/timer-store.service.ts   Saved timers and the active timer
    state/settings-store.service.ts Saved settings
    theme/theme.service.ts         Applies the theme (colour tokens are in src/styles.scss)
    alarms/alarm.service.ts        Plays alarms on the audio clock, and vibrates
    components/infinity-button/    Animated button used on the empty library
    components/wheel-picker/       iPhone-style number wheel (a Signal Forms control)
    components/infinity-switch/    The ∞ (until stopped) switch in setup
    components/toggle-switch/      On/off switch used in settings
    reduced-motion.ts              Follows the system reduced-motion setting
  a11y.spec.ts       axe checks across the whole app
```

## Roadmap

These come from the original plan and aren't built yet:

- **Alarm sounds:** proper sound files in place of the generated beeps, and alarms on a locked phone.
- **Alarm order setting:** choosing the sound for each step.
- **History:** a log of completed workouts.

Work on these, plus design and technical follow-ups, is tracked in [TODO.md](TODO.md).

## User stories

| | Story | Status |
|---|---|---|
| 1 | As a user I want to be able to create an alarm telling me when to start and end an 'x' second exercise with a 'y' second break that repeats 'z' times. | ✅ Done |
| 2 | As a user I want to be able to create an alarm telling me when to start and end an 'x' second exercise with a 'y' second break that repeats until I turn it off manually. | ✅ Done (∞ rounds, and the Stop button) |
| 3 | As a user I want to be able to set different notifications for each different interval of time so I know when I am entering a different period of time. | Partly: each step can be named, and work and rest have their own colour, sound and vibration; choosing a sound per step is planned |
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
