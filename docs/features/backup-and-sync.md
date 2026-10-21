# Backup and sync

Export and import (SYN-1, SYN-2) are built. The rest is planned (see [direction](../direction.md)); its rules are a first draft and get firmed up, with acceptance criteria, when it's built.

## Stories

- **SYN-1** As a user I want to export all my data to a file, so I have a backup.
- **SYN-2** As a user I want to import that file, on this device or another, without losing what's already there.
- **SYN-3** As a user I want to sign in, so my workouts and history are the same on my phone and my laptop.
- **SYN-4** As a user I want the app to keep working with no connection, and catch up when it's back.
- **SYN-5** As a user I want to keep years of history, not just the last 500 workouts.

## Rules

### Export and import (SYN-1, SYN-2)

- They're in **Settings → Your data**, under the hint "Your timers and history are saved on this device only. Export a backup to keep them safe, or to move them to another device."
- **Export backup** downloads one file of the timers, history and settings, e.g. `looptimer-2026-10-21.json` (dated by the device's calendar), and says "Backup saved as looptimer-2026-10-21.json." The file's shape is in [data](data.md#backup-file).
- **Import backup** opens a file picker. The chosen file is **added to** what's here: nothing already on the device is changed or removed.
    - **Timers** are matched by what they are (title, steps and rounds), since their ids are only unique per device. One the same as a timer here is skipped; any other is added with a new id. So a timer changed since the backup was made is kept, and the backup's version is added alongside it.
    - **Workouts in the history** are matched by their run id. One already here is left as it is, note and all; the rest are added. A deleted workout in the file comes back (and then stays, like Undo). The newest 500 are kept, as always.
    - **Settings** in the file are left out: theme, sound and so on are a choice for each device.
    - Timers and workouts in the file that aren't usable are left out, the same as when the app loads its own data, and older timer formats convert.
- What happened is shown under the buttons, and read out by screen readers:
    - "Added 2 timers and 14 workouts to the history." (or just the part that applies)
    - "Nothing new: everything in that backup is already here."
    - Either, followed by "1 item in it couldn't be read, so it was left out." when some were.
    - "That file isn't a LoopTimer backup." (not a backup, or over 10 MB)
    - "That file couldn't be read. Is it a LoopTimer backup?" (not JSON)
    - "That backup is from a newer version of LoopTimer. Update the app and try again."
- A file that's turned down changes nothing.

### Still to come (draft)

- **Export, after exercises:** adds your own exercises, and which built-in ones are hidden.
- **Import, after the sync groundwork:** merges by id, a record in both keeping the one changed most recently, and a record the file marks deleted is deleted here. That replaces matching timers by what they are.
- **Ready for sync (groundwork, built with exercises):**
    - New ids are random (e.g. UUIDs), so two devices can't hand out the same one. Existing timer ids (1, 2, 3…) are converted.
    - Every workout, exercise and history entry has an `updatedAt` time.
    - A deleted record is kept as a marker (`deletedAt`) so the deletion can reach other devices. This replaces `history-deleted`.
- **Storage (SYN-5):** the history moves out of `localStorage` (about 5 MB, and the 500 cap) into IndexedDB on the web.
- **Sync (SYN-3, SYN-4):** the device's copy is the one the app works from; changes are sent when online, and the most recent change to a record wins.

## Acceptance criteria

- Given 2 timers and 5 workouts, when I export, then a file named for today downloads holding all of them and the settings.
- Given a backup with a timer "Legs" and one the same is already here (with a different id), when I import it, then "Legs" isn't added again.
- Given a backup whose timer has the same id as a different timer here, when I import it, then it's added with a new id and both are kept.
- Given a workout here with a note, when I import a backup with the same workout and no note, then the note is kept.
- Given a workout I deleted, when I import a backup that has it, then it's back, and the run logging itself again updates it.
- Given a backup with a light theme and lb, when I import it, then my settings don't change.
- Given a file that isn't a backup, or is from a newer version, when I import it, then nothing changes and I'm told why.
- Given a backup with a broken timer and two broken workouts, when I import it, then the rest are added and "3 items in it couldn't be read" is shown.

## Platform notes

- **Web:** `BackupService` and `backup-file.ts` (`src/app/shared/backup/`); the stores' `importTimers()` and `importEntries()`. The file is downloaded through a link with `download`; on an iPhone, Safari offers to save it to Files. The picker is a file input opened by the Import button, kept out of the keyboard's way.
- **iOS:** a share sheet for export and a document picker for import, reading and writing the same file.

## Open questions

- Which backend (e.g. Supabase, Firebase, or one of our own), and how people sign in (email link, Apple, Google).
- Should there be a nudge to export, or to add the app to the Home Screen, until sync exists?
