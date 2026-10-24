# Data

What the app saves, and in what shape. Everything is on the device; there's no account or server.

**Ready for sync:** every workout and history entry has an id that can't clash with another device's (random, not 1, 2, 3) and an `updatedAt`, the time it last changed in ms since 1970. Deleting one leaves a marker in `deleted`. Merging two copies (a backup now, another device later) goes by id: the most recent change to each record wins, and a deletion wins over changes made before it. See [backup-and-sync](backup-and-sync.md).

## Saved for good (`localStorage` on the web, the history in IndexedDB)

### `workouts`: the library

A JSON list of workouts:

```json
[
    {
        "id": "5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "title": "Circuit",
        "updatedAt": 1760952000000,
        "repeats": 5,
        "steps": [
            { "kind": "work", "seconds": 45, "name": "Squats" },
            { "kind": "rest", "seconds": 15, "name": "" },
            { "kind": "reps", "reps": 20, "name": "Push-ups" }
        ]
    }
]
```

- `id`: a random UUID, given when the workout is made and never changed.
- `updatedAt`: when it was made or last changed (edited, or its reps or weight changed mid-workout).
- `repeats`: 1–30, or **0 for until stopped**.
- `timeLimitSeconds` (optional): a time limit, 1–5999 (99:59), for as many rounds as fit in it (BLD-8). Only with `repeats` 0, so a copy of the app from before time limits runs it until stopped. Missing for none; one that's broken, or with `repeats` above 0, is dropped when loading, leaving the workout as it was set to repeat.
- `seconds`: 1–5999 (99:59). `reps`: 1–100. `name`: may be empty.
- `weight` (rep steps only, optional): in **kg whatever unit is shown**, to the gram, more than 0 and up to 300. Missing for none. A weight picked in lb is converted (1 lb = 0.45359237 kg), so 45 lb saves as 20.412 kg.
- `exerciseId` (work and rep steps, optional): the exercise the step is, e.g. `builtin:back-squat`, or one of your own. Set by picking an exercise in setup (EXR-2). When a workout is saved, a step keeps its exercise while that exercise is still there; any other named work step is linked by its name, as the conversion to version 3 does (below). Typing over a step's name in setup drops its link, so a renamed step follows its name. Missing for a rest or an unnamed step.
- A workout with no work (no timed step with time, and no rep step) isn't valid.
- **Older format:** workouts saved before steps existed (when they were timers of one work and one rest time) have `timerMinutes`, `timerSeconds`, `restMinutes`, `restSeconds` in place of `steps`. They're read as a timed step plus a rest step (left out if 0), and saved in the new format the next time anything changes.

### `history`: the history

In IndexedDB on the web: the `history` store of the `looptimer` database, one record per entry keyed by its `id`, with no limit on how many. Shown here as a list, as in a backup:

```json
[
    {
        "id": "1760952300000-5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "workoutId": "5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "title": "Circuit",
        "startedAt": 1760952300000,
        "endedAt": 1760953050000,
        "updatedAt": 1760953050000,
        "activeSeconds": 750,
        "roundsCompleted": 5,
        "totalRounds": 5,
        "outcome": "finished",
        "note": "felt strong",
        "sets": [
            { "round": 0, "step": 0, "name": "Squats", "reps": 10, "weight": 60 },
            {
                "round": 0,
                "step": 1,
                "name": "Plank",
                "seconds": 45,
                "exerciseId": "builtin:plank"
            },
            { "round": 1, "step": 0, "name": "Squats", "reps": 8, "weight": 62.5 },
            { "round": 1, "step": 1, "name": "Plank", "seconds": 45, "exerciseId": "builtin:plank" }
        ]
    }
]
```

- Times are ms since 1970 (UTC).
- `id` is `<startedAt>-<workoutId>`: unique per run, so the same run logged again replaces its entry, and the same run matches across copies.
- `updatedAt`: when it was last logged or its note changed.
- `totalRounds` is 0 for a workout that runs until stopped or to a time limit. `outcome` is `finished` or `stopped`; a time limit that ran out is `finished`.
- `timeLimitSeconds` (optional): the workout's time limit, when it had one. `stepsIntoRound` (optional): when the time limit ran out, how many steps of the round it ran out in were done, rests left out, so "7 rounds + 3" is `roundsCompleted` 7 and `stepsIntoRound` 3. Both are dropped when broken, and `stepsIntoRound` is missing for a run stopped before its time limit. `note` is missing when there isn't one (up to 120 characters).
- `sets` (missing when there were none), in order: one per Done on a rep step, and one per timed work step of an exercise that ran to its end. `round` and `step` count from 0. A rep set has `reps`, at least 1, and `weight` in kg (missing for none); a timed set has `seconds` (1–5999, the step's length) and no `reps` or `weight`. Entries from before timed sets were logged have rep sets only. `exerciseId` is the exercise it was, from its step (missing for an unnamed step). A broken set is dropped when loading, keeping the rest of the entry.

**`history-pending` (`localStorage`):** each change to the history is kept here too until IndexedDB confirms it, as a JSON list of entries, since a write started as the page closes (logging a run left mid-way) may never finish. On the next load anything still here is saved to IndexedDB, the most recent change to each entry winning, and a deletion made after an entry's last change (in `deleted`) wins over it. If IndexedDB can't be used at all, the history stays here.

**Moving in:** until October 2026 the history was a JSON list in `localStorage` under `history`, at most 500 entries. On load it's moved into IndexedDB, the same way, and the key removed once it's saved there.

### `exercises`: your own exercises

A JSON list of the exercises you've made (EXR-9); the built-in ones come with the app and aren't saved. Each has the built-in ones' fields ([exercises](exercises.md)), most of them empty until you fill them in, plus an `id` (random) and `updatedAt`:

```json
[
    {
        "id": "71652dd3-bf96-4c6b-9ebd-8d9052e2ba0a",
        "updatedAt": 1761060000000,
        "name": "Wall sit hold",
        "otherNames": [],
        "equipment": [],
        "measuredBy": "timed",
        "mainMuscles": [],
        "supportingMuscles": [],
        "description": "",
        "steps": [],
        "tips": []
    }
]
```

- `measuredBy` is `reps` or `timed`. One needs an `id` (never starting `builtin:`), a `name` and a date; missing or broken lists read as empty, and unknown muscles are dropped.

### `exercise-notes`: your notes on exercises

A JSON list of `{ "id": "<exercise id>", "text": "Pause at the bottom", "updatedAt": … }`, one per exercise with a note (EXR-10), built-in or your own. `text` is up to 200 characters. Removing a note leaves a deletion.

### `hidden-exercises`: exercises hidden from the picker

A JSON list of `{ "id": "<exercise id>", "updatedAt": … }`, one per exercise hidden from the picker in Create, built-in or your own. Showing one again removes it and leaves a deletion.

### `deleted`

The last 5,000 workouts, history entries, exercises of your own, notes and hidden exercises deleted (shown again), oldest first, so a deletion reaches other copies and a run still going can't log itself back in (see [history](history.md)):

```json
[
    {
        "kind": "history",
        "id": "1760952300000-5f0c2a9e-8b1d-4c3a-9e2f-7a6b5c4d3e21",
        "deletedAt": 1760960000000
    }
]
```

`kind` is `workout`, `history`, `exercise`, `exercise-note` or `hidden-exercise` (whose `id`s are the exercise's). Undo in the history takes its marker away.

### `data-version`

Which shape the rest is in: `4`. Missing means 1, from before it was saved. On load, older data is converted once, a version at a time, before anything reads it. The step to version 4 only changes names, so it goes first, and the steps below are described with the names as they are now.

**1 → 2, ready for sync:**

- each workout's number id becomes a new random one, and it gets `updatedAt` (the time of the conversion)
- each history entry's `workoutId` becomes its workout's new id (or, for a workout since deleted, the old number as text), and it gets `updatedAt` (when it ended); its own `id` stays
- `history-deleted`, version 1's list of deleted history ids, becomes markers in `deleted`

`legacy-workout-ids` keeps each old number and its new id, so a workout in progress when the app updated still finds its workout.

**3 → 4, workouts, not timers (EXR-5):** what were called timers are called workouts, in the saved data too:

- `timers` moves to `workouts`, and `legacy-timer-ids` to `legacy-workout-ids`
- each history entry's `timerId` becomes `workoutId`
- a deletion of kind `timer` becomes kind `workout`

The run in progress in a tab moves too (`activeTimerId`, `activeTimerStartedAt` and `activeTimerPausedAt` become the `activeWorkout…` keys below). That's done whenever a tab loads rather than once, since each tab has its own.

**2 → 3, exercises (EXR-4):** each named work step in a workout, and each named set in the history, gets the `exerciseId` its name means: a built-in exercise where the name, or one of its other names, matches (ignoring case, spaces and a plural "s"), and otherwise a new exercise of your own, one per name, measured by reps for a rep step and by time for a timed one. Rest and unnamed steps aren't linked.

### `settings`

```json
{
    "theme": "dark",
    "sound": true,
    "vibration": true,
    "keepScreenOn": true,
    "weightUnit": "kg",
    "bodyFigure": "male",
    "myEquipment": ["barbell", "rack"],
    "onlyMyEquipment": false
}
```

`theme` is `dark`, `light` or `system`. `weightUnit` is `kg` or `lb`. `bodyFigure` is `male` or `female`. `myEquipment` is the equipment you have, picked on the Exercises page, in the order it's offered there (unknown pieces are dropped); `onlyMyEquipment` is its Only what I have switch.

## Saved for the run in progress (`sessionStorage` on the web, per tab)

| Key                      | What                                                                                                                               |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `activeWorkoutId`        | The workout being run.                                                                                                             |
| `activeRunStartedAt`     | When the run really began. Never moves; it dates the run and makes its history id.                                                 |
| `activeWorkoutStartedAt` | When the run began on the countdown's clock: moved on by every pause and every rep step, so elapsed time is simply now minus this. |
| `activeWorkoutPausedAt`  | When it was paused, if it is.                                                                                                      |
| `activeRepStepsDone`     | How many rep steps have been done, counting across rounds.                                                                         |
| `activeRepMs`            | Time spent on rep steps so far, which counts as time spent in the history.                                                         |
| `activeSets`             | The rep sets done so far. The timed ones are worked out from the clock.                                                            |

From these, everything on the workout page is worked out (see [run-a-workout](run-a-workout.md)).

## Backup file

**Export backup** in settings saves everything as one JSON file, e.g. `looptimer-2026-10-21.json`; **Import backup** reads one back (see [backup-and-sync](backup-and-sync.md) for how it merges):

```json
{
    "app": "LoopTimer",
    "version": 6,
    "exportedAt": 1761055200000,
    "workouts": [],
    "history": [],
    "exercises": [],
    "exerciseNotes": [],
    "hiddenExercises": [],
    "deleted": [],
    "settings": {
        "theme": "dark",
        "sound": true,
        "vibration": true,
        "keepScreenOn": true,
        "weightUnit": "kg",
        "bodyFigure": "male",
        "myEquipment": [],
        "onlyMyEquipment": false
    }
}
```

- `workouts`, `history`, `exercises`, `exerciseNotes` (as `exercise-notes`), `hiddenExercises` (as `hidden-exercises`), `deleted` and `settings` are in the same shapes as above; `exportedAt` is ms since 1970.
- `version` goes up whenever the file's shape changes. A file from an older version is converted when imported; one from a newer version is turned down.
- **Version 1** files (from before random ids) have number workout ids, no `updatedAt` and no `deleted`. They're converted as saved data is: their workouts get new random ids, so they're matched on what they are (title, steps and rounds) rather than by id.
- **Version 3 and older** files call workouts timers: a `timers` list in place of `workouts`, `timerId` in the history and the kind `timer` in `deleted`. They're renamed as they're read.
- **Version 5 and older** files have no time limits, so nothing needs converting.
- **Version 4 and older** files have no `hiddenExercises`, so nothing in them is hidden.
- **Version 2** files (from before exercises) have no `exercises` or `exerciseNotes`, and their steps and sets aren't linked; they're linked by name as they're imported.
- A file that isn't JSON, doesn't say `"app": "LoopTimer"`, lacks `workouts` or `history` lists, or is over 50 MB isn't a backup.

## Broken data

Saved data that's broken or unexpected never stops the app starting: unusable workouts and history entries are dropped and the rest kept; broken settings fall back to the defaults; a saved run with impossible times starts again from now. A backup file is read the same way.

## Platform notes

- **iOS:** reading and writing the same backup file lets workouts and history move between the web app and an iPhone app. Keep the "drop what's broken, keep the rest" rule when reading.
