# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend. Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (user story 4).
- [ ] **Alarm order setting:** pick which sound plays for each step, with a preview. Needs the sound files first.

## 2. Design

Nothing open.

## 3. Known issues

- [ ] **The home page is too wide on the smallest phones:** the ∞ logo is 360px wide, so at 320px (iPhone SE 1st gen) the page scrolls sideways. It should scale down with the screen.
- [ ] **A deleted history entry can come back:** a run still going is logged again when it finishes or the tab closes, so deleting its entry from History mid-run (or after a refresh logged it) brings it back then. Stopping or starting another timer ends the run, so this only affects a run left open. Remembering deleted ids would stop it.
- [ ] **A beep can repeat on resume:** pausing within a second of a step starting, then resuming, plays that step's beep again (the alarms allow up to a second's lateness, for the first beep after Start).
