# Loop Workouts to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Run `supabase/schema.sql` again, so the weekly plan syncs:** the plan (PLN-1) syncs as a record of a new kind, `plan`, which the server turns away until the new file is run in the SQL editor (it's safe to run again). Until then it's kept on each device and in backups, but not synced.
- [ ] **Renew the Apple sign-in secret by 2027-04-30:** Sign in with Apple's secret in Supabase (Authentication → Providers → Apple) is a token made from the .p8 key, which Apple lets last 6 months at most. Make a new one before it runs out, or signing in with Apple stops working.
- [ ] **Try Google and Apple sign-in in the Home Screen app on an iPhone:** they go to Google or Apple and back, which in the app added to the Home Screen may open in a browser sheet that keeps its sign-in apart from the app's, as email links do. If it signs in the sheet and not the app, hide the two buttons there (`display-mode: standalone`) and point to the email code, or sign in with their own scripts (Google Identity Services, Sign in with Apple JS) and `signInWithIdToken()`.
- [ ] **Move everyone to loopworkouts.com:** the app moved there on 2026-10-28 (Vercel, with www redirecting to it; DNS at GoDaddy), and loop-workouts.vercel.app still serves it, not redirected. Each address keeps its own data, so a redirect would strand what's saved on the old one. Now that sync is in, redirect vercel.app to loopworkouts.com (signing in on the new address brings the data back), and take it out of Supabase's Redirect URLs.

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible now that sync has one, in Supabase). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

## 2. Known issues

- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan. They name no country's law, nor who's responsible for the data (as the UK and EU GDPR ask); decide whether they should, now that data leaves the device.
- [ ] **Try the summary's drag from its content on an iPhone:** added on 2026-10-25 with touch events (Safari has no `touch-action: pan-down`), and tested only in Chromium with simulated touches. Check that, scrolled to the top, a finger moving down on the stats drags the sheet; moving up scrolls; a scrolled-down wheel in the sets still turns; and the button a drag starts on isn't pressed.
- [ ] **Keep the initial load under its 500 kB budget:** it reached 499.3 kB on 2026-10-26; dropping zone.js (PR #133) took it to 461 kB (117 kB transferred), and the library order (PR #138) to 462.5 kB. Each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment). Two more savings were found, for when it's needed again:
    - **Load the built-in exercises on demand (about 20 kB):** their words already do; the list itself (`models/built-in-exercises.ts`) still loads at start, because the stores pull it in. Load it the first time the Exercises page, the exercise picker or a workout needs it.
    - **Our own icons instead of Material's (about 15 kB):** `mat-icon` (Material's icon module) is in the tab bar, run bar and undo bar, which are on every page. Swap it for a small icon component or inline SVG, and Material leaves the start-up code.
- [ ] **An open superset folds as its handle is pressed:** in Create, pressing a superset's drag handle hides its steps straight away (so the drag measures the list without them), before the drag starts, so the list below jumps up under the finger. Folding them only once the drag starts would need the drop list to measure itself again after (the CDK caches the rows' places at the start).
