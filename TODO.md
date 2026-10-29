# Loop Workouts to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Sync

The plan is in `docs/features/backup-and-sync.md` (Sync and The backend), as agreed with Dan on 2026-10-27: Supabase in an EU region, an optional account, email sign-in first, signing out keeping the data on the device, settings staying per device, and changes dated by the server's clock. The library's order merges as a record of its own (in backups now, and in sync).

The Account tab is in (at `/account`); since 2026-10-28 it also holds Your data (backups and **Clear this device**, SYN-9), About, and a row into Settings, which is no longer a tab of its own. Dan made the Supabase project on 2026-10-27, in an EU region: `https://cpgacyzlfyskifzhkotu.supabase.co`, with a publishable key (safe in the app; the service role key never goes in it).

Signing in by an email link or its code, signing out and deleting the account are built (PR #140): Supabase's code loads only on the Account tab. Supabase checked on 2026-10-28: the free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused; Pro is $25 a month.

Set up by Dan on 2026-10-28 and tested on his phone (the code in the Home Screen app, and the link in Safari): `supabase/schema.sql` is run, and sign-in emails come from Loop Workouts <signin@mail.loopworkouts.com>, sent by Resend (EU) through Supabase's custom SMTP, with the code in the Magic Link and Confirm signup templates. The domain, loopworkouts.com, is at GoDaddy, with Microsoft 365 for Dan's own email on the bare domain; Resend's DNS records are on the `mail` subdomain so they don't clash, and GoDaddy's DMARC record covers it.

Sync is built (SYN-3, SYN-4; PR #144): fetch, merge as an import does, then send what's changed, with `pull_records()` and `push_records()` in `supabase/schema.sql` (and the server's clock check there). Its code loads only once signed in. The privacy notice and terms say what's sent. Dan ran the new `supabase/schema.sql` and tried sync on two devices on 2026-10-28: it all works.

- [ ] **Sign in with Google and Apple (SYN-7).**
- [ ] **Move everyone to loopworkouts.com:** the app moved there on 2026-10-28 (Vercel, with www redirecting to it; DNS at GoDaddy), and loop-workouts.vercel.app still serves it, not redirected. Each address keeps its own data, so a redirect would strand what's saved on the old one. Now that sync is in, redirect vercel.app to loopworkouts.com (signing in on the new address brings the data back), and take it out of Supabase's Redirect URLs.

### Simple planning

- [ ] **Weekly plan and Due today (PLN-1–3).**

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible now that sync has one, in Supabase). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

## 2. Known issues

- [ ] **Clear this device doesn't reach other open tabs:** another tab of the app keeps what it had in memory, and saves it back the next time anything changes there. Close other tabs first; a fix could tell them to reload (e.g. a `storage` event or BroadcastChannel).
- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact. They name no country's law, nor who's responsible for the data (as the UK and EU GDPR ask); decide whether they should, now that data leaves the device.

- [ ] **A progress chart test can fail when the whole suite runs at once:** "narrows the chart to a range, and says when nothing falls in it" failed once in a full local run on 2026-10-24, once in eight on 2026-10-25, once in two on 2026-10-26 and once on 2026-10-27, and passes on its own. Ruled out on 2026-10-25: the history's background load landing mid-test (waiting for `HistoryStore.ready` first didn't stop it), and spec files sharing storage (files run at once, but each has its own localStorage). Its message, caught in a full run on 2026-10-26: after picking "4 weeks" the chart has 0 dots where 1 is expected (`exercise-progress.component.spec.ts:130`), so the narrowed range sometimes leaves out the set it should keep; look at how the range's start is worked out against the test's dates (e.g. a set right on the 4-week edge, or "now" read at different moments). The wheel picker's "turns with a mouse drag and snaps to a whole row", which failed with it on 2026-10-24, now waits for the wheel to stop rather than a fixed time.
- [ ] **Try the summary's drag from its content on an iPhone:** added on 2026-10-25 with touch events (Safari has no `touch-action: pan-down`), and tested only in Chromium with simulated touches. Check that, scrolled to the top, a finger moving down on the stats drags the sheet; moving up scrolls; a scrolled-down wheel in the sets still turns; and the button a drag starts on isn't pressed.
- [ ] **Keep the initial load under its 500 kB budget:** it reached 499.3 kB on 2026-10-26; dropping zone.js (PR #133) took it to 461 kB (117 kB transferred), and the library order (PR #138) to 462.5 kB. Each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment). Two more savings were found, for when it's needed again:
    - **Load the built-in exercises on demand (about 20 kB):** their words already do; the list itself (`models/built-in-exercises.ts`) still loads at start, because the stores pull it in. Load it the first time the Exercises page, the exercise picker or a workout needs it.
    - **Our own icons instead of Material's (about 15 kB):** `mat-icon` (Material's icon module) is in the tab bar, run bar and undo bar, which are on every page. Swap it for a small icon component or inline SVG, and Material leaves the start-up code.
- [ ] **The body map can't shade abductors:** react-native-body-highlighter has no abductor shapes on either figure (still none upstream on 2026-10-25, though its slug is mapped in `tools/build-body-shapes.mjs`), so exercises that work them (side plank, hip abduction) list them without shading. Fix by drawing the shapes ourselves, or swap to a diagram that has them.
- [ ] **Yes, use next time undoes Apply:** on the summary, applying a Next time step-up (PRG-10) and then answering Yes to "Use these settings next time?" puts the steps back to this run's last sets, as Yes always does. Yes could leave applied steps alone, or the two could become one choice.
- [ ] **The muscle bars' aim is the same for every muscle:** 10 to 20 sets a week (PRG-8), the usual advice for building muscle, so small muscles hardly anyone trains on their own (neck, shins, abductors) always show as under, and so does most of the body for someone training for fitness rather than size. Decide whether small muscles get a lower aim, or the aim becomes a setting (an open question in `docs/features/progress.md`).
