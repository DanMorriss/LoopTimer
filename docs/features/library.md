# Library

## Stories

- **LIB-1** As a user I want to see the workouts I've made and start one, so I can reuse them.
- **LIB-2** As a user I want to edit or delete a saved workout.

## Rules

- The library lists every saved workout as a card, in the order they were made.
- Each card shows:
    - The **title**, or "Untitled workout".
    - A **summary of one round**:
        - Its **exercises** when any step is named: the work and rep steps' names in order, each once, e.g. "Squats, Bench press", or "Squats, Bench press + 1 more" with more than two. This replaces the times below, so the card says what's in it.
        - With no step named, "01:05 - 00:20" (timed - rest) for a workout of one timed step and at most one rest step. With no rest it shows "- 00:00".
        - "5 steps · 02:15" otherwise, with the length of one round.
        - "4 steps · 01:30 + reps" when a round has rep steps, since they take as long as they take, or "2 steps · reps" when there are no timed steps at all.
    - The **rounds**: the number, or ∞; or the time limit, e.g. "Squats, Push-ups in 20:00", read as "as many rounds as possible in 20:00".
- **Starting**: tapping a card selects it (one at a time) and shows a play button on it; the play button starts the workout from the beginning and opens the workout page. Tapping outside the cards clears the selection. If a workout is already going, it's ended and logged as stopped first.
- **Options** (⋮ on each card, one open at a time): **Edit** opens the workout in setup (see [build-a-workout](build-a-workout.md), BLD-6); **Delete** asks "Delete workout?", naming it, with Cancel and Delete. Deleting removes it from the library; its history entries stay, under the title it had.
- **Empty library**: "Nothing in the library yet, best go make a workout." with a **Create a workout** button. With workouts, there's an **Add Workout** button instead (one main button per screen).

## Acceptance criteria

- Given no workouts, then the empty message and "Create a workout" show, and no "Add Workout".
- Given a workout with work 1:05 and rest 0:20 for 3 rounds, then its card shows "01:05 - 00:20" and 3.
- Given a workout of five unnamed steps, two of them reps, then its card shows "5 steps · mm:ss + reps".
- Given a workout of Squats, Bench press, Rows and a rest, then its card shows "Squats, Bench press + 1 more".
- Given a workout that runs until stopped, then its card shows ∞.
- Given a workout with a 20:00 time limit, then its card shows "in 20:00" in place of the rounds.
- Given I select a card and press its play button, then that workout starts and the workout page opens.
- Given I delete a workout and cancel, then it's kept; given I confirm, then it's gone, and when it was the last one, the empty message shows.

## Platform notes

- **Web:** `WorkoutLibraryComponent` and `WorkoutCardComponent` (`src/app/workout-library/`), at `/library`. Workouts are saved by `WorkoutStore`.
- **iOS:** a `List` where tapping a row starts it would be more usual than select-then-play; swipe actions for Edit and Delete, with the same confirmation.
- **Open question:** deleting the workout that's running doesn't stop the run on the web; after a reload the run is gone. Decide what a port should do.
