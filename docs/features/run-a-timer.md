# Run a timer

## Stories

- **RUN-1** As a user I want to see at a glance which step I'm on, how long is left and which round it is, from across the room.
- **RUN-2** As a user I want to see what's coming next, so I can get ready for it.
- **RUN-3** As a user I want the timer to wait while I do a set of reps, and carry on when I tap Done.
- **RUN-4** As a user I want to know when I've finished, and be able to note how it went.
- **RUN-5** As a user I want the countdown to stay right even if my phone sleeps or I switch apps.

## Rules

### Timing

- Each step counts down from its full time, in whole seconds, then the next starts at once. Rounds follow straight on.
- Rest after the last work or rep step of the **last round is skipped** (see [build-a-timer](build-a-timer.md)), so the workout finishes there.
- A timer that runs **until stopped never finishes** on its own.
- The countdown is worked out **from the clock** (now minus when it started, less any pauses), never by counting ticks. If the app is held up, it shows the right time as soon as it can, rather than running slow.
- Whole workout length = rounds × (sum of timed steps in a round) − (rest at the end of a round). Rep steps add whatever time they take on top.

### Rep steps

- When the clock reaches a rep step, the timer **stops and waits**, however long it takes. The ring is full and still, in violet, and the face shows the reps, e.g. "20 reps", with the weight under them if there is one, e.g. "60 kg".
- The main button becomes **Done** (in place of Pause). Done moves on to the next step, which starts from its **full time**.
- The time spent on reps doesn't come off any countdown, but it **counts as time spent** in the history.

### What's on screen

- **Title**: the timer's title. On a phone it takes the place of the app name in the header.
- **Round line**:
    - "round 2 of 5" for a timer of more than one round, with a dot per round (done, current, to go) when there are 15 rounds or fewer.
    - "**Last one!**" in place of the count in the final round.
    - "round 3 of ∞" for a timer that runs until stopped.
    - Nothing for a single-round timer.
- **Ring**: fills as the step goes by. Timed steps fill clockwise in pink, rest fills anticlockwise in blue. The face behind the time flashes in the phase colour.
- **Face**:
    - The step's name. Unnamed work shows just the time; unnamed rest says "Rest"; unnamed reps say "Reps".
    - The time left as mm:ss, e.g. "00:45", or the reps.
    - "step 2 of 5" when a round has more than one work or rep step. A plain work-and-rest timer leaves it out.
    - "Paused" while paused.
- **Next**: "Next: Plank · 00:45", "Next: Push-ups · 20 reps", "Next: Squats · 10 reps @ 60 kg", or "Next: finish" before the last step. Unnamed steps use their kind ("Timed", "Rest", "Reps").

### Finishing

- The face says "**You're finished!**", the controls go, and three buttons show:
    - **Add a note** (the main one): opens this workout in the history with its note box open.
    - **View history**: opens the history with this workout highlighted.
    - **Library**.
- The workout is logged in the history once, when it finishes, wherever the user is in the app (see [history](history.md)). It's dated when it actually finished, even if the app only noticed later.

### No timer

- The timer page with no timer running says "No timer selected." with a link to choose one from the library.

## Acceptance criteria

- Given work 0:03, rest 0:02, 2 rounds, then it shows work 00:03 at the start, switches to rest exactly at 3s, starts round 2 at 5s, and finishes at 8s with no rest after the last work.
- Given rest of 0:00, then there's no rest phase at all.
- Given a timer of 5 rounds in its last round, then it says "Last one!".
- Given a timer of 20 rounds, then it says "round 1 of 20" with no dots.
- Given the app is held up for 10 seconds mid-step, when it catches up, then it shows the right time and phase straight away.
- Given a rep step is reached, when an hour goes by, then it's still waiting on the same step.
- Given a rep step, when Done is pressed, then the next step starts from its full time.
- Given a rep step at the very end of the last round, then the workout only finishes after Done.
- Given a round of only rep steps, then it runs with no countdown at all, waiting on each in turn.
- Given a rep step of 10 squats at 60 kg, then the face shows "10 reps" and "60 kg", "Next:" before it says "Squats · 10 reps @ 60 kg", and a screen reader hears "Squats, 10 reps at 60 kg".
- Given steps Squats (work), Rest, Plank (work), then Squats shows "step 1 of 3" and "Next: Rest · 00:15".
- Given the workout finishes, then "Add a note" opens it in the history with the note box open.

## Platform notes

- **Web:** the maths is pure and has no Angular in it, so it can be ported line for line: `timerStateAt()` in `src/app/timer/timer-state.ts` (where a timer is after so many ms, given the rep steps done) and the helpers in `src/app/models/timer.ts`. The run itself is `ActiveRunService` (`src/app/shared/run/`), and the page is `TimerComponent` (`src/app/timer/`).
- **iOS:** keep the same "work it out from the clock" design: store when the run started (moved on by pauses and rep steps) and derive everything else. That's also what makes a relaunch carry on correctly (see [pause-and-stop](pause-and-stop.md)). A `TimelineView` or a display-link tick only needs to redraw.
