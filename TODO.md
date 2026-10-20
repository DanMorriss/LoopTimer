# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend. On trial: Settings → "Beeps with the screen locked" (off by default) plays the beeps as an `<audio>` track, which iOS keeps playing when locked, and shows the workout on the lock screen with Pause and Play (user story 4). Try it on an iPhone, in Safari and as a home-screen app, locked mid-workout; if it works, turn it on by default. Known limits: it pauses other music while a workout runs, and a track covers 45 minutes from the last start, pause or Done, so a longer stretch with the phone locked goes quiet after that.
- [ ] **Alarm order setting:** pick which sound plays for each step, with a preview. Needs the sound files first.

## 2. Design

Nothing open.

## 3. Known issues

Nothing open.
