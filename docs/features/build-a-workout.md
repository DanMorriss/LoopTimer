# Build a workout

## Stories

- **BLD-1** As a user I want to build a workout from work and rest steps that repeats a number of rounds, so it tells me when to start and stop each exercise.
- **BLD-2** As a user I want a workout that runs until I stop it, for when I don't know how many rounds I'll do.
- **BLD-3** As a user I want to name each step (e.g. "Squats"), so I know what to do next without remembering the order.
- **BLD-4** As a user I want a step that's a number of reps instead of a time (e.g. 20 push-ups), and takes as long as I take.
- **BLD-5** As a user I want to add, reorder and delete steps, to build a circuit.
- **BLD-6** As a user I want to edit a saved workout, so I don't have to build it again to change it.
- **BLD-7** As a user I want to add a weight to a rep step (e.g. 10 squats at 60 kg), so I know what to lift.
- **BLD-8** As a user I want a workout with a time limit (e.g. 20 minutes) in which I do as many rounds as I can, so I can work to the clock rather than to a count.

## Rules

### A workout

- A workout has a **title** (optional), a list of **steps** that make one round, and a number of **rounds** or a **time limit**.
- Rounds: **1 to 30**, or **∞** (until stopped). A new workout starts at 1.
- Or a time limit: as many rounds as fit in it (BLD-8; running it is RUN-8).
- Steps run in order to make one round; then the round repeats.
- **Rest at the end of the last round is skipped**: every rest step after the last timed or rep step of the round is left out of the final round, since the workout is over. Rest at the start or middle of a round is kept.
- A workout must have **some work**: at least one timed step with time, or one rep step with reps. Otherwise it can't be started, and once something has been put in a step (a name, a time, reps or a weight) the form says "Workout needs a timed step or some reps".

### Steps

- Three kinds:
    - **Timed**: a time, 0:01 to 99:59 (minutes 0–99, seconds 0–59). Called "Work" until October 2026; saved data still says `work`.
    - **Rest**: a time, the same range.
    - **Reps**: a count, 1 to 100, and an optional **weight**. No countdown; the workout waits until Done (see [run-a-workout](run-a-workout.md)).
- Each step has an optional **name**, up to 40 characters, trimmed when saved. The name box suggests "e.g. Squats" (timed), "e.g. Catch your breath" (rest) or "e.g. Push-ups" (reps).
- A timed or rep step's name box is labelled **Exercise (optional)** and finds exercises as you type, or makes a new one (EXR-2, see [exercises](exercises.md#picking-an-exercise-exr-2)). A rest step's is a plain name box.
- **Up to 20 steps.** At 20, the **+ Step** button is disabled and the page says "That's the most steps a workout can have (20)."
- A new workout starts with **one open rep step** at 0 reps. Every step can be deleted, which shows the hint "Add a step to start."
- An **(i) button** beside the Steps heading shows the tip "Each round runs these in order. Steps left at 00:00 or 0 reps are skipped." on hover, focus or a tap, and hides it on Escape, when the pointer or focus leaves, or on a click elsewhere.
- Steps left at **0:00 or 0 reps are left out** when the workout is saved.
- Back-to-back steps of the same kind stay separate steps (each gets its own alarm and countdown).

### Adding, moving and deleting

- **Add step** (shown as "+ Step") adds a **rep step** at the end, opens it (closing the others) and puts the cursor in its name box.
- **Changing kind:** a step's kind pill (e.g. "REPS") opens a menu of Reps, Timed and Rest, with the current one ticked. Picking one changes the step, open or collapsed, and focus goes back to the pill. The step keeps its name, exercise and numbers, so changing back finds them; only those its kind uses are saved. Escape, a click elsewhere or tabbing away closes the menu.
- A step can be moved up or down one place with buttons, or dragged by its handle. The first step can't move up; the last can't move down. A dragged step shows as a compact card held where the handle was grabbed, so it doesn't jump under the pointer, and **lifted** off the list as a held library card is: a little bigger, with a deeper shadow (it grows into that as it's picked up, but not with reduced motion).
- **Deleting** a step happens at once. For one with a name, time or reps, the **Undo bar** says "Deleted Step 2, Squats, 00:45" with **Undo**, which puts it back where it was (see [home-and-navigation](home-and-navigation.md#undo)); an empty one (no name, no time or reps) has nothing to undo.

### Collapsing

- Each step can be **open** (name box and wheels) or **collapsed** to one line: its name (or kind) and time, e.g. "Squats 00:45" or "Push-ups 20 reps".
- **Expand all / Collapse all** opens or closes every step at once.
- Opening or closing, the steps and everything under them **slide** to their new places on a spring with no bounce, and an opening step's name box and wheels fade in. With reduced motion they move at once, and the fade stays.
- A step opens as it's added. A saved workout opens with every step collapsed, so the whole workout is in view.

### Picking numbers

- Times, reps, weights and rounds are picked on **wheels** like iPhone pickers: swipe, scroll or drag, tap a number, or type one. Whatever sits in the middle is selected.
- Dragged with a mouse, a wheel follows once the pointer has moved 10px. Flicked, it glides on as far as the flick would carry it and settles on that row; pulled past either end, the numbers stretch and spring back. (Touch already scrolls this way.)
- The rounds wheel ends with **∞** after 30. Next to it, an **Until stopped** switch turns the wheel to ∞; turning it off goes back to the number of rounds picked before. The switch shrinks a little as it's pressed.

### Time limit (BLD-8)

- Under **Repeat**, a choice of **Rounds** or **Time limit**, as a row of two (radio buttons for keyboards and screen readers). Rounds to begin with, and for a workout saved with rounds.
- **Time limit** swaps the rounds wheel and the Until stopped switch for **Minutes** and **Seconds** wheels, 00:00 to 99:59, at **20:00** to begin with, and the hint "As many rounds as you can before time's up."
- 00:00 won't start: "Time limit needs to be longer than 00:00".
- Going back to Rounds keeps the time picked, and the other way round, until the workout's saved: it saves only the one picked.
- Saved, a time limit is `timeLimitSeconds` with rounds until stopped (see [data](data.md)). Editing a workout with one opens on Time limit, with its time.

### Weights (BLD-7)

- A rep step has a **Weight** wheel beside its Reps wheel, labelled with the unit chosen in Account → Profile: "Weight (kg)" or "Weight (lb)".
- It starts at **–** (none, read out as "none"), for bodyweight moves, which then show just "20 reps".
- It goes up in steps of **0.5**: to 300 kg, or 660 lb. Typing a number works, with a decimal point (or comma) for halves, e.g. "62.5".
- A collapsed rep step shows the weight with the reps: "10 reps @ 60 kg". A step with only a weight still asks before it's deleted.
- Weights are **saved in kg** whatever unit is shown (see [data](data.md)), and shown to the nearest 0.5 in the chosen unit. Editing a workout without moving a weight's wheel keeps the weight exactly as saved, so rounding for display never changes it.

### Saving

- The button says **Start workout** for a new workout and **Save & start workout** when editing. It saves the workout to the library, starts it, and opens the workout page. There's no save without starting.
- Saving a new workout gives it the next id (one more than the highest saved).
- Editing replaces the saved workout, keeping its id. If it's been deleted meanwhile, it's saved as a new one.

## Acceptance criteria

- Given a new workout, then it has one open rep step at 0 reps and 1 round, shows no error, and can't be started.
- Given a rep step, when I pick Timed from its kind pill, then it's a timed step with Minutes and Seconds wheels, and focus is on the pill.
- Given a timed step "Squats" at 0:30, when I change it to Reps and back, then it's "Squats" at 0:30 again; saved as Reps with 10 reps, it's saved with just the reps.
- Given every step is 0:00, when I try to start, then it won't, and says it needs a timed step or some reps.
- Given timed 0:45 and rest 0:00, when I start, then the saved workout has just the timed step.
- Given a workout with only rep steps, when I start, then it starts (reps count as work).
- Given 20 steps, then "+ Step" is disabled, with the reason shown.
- Given one step, when I delete it, then there are none, the hint shows, and focus goes to "Add step".
- Given a step named "Squats" at 0:45, when I delete it, then it goes at once and "Deleted Step 1, Squats, 00:45" offers Undo; when I press Undo, then it's back in its place.
- Given steps A, B, C, when I move C up, then the order is A, C, B, and C keeps its name and time.
- Given the Until stopped switch is turned on after picking 5 rounds, when it's turned off, then rounds go back to 5.
- Given I edit a saved workout, then it opens with its steps collapsed, and saving updates it rather than adding another.
- Given Time limit is picked, then the wheels show 20:00; when I pick 12:30 and start, then the workout is saved with a time limit of 750 seconds and rounds until stopped.
- Given Time limit at 00:00, then it won't start, and says the time limit needs to be longer than 00:00.
- Given 5 rounds, when I pick Time limit and then Rounds again and start, then it's saved with 5 rounds and no time limit.
- Given a saved workout with a time limit of 20:30, when I edit it, then Time limit is picked, at 20:30.
- Given a rep step of 10 reps at 22.5 kg, when I start, then it's saved with weight 22.5; given one left at –, then it's saved with no weight.
- Given weights in lb, when I pick 135, then it's saved as 61.235 kg, and shows as 135 lb.
- Given a step saved at 20.412 kg (45 lb), when I edit only the title, then the weight stays 20.412.

## Platform notes

- **Web:** the form is `WorkoutSetupComponent` (`src/app/workout-setup/`), at `/setup`, or `/setup?editId=<id>` to edit. The wheels are `WheelPickerComponent`. Opening and closing steps slide with `captureLayout()` (`src/app/shared/layout-change.ts`), moving only transforms rather than animating heights. Rounds or Time limit is the shared segmented control (`src/styles/_segmented.scss`, also settings' theme). Rules for what counts as a valid workout are in `src/app/models/workout.ts`.
- **iOS:** the kind pill maps onto a `Menu` (or a `Picker` with `.menu` style) labelled with the kind; the Steps tip onto a `.popover` or `.help()` on an `info.circle` button. The wheels map directly onto `Picker` with `.wheel` style. Drag to reorder maps onto `List` with `onMove`; swipe to delete is the iOS habit, but keep the "ask first if it has something in it" rule.
