# LoopTimer to-do

Open work from the October 2026 review. Highest priority first. Tick items off (or delete them) as they're done.

## 1. Next up

- [ ] **Delete the 4 unused button components:** `crosshair-button`, `edge-button`, `pill-button` and `slide-button` in `src/app/shared/components/`, plus their 26 tests. Nothing in the app uses them. Three of them also have a latent bug: they bind `[type]="type"` instead of `[type]="type()"`, so inside a form they would submit it. `infinity-button` is used by the library page; keep it.

## 2. Timer behaviour

- [ ] **Base the countdown on real elapsed time.** It currently counts `setInterval` ticks, so it will probably fall behind in a background tab or on a locked phone, because browsers slow timers down there. Store the start time and work out the remaining time from `Date.now()`.
- [ ] **Resume mid-workout after a refresh.** A refresh now brings the active timer back, but it restarts from the beginning. This is easy once the countdown uses elapsed time: save the start time in `sessionStorage` alongside `activeTimerId`.

## 3. Performance

- [ ] **Timer page repaints every frame while running** (about 25 ms of work per second, measured):
  - Ring: `transition: --progress-deg 950ms` on the conic gradient never stops. Step it once a second, or draw the ring as an SVG stroke.
  - Flash: `flashFade` / `flashFadeBlue` animate `background-color`. Animate the `opacity` of a coloured overlay instead.
  - Turn both off under `prefers-reduced-motion`.
- [ ] **Library: the selected card's orbit animation** (`card-edge-orbit`) restyles every frame, on top of cards that use `backdrop-filter: blur`. Smaller cost.
- [ ] **Initial bundle is 566 kB, over its 500 kB budget.** Find out what's in the initial chunk (Material/CDK are likely). `timer-library.component.scss` is also about 1.2 kB over its 4 kB budget.
- [ ] **Fonts are requested more than once.** Audiowide loads in both `index.html` and `styles.scss`, and `index.html` has the same preconnect twice. Remove the duplicates and check whether Roboto is used.

## 4. Match the Angular guidelines (`~/.claude/CLAUDE.md`)

- [ ] `AppComponent` imports `HomeComponent`, `TimerSetupComponent`, `RouterLink` and `RouterLinkActive` but doesn't use them (NG8113 build warnings). `importProvidersFrom(FormsModule, MatButtonModule)` in `main.ts` is probably not needed either.
- [ ] Remove the explicit `ChangeDetectionStrategy.OnPush` (it's the default in v22). Move the components the v22 migration marked `Eager` to the default after checking they work.
- [ ] In the `NavComponent` constructor, use `inject()` instead of constructor injection.
- [ ] `infinity-button`: remove `standalone: true` and replace `@Output()` / `EventEmitter` with `output()`. Make `buttonClasses` a `computed()`.
- [ ] `TimerComponent.repeatArray`: change the getter to a `computed()`.
- [ ] `TimerStore`: use `@Service` instead of `@Injectable({ providedIn: 'root' })`.
- [ ] Optional: move the setup form to Signal Forms.

## 5. Accessibility follow-ups

- [ ] Run axe automatically, in a test or in CI, so regressions get caught. Every page passed with 0 violations at the time of writing.
- [ ] Respect `prefers-reduced-motion` for the timer flash and ring, and check the remaining button animations.
- [ ] The home page text says "Click the infinity symbol to navigate". Reword it so it doesn't assume a mouse.
- [ ] Consider announcing phase changes (Work / Rest / Finished) to screen readers with a polite `aria-live` region. Announce changes only, not every second.

## 6. Tooling

- [ ] `.prettierrc.json` uses `prettier-plugin-tailwindcss`, which isn't installed, so Prettier fails. Install the plugin or remove it from the config.
- [ ] Move from Node 25 to Node 24 LTS. Angular 22 doesn't officially support odd-numbered Node versions.
- [ ] Optional: move tests from Karma to Vitest with `ng update @angular/cli --name migrate-karma-to-vitest`.
- [ ] Fix the Sass `@import` deprecation warnings in `styles.scss` (move to `@use`).
- [ ] Install the GitHub CLI (`brew install gh`, then `gh auth login`) so PRs can be raised from the terminal.
