# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarms on a locked phone or another page:** iPhones suspend web audio when locked, and the alarms only play while the timer page is open. Notifications from a service worker may be the way round both (user story 4).
- [ ] **Alarm order setting:** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Rep steps:** a step that's a number of reps rather than a time, e.g. "20 push-ups". There's no countdown: the timer shows the reps and waits for a "Done" tap (or Space) before moving on. This adds a third kind of step to the `Step` model, and `timerStateAt()` can no longer work purely from elapsed time: each rep step's finish time has to be recorded, much as pausing is now. Also affects the alarms (none can be booked past a rep step), "Next:", the library summary and history's total duration.

## 2. Design

- [ ] **The ∞ on the rounds wheel** renders small in the app's font.
- [ ] **Show that Space pauses:** it's announced to screen readers (`aria-keyshortcuts`), but there's no visible hint for keyboard users.

## 3. Known issues

- [ ] **The home page is too wide on the smallest phones:** the ∞ logo is 360px wide, so at 320px (iPhone SE 1st gen) the page scrolls sideways. It should scale down with the screen.
- [ ] **Runs left without Stop aren't in the history:** starting a different timer, or leaving the timer page mid-workout, drops the run. It could be logged as stopped when the next timer starts, or when the timer page closes.
- [ ] **A beep can repeat on resume:** pausing within a second of a step starting, then resuming, plays that step's beep again (the alarms allow up to a second's lateness, for the first beep after Start).
