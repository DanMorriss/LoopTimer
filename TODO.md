# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

From the original plan (see the README's Roadmap and user stories):

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarms on a locked phone or another page:** iPhones suspend web audio when locked, and the alarms only play while the timer page is open. Notifications from a service worker may be the way round both (user story 4).
- [ ] **Multiple intervals per timer**, e.g. 30 s then 45 s then rest. This changes the `Timer` model and `timerStateAt()`, and needs a migration for saved timers.
- [ ] **Light/dark theme setting.** The app is designed dark-only, so a light theme needs its own colour pass (including the Material theme in `src/material-theme.scss`). Sound and vibration settings are done.
- [ ] **Alarm order setting:** pick which sound plays for each interval, with a preview. Needs multiple intervals and the sound files first.
- [ ] **History:** a log of completed workouts (start time, rounds, total duration), with delete.
