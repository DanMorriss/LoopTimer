# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

From the original plan (see the README's Roadmap and user stories):

- [ ] **Pause, resume and stop** while a timer runs. The countdown works from a saved start time, so pausing has to save the elapsed time as well.
- [ ] **Alarms between phases:** a sound, plus vibration where supported, when work or rest starts and when the workout ends, with a different sound for each interval (user story 3). This needs a user gesture to unlock audio. Background tabs and locked phones limit what can play (user story 4).
- [ ] **Run until stopped:** an option to repeat with no fixed number of rounds (user story 2). Pairs with Stop above.
- [ ] **Multiple intervals per timer**, e.g. 30 s then 45 s then rest. This changes the `Timer` model and `timerStateAt()`, and needs a migration for saved timers.
- [ ] **Settings:** alarm order and sounds, light/dark theme, vibration on or off.
- [ ] **History:** a log of completed workouts (start time, rounds, total duration), with delete.
