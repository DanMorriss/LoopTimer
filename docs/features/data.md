# Data

What the app saves, and in what shape. Everything is on the device; there's no account or server.

## Saved for good (`localStorage` on the web)

### `timers`: the library

A JSON list of timers:

```json
[
    {
        "id": 3,
        "title": "Circuit",
        "repeats": 5,
        "steps": [
            { "kind": "work", "seconds": 45, "name": "Squats" },
            { "kind": "rest", "seconds": 15, "name": "" },
            { "kind": "reps", "reps": 20, "name": "Push-ups" }
        ]
    }
]
```

- `id`: a whole number from 1, unique; a new timer gets the highest + 1.
- `repeats`: 1–30, or **0 for until stopped**.
- `seconds`: 1–5999 (99:59). `reps`: 1–100. `name`: may be empty.
- `weight` (rep steps only, optional): in **kg whatever unit is shown**, to the gram, more than 0 and up to 300. Missing for none. A weight picked in lb is converted (1 lb = 0.45359237 kg), so 45 lb saves as 20.412 kg.
- A timer with no work (no timed step with time, and no rep step) isn't valid.
- **Older format:** timers saved before steps existed have `timerMinutes`, `timerSeconds`, `restMinutes`, `restSeconds` in place of `steps`. They're read as a timed step plus a rest step (left out if 0), and saved in the new format the next time anything changes.

### `history`: the history

A JSON list of entries, newest first, at most 500:

```json
[
    {
        "id": "1760952300000-3",
        "timerId": 3,
        "title": "Circuit",
        "startedAt": 1760952300000,
        "endedAt": 1760953050000,
        "activeSeconds": 750,
        "roundsCompleted": 5,
        "totalRounds": 5,
        "outcome": "finished",
        "note": "felt strong",
        "sets": [
            { "round": 0, "step": 0, "name": "Squats", "reps": 10, "weight": 60 },
            { "round": 1, "step": 0, "name": "Squats", "reps": 8, "weight": 62.5 }
        ]
    }
]
```

- Times are ms since 1970 (UTC).
- `id` is `<startedAt>-<timerId>`: unique per run, so the same run logged again replaces its entry.
- `totalRounds` is 0 for a timer that runs until stopped. `outcome` is `finished` or `stopped`. `note` is missing when there isn't one (up to 120 characters).
- `sets` (missing when there were none): one per Done on a rep step, in order. `round` and `step` count from 0, `reps` is at least 1, `weight` is in kg (missing for none). A broken set is dropped when loading, keeping the rest of the entry.

### `history-deleted`

The ids of the last 20 history entries deleted, oldest first, so a run still going can't log itself back in (see [history](history.md)).

### `settings`

```json
{ "theme": "dark", "sound": true, "vibration": true, "keepScreenOn": true, "weightUnit": "kg" }
```

`theme` is `dark`, `light` or `system`. `weightUnit` is `kg` or `lb`.

## Saved for the run in progress (`sessionStorage` on the web, per tab)

| Key                    | What                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `activeTimerId`        | The timer being run.                                                                                                               |
| `activeRunStartedAt`   | When the run really began. Never moves; it dates the run and makes its history id.                                                 |
| `activeTimerStartedAt` | When the run began on the countdown's clock: moved on by every pause and every rep step, so elapsed time is simply now minus this. |
| `activeTimerPausedAt`  | When it was paused, if it is.                                                                                                      |
| `activeRepStepsDone`   | How many rep steps have been done, counting across rounds.                                                                         |
| `activeRepMs`          | Time spent on rep steps so far, which counts as time spent in the history.                                                         |
| `activeSets`           | The sets done so far, as they'll go in the history entry.                                                                          |

From these, everything on the timer page is worked out (see [run-a-timer](run-a-timer.md)).

## Backup file

**Export backup** in settings saves everything as one JSON file, e.g. `looptimer-2026-10-21.json`; **Import backup** reads one back (see [backup-and-sync](backup-and-sync.md) for how it merges):

```json
{
    "app": "LoopTimer",
    "version": 1,
    "exportedAt": 1761055200000,
    "timers": [],
    "history": [],
    "settings": {
        "theme": "dark",
        "sound": true,
        "vibration": true,
        "keepScreenOn": true,
        "weightUnit": "kg"
    }
}
```

- `timers`, `history` and `settings` are in the same shapes as above; `exportedAt` is ms since 1970.
- `version` goes up whenever the file's shape changes. A file from an older version is converted when imported; one from a newer version is turned down.
- A file that isn't JSON, doesn't say `"app": "LoopTimer"`, lacks `timers` or `history` lists, or is over 10 MB isn't a backup.

## Broken data

Saved data that's broken or unexpected never stops the app starting: unusable timers and history entries are dropped and the rest kept; broken settings fall back to the defaults; a saved run with impossible times starts again from now. A backup file is read the same way.

## Platform notes

- **iOS:** reading and writing the same backup file lets timers and history move between the web app and an iPhone app. Keep the "drop what's broken, keep the rest" rule when reading.
