# Pause, stop, and carrying on

## Stories

- **CTL-1** As a user I want to pause and resume a workout, for when I'm interrupted.
- **CTL-2** As a user I want to stop a workout early, and still have what I did logged.
- **CTL-3** As a user I want to pick up where I was if the app is reloaded or closed by mistake.
- **CTL-4** As a user I want a workout to keep going, alarms and all, while I look at other pages of the app.

## Rules

### Controls

- Like a media player: a big **Pause / Resume** button in the middle, and a smaller **Stop** to one side, so it's hard to hit by mistake. On a rep step the big button is **Done** instead (see [run-a-timer](run-a-timer.md)).
- On a keyboard, **Space** pauses and resumes, or presses Done on a rep step. It's ignored when held down (no flicker), with Shift, Ctrl, Alt or Cmd, once finished, and when a button or text box has focus (Space already does something there).

### Pause

- Pausing **freezes** the countdown, the ring and the flash where they are, and the face says "Paused". However long it's paused, it doesn't move on.
- Resuming carries on from exactly where it was. The time spent paused **doesn't count** as time spent in the history.
- Alarms booked ahead are cancelled on pause and booked again on resume. **An alarm that already sounded before the pause doesn't sound again** on resume, even if the pause came less than a second after it.
- Done on a rep step while paused carries on running.

### Stop

- Stop ends the workout, silences any alarm still sounding, and goes to the library.
- The workout is logged as **stopped**, with the full rounds done and the time spent so far, if **at least one step was done**. Stopping before the first step ends leaves no trace, so a timer started by mistake doesn't clutter the history.
- Starting another timer while one is going ends the first, logged as stopped by the same rule.

### Carrying on

- The run lives **outside the timer page**: its clock, alarms, vibration and history logging carry on on any page. The menu lists **Timer** first while a run is going, to get back to it.
- If the app is **reloaded**, the run carries on where it was, paused or not, rep steps and all. Alarms already past are skipped (only ones up to a second late still play).
- If the app is **closed**, the run is logged as it stands (stopped, or finished if it was). If it's reloaded and carries on, that same history entry is updated when it later stops or finishes, rather than adding another.
- A run is remembered **per tab** on the web, not across devices.

## Acceptance criteria

- Given a run 1.5s into work, when paused for 10 minutes, then it still shows the same time, and on resume carries on from there.
- Given a rest step that began half a second ago, when I pause and resume, then the rest alarm doesn't play again.
- Given a run paused, when the app reloads, then it's still paused at the same point.
- Given a run 4.5s in, when the app reloads, then it carries on from 4.5s, and only alarms still to come are booked.
- Given a run on its first step, when I stop, then nothing is logged.
- Given a run in round 2 of 3, when I stop, then it's logged as stopped, "1 of 3 rounds", with the time spent less pauses.
- Given a run going, when I open History, then the alarms carry on, and it's logged when it finishes even though I'm not on the timer page.
- Given a run going, when I start another timer, then the first is logged as stopped.
- Given a run going, when the tab closes, then it's logged as stopped; when it's reopened and the run finishes, then that entry becomes finished.

## Platform notes

- **Web:** `ActiveRunService` (`src/app/shared/run/active-run.service.ts`) owns the run; `TimerStore` (`src/app/shared/state/timer-store.service.ts`) saves the run's state in `sessionStorage` (see [data](data.md)). Closing the tab is caught with `pagehide`.
- **iOS:** the same few values (timer id, run start, adjusted start, paused at, rep steps done, rep time) saved to `UserDefaults` give "carry on after relaunch". There's no reliable "app is closing" hook on iOS, so log the run as it stands whenever the app goes to the background (`scenePhase` → `.background`), which covers being swiped away. The lock-screen controls of a Live Activity could offer Pause and Stop too.
