# Home and navigation

## Stories

- **NAV-1** As a user I want to get to any page from anywhere, and straight back to a workout in progress.

## Rules

### Home

- An **∞ logo** with **Create** on its left loop and **Library** on its right, as links. A glowing dot travels round the loop (it rests where the loops cross with reduced motion on). Under it: "Choose Create or Library to get started".
- The logo scales with the screen, up to 600px wide, and fits on the smallest phones (320px wide).

### Menu

- The header has the **LoopTimer** title and a **menu button** (top left) listing: Home, Create, Library, History, Settings.
- While a workout is going, **Timer** is listed first, to get back to it.
- The page you're on is marked. The menu closes on following a link (including to the page you're on), Escape, a tap outside it, or tabbing out of it.
- On the timer page on a phone, the timer's title takes the place of "LoopTimer" in the header. An untitled timer keeps "LoopTimer".

## Acceptance criteria

- Given the home page, then Create goes to setup and Library to the library.
- Given no workout going, then the menu lists Home, Create, Library, History, Settings.
- Given a workout going, then Timer is listed first.
- Given the menu is open, when I press Escape, then it closes and focus goes back to the menu button.

## Platform notes

- **Web:** `HomeComponent` (`src/app/home/`), `NavComponent` (`src/app/nav/`), routes in `src/app/app.routes.ts`.
- **iOS:** a tab bar (Library, History, Settings, with Create as a button) would be the usual shape, in place of a home page and a menu. If so, a workout in progress could show as a bar above the tabs (like Music's mini player) and as a **Live Activity** on the lock screen and Dynamic Island, which also serves ALM-2 and CTL-1.
