# LoopTimer to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below.

## 1. Features

From the original plan (see the README's Roadmap and user stories):

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarms on a locked phone or another page:** iPhones suspend web audio when locked, and the alarms only play while the timer page is open. Notifications from a service worker may be the way round both (user story 4).
- [ ] **Multiple intervals per timer**, e.g. 30 s then 45 s then rest. This changes the `Timer` model and `timerStateAt()`, and needs a migration for saved timers.
- [ ] **Alarm order setting:** pick which sound plays for each interval, with a preview. Needs multiple intervals and the sound files first.
- [ ] **History:** a log of completed workouts (start time, rounds, total duration), with delete.

## 2. Design

- [ ] **Buttons, toggle switches and theme selection:** give them one consistent look, in both themes. Details to agree with Dan; starting points:
    - Buttons come in four styles: Material's raised button (setup's Start Timer), the animated `InfinityButtonComponent` (Pause, Stop, Create a timer), outlined pills (settings' Play buttons, the timer page's library link and sound prompt), and the library's Add Timer button.
    - Two switch designs: `ToggleSwitchComponent` (settings) and `InfinitySwitchComponent` (setup's until stopped).
    - The theme picker in settings: "Match system" wraps onto two lines on a phone.
