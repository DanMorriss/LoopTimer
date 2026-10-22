# History

## Stories

- **HIS-1** As a user I want to see the workouts I've done, grouped by day, so I can look back on them.
- **HIS-2** As a user I want to see how much I've done in the last week.
- **HIS-3** As a user I want to add a short note to a workout (e.g. "felt strong").
- **HIS-4** As a user I want to delete a workout from the history, and undo it if I didn't mean to.
- **HIS-5** As a user I want to see the sets I did in each workout, reps and weight, so I can see my improvements over time.

## Rules

### What's logged

- Every **finished** workout, and every **stopped** one where at least one step was done (see [pause-and-stop](pause-and-stop.md)). That includes one ended by starting another workout, or by closing the app.
- Each entry keeps:
    - the workout's title **as it ran** (renaming or deleting the workout later doesn't change it)
    - when it started, and when it ended
    - the **time spent**, in whole seconds: pauses don't count, time on rep steps does. A finished workout counts its full length plus rep time.
    - the full **rounds done**, and the rounds it was set to (or "until stopped")
    - finished or stopped
    - an optional note
    - the **sets** of its rep steps (HIS-5): for each Done, the round, the step, its name, the reps and the weight. A set is only logged on Done, so a workout stopped mid-set doesn't log that set.
- **One entry per run**: logging the same run again (e.g. stopped when the app closed, then finished after a reload) updates its entry, keeping any note added meanwhile.
- **All are kept**, however many: years of them (SYN-5).

### The page

- Newest first, grouped by the day they started: "**Today**", "**Yesterday**", then the date, e.g. "Saturday 17 October".
- At the top: "**Last 7 days:** 4 workouts · 1:15:30": the count and total time spent of workouts started in the last 7 × 24 hours.
- Each entry shows its title (or "Untitled workout") and a line: start time · time spent · rounds, e.g. "9:05 AM · 12:30 · 3 rounds".
    - Time spent is m:ss, or h:mm:ss over an hour.
    - Rounds: "3 rounds" when finished, "2 of 5 rounds · stopped" when stopped, "12 rounds · until stopped" for a workout that runs until stopped.
- **Sets**, one line per rep step, under the entry, in the unit chosen in settings, e.g.:
    - "Squats: 3 × 10 @ 60 kg": the same every set
    - "Squats: 10, 10, 8 @ 60 kg": the reps changed
    - "Squats: 10 @ 60, 8 @ 62.5 kg": the weight changed
    - "Push-ups: 3 × 20", or "Push-ups: 20 reps" for one set: no weight. An unnamed step is called "Reps".
    - A line is named as the step was when it ran, except for an exercise of your own, which shows its name now, so renaming it (EXR-3) renames it here too. Built-in exercises can't be renamed, so a set from a step called "Squats" stays "Squats".
    - Screen readers hear words, e.g. "Squats, 3 sets of 10 reps at 60 kg".
- The note, if any, sits under the entry.
- With no workouts: "No workouts yet. Finished and stopped workouts show up here." with a link to the library.

### Notes

- Each entry's **⋮ menu** offers **Add note** (or **Edit note** and **Remove note** once there is one) and **Delete**. One menu open at a time.
- A note is up to **120 characters**, trimmed. Saving an empty note removes it. Cancel keeps the note as it was.
- From the finished screen, **Add a note** opens the history with that workout highlighted, in view, and its note box open and focused. **View history** highlights it without opening the box.

### Delete and Undo

- **Delete** removes the entry at once and shows "Deleted Sprints. **Undo**". Undo puts it back, note and all.
- A deleted entry **stays deleted** even if its run is still going and later finishes, or the app is closed (which would otherwise log it again). Only Undo brings it back.

## Acceptance criteria

- Given 3 sets of 10 squats at 60 kg, then the entry shows "Squats: 3 × 10 @ 60 kg"; given 10 then 8 at 62.5 kg, then "Squats: 10 @ 60, 8 @ 62.5 kg".
- Given weights in lb, then a set saved at 61.235 kg shows as 135 lb.
- Given workouts today, yesterday and last Tuesday, then they're grouped under Today, Yesterday and the date, newest first.
- Given a finished 3-round workout of 12:30 started at 9:05 AM, then it shows "9:05 AM · 12:30 · 3 rounds".
- Given a workout stopped in round 3 of 5, then it shows "2 of 5 rounds · stopped".
- Given three workouts this week totalling 45 minutes and one 8 days ago, then the summary says "3 workouts · 45:00".
- Given a note of 200 characters, then it's cut to 120.
- Given an entry with a note, when I save it empty, then the note is removed.
- Given I delete an entry, when I press Undo, then it's back with its note.
- Given a run still going whose entry I delete, when the run finishes, then the entry doesn't come back, even after a reload.
- Given a run I leave by closing the tab, when I open the app again, then it's in the history as stopped.

## Platform notes

- **Web:** `HistoryStore` (`src/app/shared/state/history-store.service.ts`) and `HistoryComponent` (`src/app/history/`), at `/history`. The history is saved in IndexedDB (`history-database.ts`; see [data](data.md#history-the-history)) and loads in the background, so `/history` and `/exercises/:id` wait for it to open, and a backup waits for it too; `?note=<id>` and `?run=<id>` come from the finished screen. Formatting is in `src/app/history/history-format.ts`.
- **iOS:** SwiftData (or a JSON file) for entries, with no cap. Swipe to delete with an Undo toast is the iOS habit. The date groups should follow the user's locale, as they do on the web.
