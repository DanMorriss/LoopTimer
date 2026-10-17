# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Design and usability

- [ ] **The rest colour is hard to see.** The pale rest blue, `oklch(90.1% 0.058 230.9)`, is 1.07:1 against the grey ring track (WCAG wants 3:1 for graphics like a progress ring), and its flash barely differs from the near-white face. Even the work pink is only 1.55:1.
  - Options:
    - A dark track (`slate-700 #334155`) fixes the ring for both phases: rest 7.8:1, work 5.4:1.
    - A stronger rest colour, such as sky-400 `#38bdf8` (black text on it 9.8:1), also makes the rest flash visible and matches the library's sky accents.
  - Recommended: both. Add a test that checks the ring colours against the track.
  - Decision needed: the exact rest colour.
- [ ] **iPhone-style wheel pickers on the setup page.** Replace the five `<select>`s (work and rest minutes and seconds, rounds). Swipe or scroll a list, and whichever number snaps to the middle is selected, with no tap needed.
  - Options:
    1. A small custom `WheelPicker` component (recommended):
       - CSS `scroll-snap` gives native momentum on touch, trackpad and mouse wheel.
       - Selection updates when scrolling settles (`scrollend`, with a fallback).
       - It plugs into Signal Forms as a custom control, so the form values go back to plain numbers and the `<select>` workarounds go away.
       - Keyboard and screen readers use the ARIA spinbutton pattern (Up/Down, Page Up/Down, Home/End).
    2. Ionic's `ion-picker`: heavy, and brings Ionic's styling and runtime.
    3. Keep `<select>`: on iPhone it already opens a wheel, but only after a tap, and not on desktop or Android.
  - Decisions needed:
    - A flat list with a highlighted middle band, or the curved 3D look.
    - How many rows show: 3 or 5.
    - Whether clicking or dragging with a mouse should also work on desktop.

## 2. Features

From the original plan (see the README's Roadmap and user stories):

- [ ] **Pause, resume and stop** while a timer runs. The countdown works from a saved start time, so pausing has to save the elapsed time as well.
- [ ] **Alarms between phases:** a sound, plus vibration where supported, when work or rest starts and when the workout ends, with a different sound for each interval (user story 3). This needs a user gesture to unlock audio. Background tabs and locked phones limit what can play (user story 4).
- [ ] **Run until stopped:** an option to repeat with no fixed number of rounds (user story 2). Pairs with Stop above.
- [ ] **Multiple intervals per timer**, e.g. 30 s then 45 s then rest. This changes the `Timer` model and `timerStateAt()`, and needs a migration for saved timers.
- [ ] **Settings:** alarm order and sounds, light/dark theme, vibration on or off.
- [ ] **History:** a log of completed workouts (start time, rounds, total duration), with delete.
