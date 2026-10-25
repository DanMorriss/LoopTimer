# Backup and sync

Export and import (SYN-1, SYN-2) are built, with a prompt for having an AI turn a plan into a file to import (SYN-6), the history has room for years (SYN-5), and the data is ready for sync: random ids, `updatedAt` and deletion markers (see [data](data.md)). The rest is planned (see [direction](../direction.md)); its rules are a first draft and get firmed up, with acceptance criteria, when it's built.

## Stories

- **SYN-1** As a user I want to export all my data to a file, so I have a backup.
- **SYN-2** As a user I want to import that file, on this device or another, without losing what's already there.
- **SYN-3** As a user I want to sign in, so my workouts and history are the same on my phone and my laptop.
- **SYN-4** As a user I want the app to keep working with no connection, and catch up when it's back.
- **SYN-5** As a user I want to keep years of history, not just the last 500 workouts.
- **SYN-6** As a user with a plan already (from a coach, a book or a spreadsheet), I want an AI to turn it into workouts I can import, so I don't have to build each one by hand.

## Rules

### Export and import (SYN-1, SYN-2)

- They're in **Settings → Your data**, under the hint "Your workouts and history are saved on this device only. Export a backup to keep them safe, or to move them to another device."
- **Export backup** downloads one file of the workouts, history, your own exercises, your notes on exercises, which exercises are hidden from the picker, deletions and settings (your equipment included), e.g. `looptimer-2026-10-21.json` (dated by the device's calendar), and says "Backup saved as looptimer-2026-10-21.json." The file's shape is in [data](data.md#backup-file).
- **Import backup** opens a file picker. The chosen file is **merged** with what's here, by id:
    - A workout, history entry, exercise of your own, note on an exercise or hidden exercise only in the file is **added**.
    - One in both keeps **the most recent change**: an edit, a note, a change of reps mid-workout. On a tie, this device's stays.
    - Exercises and notes come in first, so the file's workouts and history entries can be **linked** to them: a step or set that isn't linked yet (a file from before exercises), or is linked to an exercise that's neither here nor in the file, is linked by its name, as saved data is (see [data](data.md#data-version)).
    - An **exercise of your own with the same name** as one here (matched as names are, so "sled push" is "Sled push") but another id, e.g. typed on two devices, is taken to be the one here: it isn't added, and the file's steps, sets, note and hidden mark for it go to the one here.
    - One **deleted where the backup came from** is deleted here too, unless it's changed here since. One **deleted here** doesn't come back, unless it changed there after it was deleted here.
    - Nothing else here is changed or removed.
    - **Settings** in the file are left out: theme, sound, your equipment and so on are a choice for each device.
    - Workouts and history entries in the file that aren't usable are left out, the same as when the app loads its own data, and older workout formats convert.
    - **A version 1 file** (from before ids were random) has no dates or deletions, and its workout ids were only unique on its device. Its workouts are matched by what they are instead (title, steps and rounds): one the same as a workout here is skipped, any other is added with a new id. So a workout changed since that backup was made is kept, and the backup's version is added alongside it. Its workouts merge by run id as above.
- What happened is shown under the buttons, and read out by screen readers:
    - "Added 2 workouts, 3 exercises and 14 history entries." (or just the parts that apply)
    - "Updated 1 workout and 2 history entries." when newer copies were taken (exercises count too)
    - "Removed 3 items deleted since on the other device."
    - Those that apply, in that order, or "Nothing new: everything in that backup is already here."
    - Either, followed by "1 item in it couldn't be read, so it was left out." when some were.
    - "That file isn't a LoopTimer backup." (not a backup, or over 50 MB)
    - "That file couldn't be read. Is it a LoopTimer backup?" (not JSON)
    - "That backup is from a newer version of LoopTimer. Update the app and try again."
- A file that's turned down changes nothing.

### Bringing in a plan with AI (SYN-6)

- Under the backup buttons: "Have a plan from a coach, a book or a spreadsheet? Copy this prompt into an AI chat, add your plan, then bring in the file it writes with Import backup." and a **Copy AI prompt** button.
- It copies the prompt to the clipboard and says "Prompt copied. Paste it into an AI chat, then add your plan." If the browser won't allow it: "The prompt couldn't be copied. Try again, or another browser."
- The prompt asks for one JSON object, in a code block, in the backup file's shape (see [data](data.md#backup-file)) cut down to what a plan needs: `app`, `version` (the app's current one), `workouts` and `exercises`, **with no ids or dates**. It's made from the app itself, so it keeps up with it:
    - the workout and step fields, with their limits (steps per workout, rounds or until stopped, a time limit, seconds, reps, a weight in kg, converting lb, a name's length), and how a plan's sets become rounds or steps
    - every built-in exercise's name and other names, to name steps by where they match
    - for any other exercise, an entry in `exercises` with how it's measured, the equipment and muscles to choose from, and an optional description, how-to steps and tips
    - an example file, and to pick a sensible value for what doesn't fit (e.g. the low end of 8–12 reps, or a weight given as a percentage of a max) and list what it changed under the JSON as "Notes:"
    - it ends with "MY PLAN", for the plan to be pasted after it.
- The file it writes goes in with **Import backup**, which is eased for a file written by hand:
    - `history` can be left out (`exportedAt`, `exerciseNotes`, `hiddenExercises`, `deleted` and `settings` already could).
    - A **workout with no id** is new: it's given a random id, dated now, and matched by what it is (title, steps and rounds), as a version 1 file's are. One the same as a workout here is skipped, so importing the same file twice doesn't add it twice.
    - An **exercise of your own with no id** is given a random id and dated now. One with the name of an exercise here, built-in or your own, is taken to be that one, as above, so it isn't added again.
    - Steps are linked by name as usual: to a built-in exercise or one of yours where the name matches, else to the file's own exercises, else to a new exercise of your own made from the step.
    - What happened is shown as for any backup, e.g. "Added 3 workouts and 2 exercises."

### Room for history (SYN-5)

- Every workout in the history is kept, with no cap. On the web it's in IndexedDB rather than `localStorage` (about 5 MB, which held the newest 500), and the old list moves across on load (see [data](data.md#history-the-history)).
- Deletions are remembered for the last 5,000, so an old backup can only bring back something deleted that long ago.
- A backup can be up to 50 MB, far more than years of workouts take.

### Still to come (draft)

- **Sync (SYN-3, SYN-4):** the device's copy is the one the app works from; changes are sent when online, and the most recent change to a record wins.

## Acceptance criteria

- Given 2 workouts and 5 history entries, and a deleted workout, when I export, then a file named for today downloads holding all of them, the deletion and the settings.
- Given a workout here, when I import a backup with a later change to it, then the later one replaces it; with an earlier change, this one stays.
- Given a workout here with no note, when I import a backup where it was given a note later, then it has the note.
- Given a backup made after a workout was deleted on that device, when I import it, then the workout goes here too, unless I changed it here after.
- Given a workout I deleted here, when I import a backup that has it, then it stays deleted.
- Given my own exercise "Sled push" here, when I import a backup with a "Sled push" of its own made on another device, then I still have one "Sled push", and the backup's workouts and history that used its one use mine.
- Given a version 1 backup with a workout "Legs" and one the same already here, when I import it, then "Legs" isn't added again; a different workout with the same old id as one here is added with a new id, and both are kept.
- Given a backup with a light theme and lb, when I import it, then my settings don't change.
- Given a file that isn't a backup, or is from a newer version, when I import it, then nothing changes and I'm told why.
- Given a backup with a broken workout and two broken history entries, when I import it, then the rest are added and "3 items in it couldn't be read" is shown.
- Given I press Copy AI prompt, then the prompt is on the clipboard and I'm told so.
- Given a file written by hand with a workout "Legs" of 8 back squats and 30 seconds of "Sled push", no ids and no history, and an exercise "Sled push", when I import it, then "Legs" is added with its first step linked to the built-in Back squat and its second to my new "Sled push"; when I import it again, then nothing new is added.
- Given 600 workouts in the history, when I open the app again, then all 600 are there.
- Given a history saved before it moved to IndexedDB, when I open the app, then every entry is still there.

## Platform notes

- **Web:** `BackupService`, `backup-file.ts` and the AI prompt, `planPrompt()` in `plan-prompt.ts` (`src/app/shared/backup/`); the stores' `mergeWorkouts()` and `mergeEntries()` (and `importWorkouts()` for version 1 files), using `mergeRecords()` in `models/sync.ts`; deletions are kept by `DeletionStore`, and saved data is converted by `migrate.ts`. The file is downloaded through a link with `download`; on an iPhone, Safari offers to save it to Files. The picker is a file input opened by the Import button, kept out of the keyboard's way.
- **iOS:** a share sheet for export and a document picker for import, reading and writing the same file.

## Open questions

- Which backend (e.g. Supabase, Firebase, or one of our own), and how people sign in (email link, Apple, Google).
- Should there be a nudge to export, or to add the app to the Home Screen, until sync exists?
