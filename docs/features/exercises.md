# Exercises

Planned (see [direction](../direction.md)). Rules are a first draft and get firmed up, with acceptance criteria, when this is built.

## Stories

- **EXR-1** As a user I want exercises to be things in their own right, so "Squats" in two workouts is the same exercise and its history stays together.
- **EXR-2** As a user I want to pick an exercise when adding a step, from the built-in list or my own, or make a new one by typing its name.
- **EXR-3** As a user I want to rename my own exercise once and have it change everywhere, history included.
- **EXR-4** As a user I want my existing workouts and history to carry over into exercises without doing anything.
- **EXR-5** As a user I want to see "Workouts" (not "Timers") throughout the app.
- **EXR-6** As a user I want a built-in list of common exercises to browse and search, so I don't have to type them all in.
- **EXR-7** As a user I want to see how to do an exercise: a short description and the steps.
- **EXR-8** As a user I want to see which muscles an exercise works, shaded on a body map.
- **EXR-9** As a user I want to make my own exercise, with its own description and the muscles it works.

## Rules (draft)

### What an exercise is

- An exercise has:
    - an **id** and a **name**
    - how it's **measured**: reps (with an optional weight) or timed
    - **main muscles** and **supporting muscles** (either may be empty)
    - optional: other names (e.g. "Press-ups" for "Push-ups"), equipment, a short description, and how-to steps
- Rest isn't an exercise.
- There are two kinds:
    - **Built-in** (EXR-6): shipped with the app. Their names and details are fixed, but each can be **hidden** from the picker.
    - **Your own** (EXR-9): made by you, editable, and saved and synced as your data. Only these can be renamed (EXR-3) or deleted.
- A step, and a logged set, point to an exercise by id, whichever kind it is. A logged set also keeps the name it had when it ran, as the history keeps a workout's title.

### The built-in list (EXR-6, EXR-7)

- A curated list of about **60–100 common exercises**, not an exhaustive database. Every one has muscles, equipment and a description; how-to steps where they help.
- Built-in ids are fixed text that never changes (e.g. `builtin:back-squat`), so history keeps pointing to them across app updates. An exercise taken out of the list stays readable by its id for history's sake.
- The list is part of the app, not the user's data: it updates with the app and isn't synced or exported.
- Searchable by name and other names, and can be filtered by muscle and equipment.

### The body map (EXR-8)

- One front and back body diagram, drawn as shapes, one per muscle group. It isn't a picture per exercise: the app shades it from the exercise's muscles, **strong for main, light for supporting**.
- Muscle groups (draft): chest, front shoulders, side shoulders, rear shoulders, biceps, triceps, forearms, abs, obliques, upper back, lats, lower back, glutes, quads, hamstrings, adductors, calves.
- Its shades are colour tokens with a contrast check like the others, and it works in light and dark.
- Screen readers hear it as text, e.g. "Works mainly quads and glutes; also hamstrings and lower back". The same words are shown under it.

### Your own exercises (EXR-2, EXR-9)

- Typing a name in the picker that matches no exercise offers "**Make 'Zercher squat'**". It asks only how it's measured; muscles and a description can be added later.
- Names are unique among what you can see, ignoring case and spaces: typing "squats " finds "Squats", whether that's built-in or your own. A built-in exercise's other names count as a match too.
- Muscles are picked by tapping the body map or from a list, as main or supporting.
- Deleting one of your own exercises that a workout uses isn't allowed; one with only history can be hidden.

### Carrying over (EXR-4)

On first load, each distinct step name (trimmed, ignoring case):

1. **Matches a built-in exercise** by name or other name → linked to it.
2. **Otherwise** → becomes one of your own exercises, with no muscles yet.

Past logged sets are linked the same way. Unnamed steps stay unnamed and aren't tracked as an exercise.

## Open questions

- Should a step be allowed with no exercise (an unnamed "Reps" step), or should every work step need one?
- Should a weighted exercise remember its own unit, or always follow the setting?
- Where the built-in list and body diagram come from:
    - write our own descriptions, or adapt an openly licensed set such as free-exercise-db (licence to check)
    - draw the body diagram, or use an openly licensed one
- Should a built-in exercise be copyable into your own, to change its details?
