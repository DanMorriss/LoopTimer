# Home and navigation

## Stories

- **NAV-1** As a user I want to get to any page from anywhere, and straight back to a workout in progress.

## Rules

### Where the app opens

- The app opens on the **Library**, where workouts are started and **New** at its top right makes a new one. `/` and the old `/home` both go there.
- There's no separate home page any more. The **∞ logo** that was the home page is in **Settings**, under **About**: the loop draws itself in and a light travels round it (it rests where the loops cross with reduced motion on).

### The tab bar

- Along the bottom of every page but the workout's: **Library**, **Exercises**, **History**, **Account** and **Settings**, each an icon with its name under it. Five fit a 320px-wide phone, each wider than 44px.
- It's a capsule floating over the bottom of the page, the same shape on a phone and on a wide screen (up to 26rem wide, centred), in a frosted material the page scrolls under. It sits clear of an iPhone's home bar.
- The chosen tab has a highlight behind it, which slides to the next one when you change tab, on a spring with no bounce. A tab is chosen on its own page and the pages under it (an exercise's page is under Exercises, the Privacy notice and Terms of use under Settings); making or editing a workout is under **Library**.
- Screen readers hear it as the "Main" navigation; the chosen tab is the current page on its own page, and the current item on a page under it (e.g. "Library, current" while making a workout).
- Pages leave room at the bottom for the bars, so the last of a page scrolls clear of them.
- **A tab left open across an update still opens every page.** A tab running the app from before a new version went live (e.g. one the browser kept in the background) can't find the code for pages it hasn't opened yet, so it loads that page afresh, which brings in the new version. It only tries once in a few seconds, so a page that really is broken doesn't reload over and over.

### A workout in progress

- On every page but its own, a workout that's going shows in a **bar above the tabs**, like a music app's mini player: a dot in the step's colour (pink timed, blue rest, violet reps, grey paused), the workout's name, and the step with its time, e.g. "Squats · 00:23", "Push-ups · 20 reps" or "Paused · Squats · 00:23", ticking down.
- **Pause** (or **Resume**) is at its right. The rest of the bar opens the workout.
- **Swiping the bar right ends the workout**, as End workout does. The bar follows the finger, and red **End workout** shows in the gap it leaves, turning solid (with a tick of vibration) once letting go would end it. Let go past halfway, or flicked, it slides off, the workout ends and its summary opens, where **Back to workout** takes it up again; short of that it springs back. Only a finger or pen: a mouse drag does nothing, and up and down still scroll the page. A finished workout's bar doesn't swipe.
- Once the workout has finished, the bar says "Finished: see how it went", with no Pause, and opens the summary.
- The bar rises into place as it appears.
- **The workout grows out of the bar** when it's pressed: the bar's frosted panel grows to fill the screen with the workout fading in on it, on a spring with no bounce, while the tab bar slides down out of the way. **⌄ folds it back** the same way: the panel shrinks into the bar and the tab bar comes back up. Every other change of page is instant, as switching tabs is. With reduced motion, it changes page at once too.
- The **workout page** has no tab bar. A **⌄** button at its top left goes back to the page you came from (with its address, e.g. a muscle filter), named for it, e.g. "Back to History". The workout keeps running, in the bar. Opened straight from an address, it goes back to the Library.
- On the workout page on a phone, the workout's title takes the place of "Loop Workouts" in the header. An untitled workout keeps "Loop Workouts".

### Undo

- Deleting goes ahead **at once**, with no "Are you sure?" (the one exception is Clear this device, which can't be undone; see [backup-and-sync](backup-and-sync.md#clear-this-device-syn-9)): a workout in the library, a step in setup (one with anything in it), your own exercise (or hiding one that's in your history instead), a workout in the history. Then the **Undo bar** offers to put it back.
- It floats above the tabs (and the workout's bar), in the same frosted capsule: what happened, e.g. "Deleted "Legs day".", **Undo**, and a close button. It rises in, and sinks out as it goes.
- **Undo** puts it back as it was, where it was, and focus goes to it (e.g. the workout's ⋮ button). An exercise deleted from its page opens that page again.
- It **doesn't go on a timer**, so there's always time to read it and reach it. It goes when it's used, closed (or Escape), replaced by another delete, or the page changes.
- Focus goes to Undo as it appears, so it's one key away, and screen readers hear what happened. Closing it puts focus where it would have gone after the delete.

## Acceptance criteria

- Given I open the app, then it's on the Library, with Library chosen in the tab bar.
- Given the History tab, when I press Settings, then Settings opens and the highlight slides to it.
- Given I'm making a workout, then Library is chosen.
- Given a workout going, when I press ⌄ on its page, then I'm back where I came from, with the bar above the tabs showing the step and its time; pressing the bar's Pause pauses it, and pressing the bar opens the workout again.
- Given a workout finishes while I'm on History, then the bar says "Finished: see how it went" and opens the summary.
- Given a workout going, when I swipe its bar right past halfway and let go, then the workout ends and its summary opens; when I let go short of halfway, then the bar springs back and the workout carries on.
- Given the workout page, then there's no tab bar.
- Given a tab open since before a new version went live, when I press History (or Settings, or New), then that page opens, on the new version.
- Given a workout going, when I press its bar, then the workout grows out of the bar to fill the screen; when I press ⌄, then it shrinks back into the bar and the tabs slide back up.
- Given I delete a workout, then it's gone and the Undo bar says "Deleted "Legs day"." with focus on Undo; when I press Undo, then it's back where it was.
- Given the Undo bar showing, when I wait, then it stays; when I go to another page, then it goes.

## Platform notes

- **Web:** `TabBarComponent` (`src/app/nav/tab-bar/`, tabs in `tabs.ts`), `RunBarComponent` (`src/app/nav/run-bar/`, which also handles its swipe to end, as the library's workout cards handle theirs to delete), the header and its back link in `NavComponent` (`src/app/nav/`), and the logo in `LoopLogoComponent` (`src/app/shared/components/loop-logo/`). Routes in `src/app/app.routes.ts`. A page whose code fails to load (renamed by a later deploy; Vercel answers for the old name with index.html) is loaded afresh by `reloadOnStaleCode` (`src/app/nav/stale-code.ts`), the router's navigation error handler in `main.ts`. How much of the page the bars cover is `--bars-height`, worked out in `styles.scss` with `:has()` from which bars are showing; pages use it to leave room. `viewport-fit=cover` in `index.html` makes `env(safe-area-inset-*)` work, for the gap above an iPhone's home bar. The Undo bar is `UndoBarComponent` (`src/app/nav/undo-bar/`), showing the offer that pages make through `UndoService` (`src/app/shared/undo/`). The morph is `WorkoutMorph` (`src/app/nav/workout-morph.ts`): the bar and ⌄ start a view transition around their own navigation (the router makes none, so other pages change at once), and `src/styles/_workout-morph.scss` pairs the bar with the workout page by view-transition-name, only while it runs.
- **Web, added to the Home Screen:** `manifest.webmanifest` makes it open on its own, without the browser's bars (`display: standalone`). `<meta name="theme-color">` is the page colour (`--page-bg`) of the theme in use: index.html sets it before the app loads, then `ThemeService` keeps it in step, so the browser's bars, and an installed app's, match the page.
- **Web, the icon:** the favicon is the ∞ and its light on the Start button's cyan: `public/favicon.svg` (the light moves round the loop in Firefox; other browsers show it still), `favicon.ico` for browsers without SVG icons, `apple-touch-icon.png` for an iPhone's home screen, and `icon-192.png` and `icon-512.png` for `manifest.webmanifest`, all drawn by `tools/build-favicon.mjs`. An iPhone app would use the same artwork, square, as its app icon.
- **iOS:** a `TabView` with the same four tabs. The workout in progress is a bar above the tabs (`tabViewBottomAccessory`, as Music's mini player), opening the workout full screen with a zoom transition from the bar (`.navigationTransition(.zoom(sourceID:in:))`), and a leading `.swipeActions` (or a drag gesture, if the accessory doesn't take swipe actions) to end it; and a **Live Activity** on the lock screen and Dynamic Island, which also serves ALM-2 and CTL-1.
