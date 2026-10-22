# Accessibility

## Stories

- **A11Y-1** As a user of a screen reader, keyboard, or reduced motion, I want to use every feature as well as anyone else.

## Rules

### Screen readers

- As each step starts, the workout announces it politely (it doesn't interrupt), and **not every second**:
    - "Timed, round 1 of 3" at the start of a round (an unnamed timed step is called "Timed"); "Rest" mid-round.
    - With several steps: the name and number, e.g. "Squats, step 1 of 3, round 2 of 5".
    - Rep steps add the count, and the weight if there is one: "Push-ups, 20 reps", "Squats, 10 reps at 60 kg".
    - "last round" in place of the count in the final round (but "round 1 of 1" for a one-round workout); "round 4" with no total when it runs until stopped.
    - "Paused" when paused; "Finished" at the end.
- ∞ is read as "until stopped". The round dots are hidden (the announcements say the same).
- The ring reports progress through the step as a percentage, or "Waiting for Done" on a rep step.
- Icon buttons have names (Pause, Resume, Done, Options for …). Visible captions repeat them, hidden from screen readers.
- Wheels are spin buttons named by their step, e.g. "Step 2, rest, Seconds", reporting their value and range.
- Adding, moving or deleting a step is announced, e.g. "Moved squats to step 3".

### Keyboard and focus

- Everything works with a keyboard. Space pauses, resumes, and presses Done; Escape resumes. Focus moves to Resume on pause and back on resume (see [pause-and-stop](pause-and-stop.md)).
- Wheels: arrows move one, Page Up/Down move five, Home/End jump to the ends, and typing digits picks a number.
- Steps can be reordered with **Move up/down** buttons as well as by dragging (the drag handle is hidden from screen readers).
- Focus is always put somewhere sensible: into a dialog (starting on Cancel), back to the button that opened a menu or dialog, onto a new step's name box, onto Undo after deleting from the history, onto the step that takes a deleted one's place.
- Escape closes menus, dialogs and open wheels.

### Motion and colour

- With **reduced motion**: looping animations stop, the logo shows drawn at once, wheels jump rather than glide, and themes change without a fade.
- Every page meets **WCAG 2.1 AA** in both themes: text at least 4.5:1 against what it sits on, controls and the ring at least 3:1. Nothing relies on colour alone (e.g. switches say On or Off).

## Acceptance criteria

- Given a run of 3 rounds, then a screen reader hears "Timed, round 1 of 3", "Rest", "Timed, round 2 of 3", …, "Finished", and nothing between.
- Given a run paused, then it hears "Paused", and on resume, which phase it's back in.
- Given the delete dialog opens, then focus starts on Cancel, and Escape closes it without deleting.
- Given reduced motion is on, then nothing loops.
- Given any page in either theme, then an automated accessibility check (axe) finds nothing.

## Platform notes

- **Web:** checked by axe over every page and state (`src/app/a11y.spec.ts`) and colour contrast tests (`src/app/shared/theme/theme-contrast.spec.ts`).
- **iOS:** VoiceOver announcements via `AccessibilityNotification.Announcement`; spin buttons map onto adjustable elements (`accessibilityAdjustableAction`); honour `accessibilityReduceMotion` and Dynamic Type. Xcode's Accessibility Inspector audit plays the part of axe.
