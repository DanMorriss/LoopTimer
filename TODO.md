# Loop Workouts to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Sign in with Google and Apple (SYN-7).**
- [ ] **Move everyone to loopworkouts.com:** the app moved there on 2026-10-28 (Vercel, with www redirecting to it; DNS at GoDaddy), and loop-workouts.vercel.app still serves it, not redirected. Each address keeps its own data, so a redirect would strand what's saved on the old one. Now that sync is in, redirect vercel.app to loopworkouts.com (signing in on the new address brings the data back), and take it out of Supabase's Redirect URLs.

### Exercises

- [ ] **Add an exercise to a workout from its page:** on an exercise's page (e.g. Pull-ups), let the user add it to a workout in their library, or start a new workout with it in. Needs a story in `docs/features/exercises.md`.

### Simple planning

- [ ] **Weekly plan and Due today (PLN-1–3).**

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible now that sync has one, in Supabase). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

## 2. Known issues

- [ ] **The rest between sets belongs to the wrong set (BLD-9):** on the run screen, the rest after a set shows as part of the next set ("set 2 of 3" while resting after set 1); it should count as part of the set being rested from. And the last set's rest is skipped, so the run goes straight into the next exercise: it should still happen, unless it's the last exercise of the whole workout. Both are written down as rules in `docs/features/run-a-workout.md` ("not after the last", and "the rest between sets is part of the set it leads to"), so change those with it.

- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact. They name no country's law, nor who's responsible for the data (as the UK and EU GDPR ask); decide whether they should, now that data leaves the device.
- [ ] **Try the summary's drag from its content on an iPhone:** added on 2026-10-25 with touch events (Safari has no `touch-action: pan-down`), and tested only in Chromium with simulated touches. Check that, scrolled to the top, a finger moving down on the stats drags the sheet; moving up scrolls; a scrolled-down wheel in the sets still turns; and the button a drag starts on isn't pressed.
- [ ] **Keep the initial load under its 500 kB budget:** it reached 499.3 kB on 2026-10-26; dropping zone.js (PR #133) took it to 461 kB (117 kB transferred), and the library order (PR #138) to 462.5 kB. Each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment). Two more savings were found, for when it's needed again:
    - **Load the built-in exercises on demand (about 20 kB):** their words already do; the list itself (`models/built-in-exercises.ts`) still loads at start, because the stores pull it in. Load it the first time the Exercises page, the exercise picker or a workout needs it.
    - **Our own icons instead of Material's (about 15 kB):** `mat-icon` (Material's icon module) is in the tab bar, run bar and undo bar, which are on every page. Swap it for a small icon component or inline SVG, and Material leaves the start-up code.
- [ ] **The summary's Change reps or weight has no headings or supersets:** its read-only lines are grouped under the workout's headings (BLD-13) and supersets (BLD-12), but the view for changing them lists each step's sets without them. Group it the same way, or leave it as a plain list of what can be changed.
- [ ] **Yes, use next time undoes Apply:** on the summary, applying a Next time step-up (PRG-10) and then answering Yes to "Use these settings next time?" puts the steps back to this run's last sets, as Yes always does. Yes could leave applied steps alone, or the two could become one choice.
- [ ] **An open superset folds as its handle is pressed:** in Create, pressing a superset's drag handle hides its steps straight away (so the drag measures the list without them), before the drag starts, so the list below jumps up under the finger. Folding them only once the drag starts would need the drop list to measure itself again after (the CDK caches the rows' places at the start).
