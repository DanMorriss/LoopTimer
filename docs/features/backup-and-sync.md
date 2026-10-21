# Backup and sync

Planned (see [direction](../direction.md)). Rules are a first draft and get firmed up, with acceptance criteria, when this is built.

## Stories

- **SYN-1** As a user I want to export all my data to a file, so I have a backup.
- **SYN-2** As a user I want to import that file, on this device or another, without losing what's already there.
- **SYN-3** As a user I want to sign in, so my workouts and history are the same on my phone and my laptop.
- **SYN-4** As a user I want the app to keep working with no connection, and catch up when it's back.
- **SYN-5** As a user I want to keep years of history, not just the last 500 workouts.

## Rules (draft)

- **Export (SYN-1):** one JSON file of workouts, exercises, history and settings, with a format version, named e.g. `looptimer-2026-10-21.json`.
- **Import (SYN-2):** merges by id: a record in both keeps the one changed most recently; nothing on the device is removed unless the file marks it deleted. A file from an older format is converted first; a broken file changes nothing and says why.
- **Ready for sync (groundwork, built with exercises):**
    - New ids are random (e.g. UUIDs), so two devices can't hand out the same one. Existing timer ids (1, 2, 3…) are converted.
    - Every workout, exercise and history entry has an `updatedAt` time.
    - A deleted record is kept as a marker (`deletedAt`) so the deletion can reach other devices. This replaces `history-deleted`.
- **Storage (SYN-5):** the history moves out of `localStorage` (about 5 MB, and the 500 cap) into IndexedDB on the web.
- **Sync (SYN-3, SYN-4):** the device's copy is the one the app works from; changes are sent when online, and the most recent change to a record wins.

## Open questions

- Which backend (e.g. Supabase, Firebase, or one of our own), and how people sign in (email link, Apple, Google).
- Should there be a nudge to export, or to add the app to the Home Screen, until sync exists?
