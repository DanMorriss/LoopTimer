# Exercises

Planned (see [direction](../direction.md)). Rules are a first draft and get firmed up, with acceptance criteria, when this is built.

## Stories

- **EXR-1** As a user I want exercises to be things in their own right, so "Squats" in two workouts is the same exercise and its history stays together.
- **EXR-2** As a user I want to pick an exercise I've used before when adding a step, or make a new one by typing its name.
- **EXR-3** As a user I want to rename an exercise once and have it change everywhere, history included.
- **EXR-4** As a user I want my existing workouts and history to carry over into exercises without doing anything.
- **EXR-5** As a user I want to see "Workouts" (not "Timers") throughout the app.

## Rules (draft)

- An exercise has an id, a name, and how it's measured: **reps** (with an optional weight) or **timed**. Rest isn't an exercise.
- Names are unique ignoring case and surrounding spaces: typing "squats " picks the existing "Squats".
- A step points to its exercise by id. A logged set points to its exercise by id and keeps the name it had when it ran (as the history keeps a workout's title).
- **Carrying over (EXR-4):** on first load, each distinct step name (trimmed, ignoring case) becomes an exercise, and past logged sets are linked to it by name. Unnamed steps stay unnamed and aren't tracked as an exercise.
- Deleting an exercise used by a workout isn't allowed; one with only history can be hidden from the picker.
- Exercise ids, like all new ids, can't clash across devices (see [backup-and-sync](backup-and-sync.md)).

## Open questions

- Should a step be allowed with no exercise (an unnamed "Reps" step), or should every work step need one?
- Should a weighted exercise remember its own unit, or always follow the setting?
