# Library

## Stories

- **LIB-1** As a user I want to see the timers I've made and start one, so I can reuse them.
- **LIB-2** As a user I want to edit or delete a saved timer.

## Rules

- The library lists every saved timer as a card, in the order they were made.
- Each card shows:
    - The **title**, or "Untitled timer".
    - A **summary of one round**:
        - "01:05 - 00:20" (timed - rest) for a timer of one timed step and at most one rest step. With no rest it shows "- 00:00".
        - "5 steps · 02:15" otherwise, with the length of one round.
        - "4 steps · 01:30 + reps" when a round has rep steps, since they take as long as they take, or "2 steps · reps" when there are no timed steps at all.
    - The **rounds**: the number, or ∞.
- **Starting**: tapping a card selects it (one at a time) and shows a play button on it; the play button starts the timer from the beginning and opens the timer page. Tapping outside the cards clears the selection. If a workout is already going, it's ended and logged as stopped first.
- **Options** (⋮ on each card, one open at a time): **Edit** opens the timer in setup (see [build-a-timer](build-a-timer.md), BLD-6); **Delete** asks "Delete timer?", naming it, with Cancel and Delete. Deleting removes it from the library; its history entries stay, under the title it had.
- **Empty library**: "Nothing in the library yet, best go make a timer." with a **Create a timer** button. With timers, there's an **Add Timer** button instead (one main button per screen).

## Acceptance criteria

- Given no timers, then the empty message and "Create a timer" show, and no "Add Timer".
- Given a timer with work 1:05 and rest 0:20 for 3 rounds, then its card shows "01:05 - 00:20" and 3.
- Given a timer of five steps, two of them reps, then its card shows "5 steps · mm:ss + reps".
- Given a timer that runs until stopped, then its card shows ∞.
- Given I select a card and press its play button, then that timer starts and the timer page opens.
- Given I delete a timer and cancel, then it's kept; given I confirm, then it's gone, and when it was the last one, the empty message shows.

## Platform notes

- **Web:** `TimerLibraryComponent` and `TimerCardComponent` (`src/app/timer-library/`), at `/library`. Timers are saved by `TimerStore`.
- **iOS:** a `List` where tapping a row starts it would be more usual than select-then-play; swipe actions for Edit and Delete, with the same confirmation.
- **Open question:** deleting the timer that's running doesn't stop the run on the web; after a reload the run is gone. Decide what a port should do.
