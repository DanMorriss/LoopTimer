# Exercises

Partly built: exercises are in the data (#86): the built-in list, your own exercises and notes, steps and sets linked to an exercise by name, and existing data carried over (EXR-4). The body map is built too. Still to come: the picker in Create, renaming, notes and hiding in the app, and the exercise pages. Rules not yet built are a first draft (see [direction](../direction.md)).

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
- **EXR-10** As a user I want to add my own note to any exercise, built-in ones included (e.g. "Pause at the bottom").

## Rules (draft)

### What an exercise is

- An exercise has:
    - an **id** and a **name**
    - how it's **measured**: reps (with an optional weight) or timed
    - **main muscles** and **supporting muscles** (either may be empty)
    - optional: other names (e.g. "Press-ups" for "Push-ups"), equipment, a one-line description, how-to steps, and tips
- Rest isn't an exercise.
- A step **doesn't need an exercise**: an unnamed timed or rep step is still allowed, as now. It just isn't tracked (no history or progress of its own).
- An exercise has **no weight unit of its own**: weights always show in the unit chosen in settings (SET-4).
- There are two kinds:
    - **Built-in** (EXR-6): shipped with the app. Their names and details are fixed, but each can be **hidden** from the picker.
    - **Your own** (EXR-9): made by you, editable, and saved and synced as your data. Only these can be renamed (EXR-3) or deleted.
- A step, and a logged set, point to an exercise by id, whichever kind it is. A logged set also keeps the name it had when it ran, as the history keeps a workout's title.

### The built-in list (EXR-6, EXR-7)

- A curated list of about **60–100 common exercises**, not an exhaustive database. Every one has muscles, equipment and a description; how-to steps and tips where they help.
- **Written in our own words**, in the app's voice: a one-line description of what it is and why, 3–5 short how-to steps, and a tip or two. Plain and short enough to read between sets.
- [free-exercise-db](https://github.com/yuhonas/free-exercise-db) (public domain, Unlicense) is a **reference only**: for which exercises to include, their equipment and their muscles, each checked by hand (it lists glutes as only supporting in a back squat, for one). Its text isn't copied, and its photos aren't used: where they came from isn't stated.
- Built-in ids are fixed text that never changes (e.g. `builtin:back-squat`), so history keeps pointing to them across app updates. An exercise taken out of the list stays readable by its id for history's sake.
- The list is part of the app, not the user's data: it updates with the app and isn't synced or exported.
- Searchable by name and other names, and can be filtered by muscle and equipment.
- **Equipment** lists everything an exercise needs, all of it, so the list can be filtered by **what you have**: an exercise shows if you have every piece it lists. Where any one of a few things will do, it's a choice (a goblet squat needs a dumbbell _or_ a kettlebell). "None" means nothing at all. Plates and a floor are taken for granted.
- The equipment: barbell, dumbbells, kettlebell, bench, rack, pull-up bar, parallel bars, cable, machine (a dedicated gym machine, e.g. a leg press), band, step (a box, step or stair), none.

### The body map (EXR-8)

Mocked up in the [exercise page options](https://claude.ai/artifact/3SiP96YThwyL5D4fJAdSdW) canvas: "A + C, in our own words" is the chosen design.

The component is built (`BodyMapComponent`); it goes on the exercise pages when they're built.

- **An anatomical figure, front and back side by side**, captioned "Front" and "Back", made of muscle-shaped pieces. It isn't a picture per exercise: the app shades it from the exercise's muscles, **strongest for main, softer for supporting**, and unworked muscles stay grey. Head, hair, hands, feet, knees and ankles are drawn but never shaded.
- The shapes come from [react-native-body-highlighter](https://github.com/HichamELBSI/react-native-body-highlighter) (MIT; its licence is kept beside them), drawn as our own Angular component rather than using the React package.
- **Under the figure, the muscles as labels**: "Main" (e.g. Quads, Glutes) and "Supporting" as chips in the same two shades. They're the figure's key, and its text: the figure itself is hidden from screen readers, which read the labels. A muscle in both counts as main. With none at all, it says "No muscles listed."
- Muscle groups follow the diagram's shapes: chest, shoulders, biceps, triceps, forearms, abs, obliques, traps, upper back, lower back, glutes, abductors, adductors, quads, hamstrings, calves, shins, neck. (The diagram can't show front, side and rear shoulders, or lats, apart, so they aren't separate groups.)
- **Abductors have no shape** on either figure, so they're listed but not shaded.
- Its shades are colour tokens with a contrast check like the others, in both themes: each label's text is at least 4.5:1 on its shade; main stands out 3:1 from unworked and from the page; and the three shades are at least 2:1 apart in lightness, not just hue (the labels carry the meaning, so the figure needn't be 3:1 throughout). In the dark theme main is the brightest; in light, the darkest.
- **Male or female figure**, chosen in settings (SET-5). The diagram has both, with the same muscle groups, so the choice changes only the drawing. Every side is drawn in the same 1:2 box, so front and back match in size whatever the drawing's own canvas.

### The exercise page (EXR-7, EXR-8)

Top to bottom: back to Exercises; the name; "Also called: …"; equipment and how it's measured as chips; the one-line description; **Muscles worked** (the figure and its labels); **How to do it** (numbered steps); **Tips**. Progress (PRG-4) goes below these later.

### Your own exercises (EXR-2, EXR-9)

- Typing a name in the picker that matches no exercise offers "**Make 'Zercher squat'**". It asks only how it's measured; muscles and a description can be added later.
- Names are unique among what you can see, ignoring case and spaces: typing "squats " finds "Squats", whether that's built-in or your own. A built-in exercise's other names count as a match too.
- Muscles are picked by tapping the body map or from a list, as main or supporting.
- Deleting one of your own exercises that a workout uses isn't allowed; one with only history can be hidden.

### Carrying over (EXR-4)

On first load, each distinct step name (trimmed, ignoring case, and ignoring a plural "s", so "Squats" and "Push-ups" match "Squat" and "Push-up"):

1. **Matches a built-in exercise** by name or other name → linked to it. "Squat" is one of Back squat's other names, so a plain "Squats" step becomes a back squat; picking another exercise for the step changes it.
2. **Otherwise** → becomes one of your own exercises, with no muscles yet.

Past logged sets are linked the same way. Unnamed steps stay unnamed and aren't tracked as an exercise.

### Your notes on an exercise (EXR-10)

- **Any exercise**, built-in or your own, can have a note of your own, e.g. "Pause at the bottom" or "Seat on hole 4". It's how you make a built-in exercise your own without changing it: there's no copying a built-in exercise into your own, so its history stays in one place.
- The note shows on the exercise page under the description, marked as yours, and with the rep step mid-workout.
- Up to 200 characters, trimmed; saving an empty note removes it. Notes are your data: saved, exported and synced.
- A built-in exercise keeps its note across app updates, even if its own text changes.

## Acceptance criteria

- Given a back squat (main quads and glutes; supporting hamstrings, adductors and lower back), then the quads and glutes are shaded strongest, the others softer, and the labels read "Main: Quads, Glutes" and "Supporting: Hamstrings, Adductors, Lower back".
- Given the female figure chosen in settings, then the body map draws the female figure.
- Given an exercise with no muscles, then the body map says "No muscles listed."
- Given an exercise that works the abductors, then they're listed, though not shaded.

## Platform notes

- **Web:** the body map is `BodyMapComponent` (`src/app/shared/components/body-map/`). Its shapes, `body-shapes.ts`, are generated by `node tools/build-body-shapes.mjs` from a pinned commit of react-native-body-highlighter; don't edit them by hand. The built-in exercises are `src/app/models/built-in-exercises.ts`, written as in [writing-exercises](../writing-exercises.md).
- **iOS:** the same paths work as SwiftUI `Path`s from SVG data, or through react-native-body-highlighter itself in a React Native app.
