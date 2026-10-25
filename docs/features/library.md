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
- **Starting**: **one tap on a card** starts the workout from the beginning and opens the workout page; a play glyph at the card's left says so. The whole card is a button, "Start Legs day", so keyboards reach it and screen readers hear its summary with it. If a workout is already going, it's ended and logged as stopped first.
- **Swipe to delete**: a card swiped to the left follows the finger, showing **Delete** behind it in red, which turns solid once letting go would delete it. On letting go, where the swipe would carry it decides: past halfway it carries on off the card and deletes it, with the Undo bar; short of that it springs back. Caught again on its way off, it stops where it is and isn't deleted. A swipe to the right resists. Up and down scroll the page as usual; a swipe never starts the workout.
- **Hold for options**: holding a card still for half a second (or right-clicking it) opens its options, as ⋮ does.
- **Options** (⋮ on each card, or a hold; one open at a time, and a tap elsewhere closes it): **Edit** opens the workout in setup (see [build-a-workout](build-a-workout.md), BLD-6); **Delete** removes it from the library at once, and the **Undo bar** says "Deleted "Legs day"" with **Undo**, which puts it back where it was (see [home-and-navigation](home-and-navigation.md#undo)). Its history entries stay, under the title it had.
- However it's deleted, the cards after it **slide** up to close the gap, and Undo slides them back to make room as the card fades back in (at once with reduced motion, the fade staying). **Add workout** rides up with the Undo bar as it appears, rather than jumping.
- **Empty library**: "Nothing in the library yet, best go make a workout." with a **Create a workout** button. With workouts, there's an **Add Workout** button instead (one main button per screen).

## Acceptance criteria

- Given no workouts, then the empty message and "Create a workout" show, and no "Add Workout".
- Given a workout with work 1:05 and rest 0:20 for 3 rounds, then its card shows "01:05 - 00:20" and 3.
- Given a workout of five unnamed steps, two of them reps, then its card shows "5 steps · mm:ss + reps".
- Given a workout of Squats, Bench press, Rows and a rest, then its card shows "Squats, Bench press + 1 more".
- Given a workout that runs until stopped, then its card shows ∞.
- Given a workout with a 20:00 time limit, then its card shows "in 20:00" in place of the rounds.
- Given a card, when I tap it, then that workout starts and the workout page opens.
- Given a card, when I swipe it left past halfway (or flick it), then it's deleted with Undo; when I let go short of halfway, then it springs back.
- Given a card, when I hold it, then its options open, and letting go doesn't start it.
- Given I delete a workout, then it's gone at once, and when it was the last one, the empty message shows; when I press Undo, then it's back where it was.

## Platform notes

- **Web:** `WorkoutLibraryComponent` and `WorkoutCardComponent` (`src/app/workout-library/`), at `/library`. The card's swipe uses `project()`, `rubberband()` and `VelocityTracker` from `src/app/shared/gesture.ts`, and springs with `criticallyDampedSpring()` from `src/app/shared/spring.ts`. The cards close up and open out around a deleted one with `captureLayout()` (`src/app/shared/layout-change.ts`). Workouts are saved by `WorkoutStore`.
- **iOS:** a `List` where tapping a row starts it, with `.swipeActions` for Delete (a full swipe deletes), a `.contextMenu` for Edit and Delete on a hold, and the same Undo.
- **Open question:** deleting the workout that's running doesn't stop the run on the web; after a reload the run is gone. Decide what a port should do.
