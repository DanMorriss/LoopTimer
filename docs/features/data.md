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
- A timer with no work (no work step with time, and no rep step) isn't valid.
- **Older format:** timers saved before steps existed have `timerMinutes`, `timerSeconds`, `restMinutes`, `restSeconds` in place of `steps`. They're read as a work step plus a rest step (left out if 0), and saved in the new format the next time anything changes.

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
        "note": "felt strong"
    }
]
```

- Times are ms since 1970 (UTC).
- `id` is `<startedAt>-<timerId>`: unique per run, so the same run logged again replaces its entry.
- `totalRounds` is 0 for a timer that runs until stopped. `outcome` is `finished` or `stopped`. `note` is missing when there isn't one (up to 120 characters).

### `history-deleted`

The ids of the last 20 history entries deleted, oldest first, so a run still going can't log itself back in (see [history](history.md)).

### `settings`

```json
{ "theme": "dark", "sound": true, "vibration": true, "keepScreenOn": true }
```

`theme` is `dark`, `light` or `system`.

## Saved for the run in progress (`sessionStorage` on the web, per tab)

| Key                    | What                                                                                                                               |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `activeTimerId`        | The timer being run.                                                                                                               |
| `activeRunStartedAt`   | When the run really began. Never moves; it dates the run and makes its history id.                                                 |
| `activeTimerStartedAt` | When the run began on the countdown's clock: moved on by every pause and every rep step, so elapsed time is simply now minus this. |
| `activeTimerPausedAt`  | When it was paused, if it is.                                                                                                      |
| `activeRepStepsDone`   | How many rep steps have been done, counting across rounds.                                                                         |
| `activeRepMs`          | Time spent on rep steps so far, which counts as time spent in the history.                                                         |

From these, everything on the timer page is worked out (see [run-a-timer](run-a-timer.md)).

## Broken data

Saved data that's broken or unexpected never stops the app starting: unusable timers and history entries are dropped and the rest kept; broken settings fall back to the defaults; a saved run with impossible times starts again from now.

## Platform notes

- **iOS:** keeping these same JSON shapes would let a future export/import (or iCloud sync) move timers and history between the web app and the iPhone app. Keep the "drop what's broken, keep the rest" rule when reading.
