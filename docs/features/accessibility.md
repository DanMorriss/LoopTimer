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
- Adding, moving, deleting or changing the kind of a step is announced, e.g. "Moved squats to step 3", "Step 2 is now rest".
- A step's kind pill is a button named with its kind and step, e.g. "Reps, change type of step 1", saying whether its menu is open; the menu marks the current kind as pressed.
- The (i) button by setup's Steps heading is described by its tip (`role="tooltip"`), so screen readers read the tip without opening it.

### Keyboard and focus

- Everything works with a keyboard. Space pauses, resumes, and presses Done; Escape resumes. Focus moves to Resume on pause and back on resume (see [pause-and-stop](pause-and-stop.md)).
- Wheels: arrows move one, Page Up/Down move five, Home/End jump to the ends, and typing digits picks a number.
- Steps can be reordered with **Move up/down** buttons as well as by dragging (the drag handle is hidden from screen readers).
- Focus is always put somewhere sensible: into a dialog, back to the button that opened a menu or dialog, onto a library card (a button that starts its workout, with its summary read with it), onto a new step's name box, onto **Undo** after any delete (and back to what was put back on Undo, or the step that took a deleted one's place if the offer is closed).
- Escape closes menus, dialogs, tooltips and open wheels. Dialogs grow out of the button that opened them as the page dims and blurs behind, and shrink back into it as they close; menus grow out of their button and fold back into it. Taps reach the page as soon as one starts to close.

### Text

- Reading text is the **system's own face** (San Francisco on Apple devices), at 16px in `rem`, so it follows the browser's text size; headings are semibold. Audiowide, the app's display face, is only for page titles and the workout's big numbers, tracked in as it grows and left alone at smaller sizes.
- Small text (0.75rem and under, e.g. chart labels and chips' details) is spaced out a touch so it stays legible; sizes are in `rem` throughout, the chart's axis labels included.
- The countdown's digits each sit in a **cell of the same width**, so the time doesn't shift as it ticks; screen readers hear it as one piece of text, e.g. "00:41". Other ticking numbers (time left, the workout's bar, the wheels) use the system face's fixed-width digits.

### Motion and colour

- With **reduced motion**: looping animations stop (the "Next:" pulse too, leaving its coloured border, and the face's last-seconds pulse, leaving its tint), the logo shows drawn at once, wheels jump rather than glide, a new step or round crossfades rather than sliding, Pause and Resume swap rather than glide, the workout opens and closes without growing out of its bar, dialogs and menus fade without growing or shrinking, the summary appears and goes without rising or sinking, a mouse-flicked wheel lands at once, switches' knobs jump across, lists close up (or open out) at once rather than sliding, with a row put back or a step's content fading in, and themes change without a fade.
- **Pressing** a button shows at once, while the finger or mouse button is still down: buttons shrink a little, switches' knobs swell, and menu and list rows light up. Hover looks only show where there's a mouse or trackpad, so on a phone they don't stick after a tap.
- Controls drawn smaller than a fingertip (chips, the chart's range buttons, the ⓘ and step-kind buttons, a muscle's ✕) take presses **44px** across, without changing how they look.
- With **reduced transparency**, panels and cards are solid and the dimming behind dialogs is darker with no blur; with **more contrast**, panels and cards get a control's border. The bars along the bottom do both too.
- Every page meets **WCAG 2.1 AA** in both themes: text at least 4.5:1 against what it sits on, controls and the ring at least 3:1. Nothing relies on colour alone (e.g. switches say On or Off).

## Acceptance criteria

- Given a run of 3 rounds, then a screen reader hears "Timed, round 1 of 3", "Rest", "Timed, round 2 of 3", …, "Finished", and nothing between.
- Given a run paused, then it hears "Paused", and on resume, which phase it's back in.
- Given I delete something, then focus is on Undo, and Escape closes the offer without undoing.
- Given reduced motion is on, then nothing loops.
- Given any page in either theme, then an automated accessibility check (axe) finds nothing.

## Platform notes

- **Web:** checked by axe over every page and state (`src/app/a11y.spec.ts`) and colour contrast tests (`src/app/shared/theme/theme-contrast.spec.ts`).
- **iOS:** VoiceOver announcements via `AccessibilityNotification.Announcement`; spin buttons map onto adjustable elements (`accessibilityAdjustableAction`); honour `accessibilityReduceMotion` and Dynamic Type. Reading text is SF Pro with Dynamic Type text styles (`.body`, `.headline`); Audiowide stays for titles and the timer, with `.monospacedDigit()`-style cells for its countdown. Press feedback comes from a `ButtonStyle` reading `configuration.isPressed`; there's no hover to worry about on a phone. Xcode's Accessibility Inspector audit plays the part of axe.
