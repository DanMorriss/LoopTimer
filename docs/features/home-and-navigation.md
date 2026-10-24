# Home and navigation

## Stories

- **NAV-1** As a user I want to get to any page from anywhere, and straight back to a workout in progress.

## Rules

### Where the app opens

- The app opens on the **Library**, where workouts are started and **Add workout** makes a new one. `/` and the old `/home` both go there.
- There's no separate home page any more. The **∞ logo** that was the home page is in **Settings**, under **About**: the loop draws itself in and a light travels round it (it rests where the loops cross with reduced motion on).

### The tab bar

- Along the bottom of every page but the workout's: **Library**, **Exercises**, **History** and **Settings**, each an icon with its name under it.
- It's a capsule floating over the bottom of the page, the same shape on a phone and on a wide screen (up to 26rem wide, centred), in a frosted material the page scrolls under. It sits clear of an iPhone's home bar.
- The chosen tab has a highlight behind it, which slides to the next one when you change tab, on a spring with no bounce. A tab is chosen on its own page and the pages under it (an exercise's page is under Exercises); making or editing a workout is under **Library**.
- Screen readers hear it as the "Main" navigation; the chosen tab is the current page on its own page, and the current item on a page under it (e.g. "Library, current" while making a workout).
- Pages leave room at the bottom for the bars, so the last of a page scrolls clear of them.

### A workout in progress

- On every page but its own, a workout that's going shows in a **bar above the tabs**, like a music app's mini player: a dot in the step's colour (pink timed, blue rest, violet reps, grey paused), the workout's name, and the step with its time, e.g. "Squats · 00:23", "Push-ups · 20 reps" or "Paused · Squats · 00:23", ticking down.
- **Pause** (or **Resume**) is at its right. The rest of the bar opens the workout.
- Once the workout has finished, the bar says "Finished: see how it went", with no Pause, and opens the summary.
- The bar rises into place as it appears.
- The **workout page** has no tab bar. A **⌄** button at its top left goes back to the page you came from (with its address, e.g. a muscle filter), named for it, e.g. "Back to History". The workout keeps running, in the bar. Opened straight from an address, it goes back to the Library.
- On the workout page on a phone, the workout's title takes the place of "LoopTimer" in the header. An untitled workout keeps "LoopTimer".

## Acceptance criteria

- Given I open the app, then it's on the Library, with Library chosen in the tab bar.
- Given the History tab, when I press Settings, then Settings opens and the highlight slides to it.
- Given I'm making a workout, then Library is chosen.
- Given a workout going, when I press ⌄ on its page, then I'm back where I came from, with the bar above the tabs showing the step and its time; pressing the bar's Pause pauses it, and pressing the bar opens the workout again.
- Given a workout finishes while I'm on History, then the bar says "Finished: see how it went" and opens the summary.
- Given the workout page, then there's no tab bar.

## Platform notes

- **Web:** `TabBarComponent` (`src/app/nav/tab-bar/`, tabs in `tabs.ts`), `RunBarComponent` (`src/app/nav/run-bar/`), the header and its back link in `NavComponent` (`src/app/nav/`), and the logo in `LoopLogoComponent` (`src/app/shared/components/loop-logo/`). Routes in `src/app/app.routes.ts`. How much of the page the bars cover is `--bars-height`, worked out in `styles.scss` with `:has()` from which bars are showing; pages use it to leave room. `viewport-fit=cover` in `index.html` makes `env(safe-area-inset-*)` work, for the gap above an iPhone's home bar.
- **iOS:** a `TabView` with the same four tabs. The workout in progress is a bar above the tabs (`tabViewBottomAccessory`, as Music's mini player), opening the workout full screen; and a **Live Activity** on the lock screen and Dynamic Island, which also serves ALM-2 and CTL-1.
