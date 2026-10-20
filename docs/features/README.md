# LoopTimer features

What the app does, one file per feature, written so it could be rebuilt on another platform (an iPhone app, say) without reading the Angular code.

Each file has the same sections:

- **Stories**: who wants what, and why, each with a stable ID (e.g. `ALM-2`) to refer to from TODO.md, PRs and issues.
- **Rules**: exact behaviour, limits and wording. These are what a port gets subtly wrong.
- **Acceptance criteria**: Given / When / Then checks. Most are taken from the web app's tests.
- **Platform notes**: how the web app does it and what an iPhone app would need. Everything above this section is meant to hold on any platform.

## Stories

Status: ✅ done, ◐ partly, — not started. The iOS column fills in as a port happens.

| ID     | Story                                                                  | Web | iOS | File                                          |
| ------ | ---------------------------------------------------------------------- | --- | --- | --------------------------------------------- |
| BLD-1  | Build a timer from work and rest steps that repeats a number of rounds | ✅  | —   | [build-a-timer](build-a-timer.md)             |
| BLD-2  | Run a timer until I stop it                                            | ✅  | —   | [build-a-timer](build-a-timer.md)             |
| BLD-3  | Name each step                                                         | ✅  | —   | [build-a-timer](build-a-timer.md)             |
| BLD-4  | Count reps instead of a time                                           | ✅  | —   | [build-a-timer](build-a-timer.md)             |
| BLD-5  | Reorder and delete steps                                               | ✅  | —   | [build-a-timer](build-a-timer.md)             |
| BLD-6  | Edit a saved timer                                                     | ✅  | —   | [build-a-timer](build-a-timer.md)             |
| RUN-1  | See where I am in the workout at a glance                              | ✅  | —   | [run-a-timer](run-a-timer.md)                 |
| RUN-2  | See what's next                                                        | ✅  | —   | [run-a-timer](run-a-timer.md)                 |
| RUN-3  | Tap Done when a set of reps is finished                                | ✅  | —   | [run-a-timer](run-a-timer.md)                 |
| RUN-4  | Know when I've finished, and note how it went                          | ✅  | —   | [run-a-timer](run-a-timer.md)                 |
| RUN-5  | Keep accurate time whatever the device does                            | ✅  | —   | [run-a-timer](run-a-timer.md)                 |
| CTL-1  | Pause and resume                                                       | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| CTL-2  | Stop a workout early                                                   | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| CTL-3  | Pick up where I was if the app is closed or reloaded                   | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| CTL-4  | Keep the workout going while I look at other pages                     | ✅  | —   | [pause-and-stop](pause-and-stop.md)           |
| ALM-1  | Hear each step start, with a different sound for each kind             | ✅  | —   | [alarms](alarms.md)                           |
| ALM-2  | Hear alarms with my phone locked, in my pocket                         | ◐   | —   | [alarms](alarms.md)                           |
| ALM-3  | Feel each step start (vibration)                                       | ◐   | —   | [alarms](alarms.md)                           |
| ALM-4  | Choose the sound for each step                                         | —   | —   | [alarms](alarms.md)                           |
| LIB-1  | See my saved timers and start one                                      | ✅  | —   | [library](library.md)                         |
| LIB-2  | Edit or delete a saved timer                                           | ✅  | —   | [library](library.md)                         |
| HIS-1  | See the workouts I've done, by day                                     | ✅  | —   | [history](history.md)                         |
| HIS-2  | See how much I've done this week                                       | ✅  | —   | [history](history.md)                         |
| HIS-3  | Add a note to a workout                                                | ✅  | —   | [history](history.md)                         |
| HIS-4  | Delete a workout from the history, with Undo                           | ✅  | —   | [history](history.md)                         |
| SET-1  | Choose a dark, light or system theme                                   | ✅  | —   | [settings](settings.md)                       |
| SET-2  | Turn sound, vibration and keeping the screen on, on or off             | ✅  | —   | [settings](settings.md)                       |
| SET-3  | Hear each alarm sound before a workout                                 | ✅  | —   | [settings](settings.md)                       |
| NAV-1  | Get to any page from anywhere, and back to a workout in progress       | ✅  | —   | [home-and-navigation](home-and-navigation.md) |
| A11Y-1 | Use every feature with a screen reader, keyboard or reduced motion     | ✅  | —   | [accessibility](accessibility.md)             |

What's saved on the device, and in what shape, is in [data](data.md).

### The original stories

The README's first five user stories map onto these: 1 → BLD-1, 2 → BLD-2, 3 → BLD-3 and ALM-1 (ALM-4 to come), 4 → ALM-2, 5 → LIB-1.

## Keeping these up to date

A change in behaviour updates its file here in the same PR: the rule, an acceptance criterion if there's a new test for it, and the status above. A new feature gets a new story ID; IDs are never reused or renumbered.
