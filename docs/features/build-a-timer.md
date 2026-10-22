# Build a timer

## Stories

- **BLD-1** As a user I want to build a timer from work and rest steps that repeats a number of rounds, so it tells me when to start and stop each exercise.
- **BLD-2** As a user I want a timer that runs until I stop it, for when I don't know how many rounds I'll do.
- **BLD-3** As a user I want to name each step (e.g. "Squats"), so I know what to do next without remembering the order.
- **BLD-4** As a user I want a step that's a number of reps instead of a time (e.g. 20 push-ups), and takes as long as I take.
- **BLD-5** As a user I want to add, reorder and delete steps, to build a circuit.
- **BLD-6** As a user I want to edit a saved timer, so I don't have to build it again to change it.
- **BLD-7** As a user I want to add a weight to a rep step (e.g. 10 squats at 60 kg), so I know what to lift.

## Rules

### A timer

- A timer has a **title** (optional), a list of **steps** that make one round, and a number of **rounds**.
- Rounds: **1 to 30**, or **∞** (until stopped). A new timer starts at 1.
- Steps run in order to make one round; then the round repeats.
- **Rest at the end of the last round is skipped**: every rest step after the last timed or rep step of the round is left out of the final round, since the workout is over. Rest at the start or middle of a round is kept.
- A timer must have **some work**: at least one timed step with time, or one rep step with reps. Otherwise it can't be started, and once it has a step the form says "Timer needs a timed step or some reps".

### Steps

- Three kinds:
    - **Timed**: a time, 0:01 to 99:59 (minutes 0–99, seconds 0–59). Called "Work" until October 2026; saved data still says `work`.
    - **Rest**: a time, the same range.
    - **Reps**: a count, 1 to 100, and an optional **weight**. No countdown; the timer waits until Done (see [run-a-timer](run-a-timer.md)).
- Each step has an optional **name**, up to 40 characters, trimmed when saved. The name box suggests "e.g. Squats" (timed), "e.g. Catch your breath" (rest) or "e.g. Push-ups" (reps).
- A timed or rep step's name box is labelled **Exercise (optional)** and finds exercises as you type, or makes a new one (EXR-2, see [exercises](exercises.md#picking-an-exercise-exr-2)). A rest step's is a plain name box.
- **Up to 20 steps.** At 20, the add buttons are disabled and the page says "That's the most steps a timer can have (20)."
- A new timer starts with **no steps**, just the Add buttons and the hint "Add a step to start." Every step can be deleted, which brings the hint back.
- Steps left at **0:00 or 0 reps are left out** when the timer is saved.
- Back-to-back steps of the same kind stay separate steps (each gets its own alarm and countdown).

### Adding, moving and deleting

- **Add timed**, **Add rest** and **Add reps** (shown as "+ Timed", "+ Rest", "+ Reps") add a step at the end, open it (closing the others) and put the cursor in its name box.
- A step can be moved up or down one place with buttons, or dragged by its handle. The first step can't move up; the last can't move down.
- **Deleting** an empty step (no name, no time or reps) happens at once. A step with a name, time or reps asks first: "This will remove Step 2, Squats, set to 00:45." Cancel keeps it.

### Collapsing

- Each step can be **open** (name box and wheels) or **collapsed** to one line: its name (or kind) and time, e.g. "Squats 00:45" or "Push-ups 20 reps".
- **Expand all / Collapse all** opens or closes every step at once.
- A step opens as it's added. A saved timer opens with every step collapsed, so the whole workout is in view.

### Picking numbers

- Times, reps, weights and rounds are picked on **wheels** like iPhone pickers: swipe, scroll or drag, tap a number, or type one. Whatever sits in the middle is selected.
- The rounds wheel ends with **∞** after 30. Next to it, an **Until stopped** switch turns the wheel to ∞; turning it off goes back to the number of rounds picked before.

### Weights (BLD-7)

- A rep step has a **Weight** wheel beside its Reps wheel, labelled with the unit chosen in settings: "Weight (kg)" or "Weight (lb)".
- It starts at **–** (none, read out as "none"), for bodyweight moves, which then show just "20 reps".
- It goes up in steps of **0.5**: to 300 kg, or 660 lb. Typing a number works, with a decimal point (or comma) for halves, e.g. "62.5".
- A collapsed rep step shows the weight with the reps: "10 reps @ 60 kg". A step with only a weight still asks before it's deleted.
- Weights are **saved in kg** whatever unit is shown (see [data](data.md)), and shown to the nearest 0.5 in the chosen unit. Editing a timer without moving a weight's wheel keeps the weight exactly as saved, so rounding for display never changes it.

### Saving

- The button says **Start timer** for a new timer and **Save & start timer** when editing. It saves the timer to the library, starts it, and opens the timer page. There's no save without starting.
- Saving a new timer gives it the next id (one more than the highest saved).
- Editing replaces the saved timer, keeping its id. If it's been deleted meanwhile, it's saved as a new one.

## Acceptance criteria

- Given a new timer, then it has no steps and 1 round, and can't be started.
- Given every step is 0:00, when I try to start, then it won't, and says it needs a timed step or some reps.
- Given timed 0:45 and rest 0:00, when I start, then the saved timer has just the timed step.
- Given a timer with only rep steps, when I start, then it starts (reps count as work).
- Given 20 steps, then the add buttons are disabled, with the reason shown.
- Given one step, when I delete it, then there are none, the hint shows, and focus goes to "Add timed".
- Given a step named "Squats" at 0:45, when I delete it, then I'm asked first, naming it and its time.
- Given steps A, B, C, when I move C up, then the order is A, C, B, and C keeps its name and time.
- Given the Until stopped switch is turned on after picking 5 rounds, when it's turned off, then rounds go back to 5.
- Given I edit a saved timer, then it opens with its steps collapsed, and saving updates it rather than adding another.
- Given a rep step of 10 reps at 22.5 kg, when I start, then it's saved with weight 22.5; given one left at –, then it's saved with no weight.
- Given weights in lb, when I pick 135, then it's saved as 61.235 kg, and shows as 135 lb.
- Given a step saved at 20.412 kg (45 lb), when I edit only the title, then the weight stays 20.412.

## Platform notes

- **Web:** the form is `TimerSetupComponent` (`src/app/timer-setup/`), at `/setup`, or `/setup?editId=<id>` to edit. The wheels are `WheelPickerComponent`. Rules for what counts as a valid timer are in `src/app/models/timer.ts`.
- **iOS:** the wheels map directly onto `Picker` with `.wheel` style. Drag to reorder maps onto `List` with `onMove`; swipe to delete is the iOS habit, but keep the "ask first if it has something in it" rule.
