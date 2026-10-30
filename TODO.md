# Loop Workouts to-do

Open work, highest priority first. Tick items off (or delete them) as they're done. The README's Roadmap is the public summary of the features below, and [docs/direction.md](docs/direction.md) explains the order.

## 1. Features

### Sync

Accounts and sync are built and working (SYN-3, SYN-4, SYN-7 with Google, SYN-8, SYN-9); how they work is in `docs/features/backup-and-sync.md`. Worth knowing when planning: Supabase's free tier has 50,000 monthly users, a 500 MB database and 5 GB of egress, and pauses after a week unused (Pro is $25 a month, checked 2026-10-28). loopworkouts.com's DNS is at GoDaddy, with Microsoft 365 for Dan's email on the bare domain and Resend's records on the `mail` subdomain.

- [ ] **Sign in with Apple (SYN-7):** the button is built but hidden, waiting on an Apple Developer account (paid). Then: an App ID and a Services ID with Sign in with Apple (domain `cpgacyzlfyskifzhkotu.supabase.co`, return URL `https://cpgacyzlfyskifzhkotu.supabase.co/auth/v1/callback`), a key (.p8), and Apple turned on in Supabase (Authentication → Providers) with the Services ID and a secret made from the key. Add `'apple'` to `SIGN_IN_PROVIDERS` in `account-client.ts`, and Apple back to the privacy notice. The secret lasts 6 months at most, so add a reminder to renew it.
- [ ] **Show Loop Workouts on Google's sign-in screen:** it says "to continue to cpgacyzlfyskifzhkotu.supabase.co", as signing in goes by Supabase's address. Showing loopworkouts.com (e.g. auth.loopworkouts.com) needs Supabase's custom domain add-on (paid), then the new callback URL in Google Cloud's client and in Supabase. Left for now (Dan, 2026-10-30).
- [ ] **Finish moving everyone off loop-workouts.vercel.app:** since 2026-10-30 the app there moves itself to loopworkouts.com once nothing would be left behind (nothing saved, or signed in and synced), and otherwise says it's moved and asks a guest to sign in (see Where the app opens in `docs/features/home-and-navigation.md`). Signing in there still needs it in Supabase's Redirect URLs. Once no one's left on it (a few weeks, say), redirect it in Vercel (Settings → Domains), take it out of Supabase's Redirect URLs, and remove `AddressMove`.

### Alarms (any time)

- [ ] **Alarm sound files:** swap the beeps generated in code (`AlarmService`) for proper sounds. Waiting on Dan to supply the files.
- [ ] **Alarm order setting (ALM-4):** pick which sound plays for each step, with a preview. Needs the sound files first.
- [ ] **Alarms on a locked phone:** iPhones suspend web audio when locked, so the beeps stop if the phone is locked by hand ("Keep screen on" stops it locking by itself). Scheduled notifications aren't possible on iOS (no Notification Triggers), and server push needs a backend (possible now that sync has one, in Supabase). Tried (PR #64, taken out again): playing the beeps as an `<audio>` track made on the spot, unlocked with a moment of silence on the first tap and shown on the lock screen via Media Session. In Safari on an iPhone it was silent once locked, so don't repeat it as it was. Parked for now (ALM-2 in `docs/features/alarms.md`).

## 2. Known issues

- [ ] **Have the Privacy notice and Terms of use looked over:** written on 2026-10-26 from what the app does, and updated on 2026-10-28 for accounts and sync (Supabase and Resend in Europe; workouts, history and exercises kept with the account) and dan@loopworkouts.com to contact, and on 2026-10-30 for the weekly plan and signing in with Google. They name no country's law, nor who's responsible for the data (as the UK and EU GDPR ask); decide whether they should, now that data leaves the device.
- [ ] **Try the summary's drag from its content on an iPhone:** added on 2026-10-25 with touch events (Safari has no `touch-action: pan-down`), and tested only in Chromium with simulated touches. Check that, scrolled to the top, a finger moving down on the stats drags the sheet; moving up scrolls; a scrolled-down wheel in the sets still turns; and the button a drag starts on isn't pressed.
- [ ] **Keep the initial load under its 500 kB budget:** it reached 499.3 kB on 2026-10-26; dropping zone.js (PR #133) took it to 461 kB (117 kB transferred), the library order (PR #138) to 462.5 kB, and it was 487 kB on 2026-10-30, after the weekly plan, the welcome screen and the move off vercel.app. Each new built-in exercise still adds about 300 bytes up front (its name, muscles and equipment). Two more savings were found, for when it's needed again:
    - **Load the built-in exercises on demand (about 20 kB):** their words already do; the list itself (`models/built-in-exercises.ts`) still loads at start, because the stores pull it in. Load it the first time the Exercises page, the exercise picker or a workout needs it.
    - **Our own icons instead of Material's (about 15 kB):** `mat-icon` (Material's icon module) is in the tab bar, run bar and undo bar, which are on every page. Swap it for a small icon component or inline SVG, and Material leaves the start-up code.
- [ ] **An open superset folds as its handle is pressed:** in Create, pressing a superset's drag handle hides its steps straight away (so the drag measures the list without them), before the drag starts, so the list below jumps up under the finger. Folding them only once the drag starts would need the drop list to measure itself again after (the CDK caches the rows' places at the start).
