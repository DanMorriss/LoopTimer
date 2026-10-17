# LoopTimer to-do

Open work from the October 2026 review. Highest priority first. Tick items off (or delete them) as they're done.

## 1. Performance

- [ ] **Timer page repaints every frame while running** (about 25 ms of work per second, measured):
  - Ring: `transition: --progress-deg 950ms` on the conic gradient never stops. Step it once a second, or draw the ring as an SVG stroke.
  - Flash: `flashFade` / `flashFadeBlue` animate `background-color`. Animate the `opacity` of a coloured overlay instead.
  - Turn both off under `prefers-reduced-motion`.
- [ ] **Library: the selected card's orbit animation** (`card-edge-orbit`) restyles every frame, on top of cards that use `backdrop-filter: blur`. Smaller cost.
- [ ] **Initial bundle is 566 kB, over its 500 kB budget.** Find out what's in the initial chunk (Material/CDK are likely). `timer-library.component.scss` is also about 1.2 kB over its 4 kB budget.
- [ ] **Fonts are requested more than once.** Audiowide loads in both `index.html` and `styles.scss`, and `index.html` has the same preconnect twice. Remove the duplicates and check whether Roboto is used.

## 2. Match the Angular guidelines (`~/.claude/CLAUDE.md`)

- [ ] `AppComponent` imports `HomeComponent`, `TimerSetupComponent`, `RouterLink` and `RouterLinkActive` but doesn't use them (NG8113 build warnings). `importProvidersFrom(FormsModule, MatButtonModule)` in `main.ts` is probably not needed either.
- [ ] Remove the explicit `ChangeDetectionStrategy.OnPush` (it's the default in v22). Move the components the v22 migration marked `Eager` to the default after checking they work.
- [ ] In the `NavComponent` constructor, use `inject()` instead of constructor injection.
- [ ] `infinity-button`: remove `standalone: true` and replace `@Output()` / `EventEmitter` with `output()`. Make `buttonClasses` a `computed()`.
- [ ] `TimerStore`: use `@Service` instead of `@Injectable({ providedIn: 'root' })`.
- [ ] Optional: move the setup form to Signal Forms.

## 3. Accessibility follow-ups

- [ ] Run axe automatically, in a test or in CI, so regressions get caught. Every page passed with 0 violations at the time of writing.
- [ ] Respect `prefers-reduced-motion` for the timer flash and ring, and check the remaining button animations.
- [ ] The home page text says "Click the infinity symbol to navigate". Reword it so it doesn't assume a mouse.
- [ ] Consider announcing phase changes (Work / Rest / Finished) to screen readers with a polite `aria-live` region. Announce changes only, not every second.

## 4. Tooling

- [ ] `.prettierrc.json` uses `prettier-plugin-tailwindcss`, which isn't installed, so Prettier fails. Install the plugin or remove it from the config.
- [ ] Move from Node 25 to Node 24 LTS. Angular 22 doesn't officially support odd-numbered Node versions.
- [ ] Optional: move tests from Karma to Vitest with `ng update @angular/cli --name migrate-karma-to-vitest`.
- [ ] Fix the Sass `@import` deprecation warnings in `styles.scss` (move to `@use`).
- [ ] Install the GitHub CLI (`brew install gh`, then `gh auth login`) so PRs can be raised from the terminal.

## 5. Documentation

- [ ] **Bring `README.md` up to date.** It still describes the original plan rather than the app as built:
  - It says the project was generated with Angular CLI 19.1.4; the app is now on Angular 22.
  - It describes features that don't exist yet: multiple intervals per timer, infinite loops, per-interval alarm sounds and vibration, pause/resume/stop, a save modal, settings and history screens. Mark these as planned, separate from what works today.
  - Describe what the app does now: create, edit and delete timers in the library; work/rest/repeat countdown; timers saved in `localStorage`; the active timer restored after a refresh.
  - Add setup notes: supported Node version, `npm ci`, `npm start`, and `npm test` (headless: `ng test --watch=false --browsers=ChromeHeadless`).
  - Remove the generic Angular CLI boilerplate (code scaffolding, e2e) that doesn't apply, and link to `TODO.md`.
