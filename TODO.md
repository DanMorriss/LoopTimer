# LoopTimer to-do

Open work from the October 2026 review. Highest priority first. Tick items off (or delete them) as they're done.

## 1. Accessibility follow-ups

- [ ] Run axe automatically, in a test or in CI, so regressions get caught. Every page passed with 0 violations at the time of writing.

## 2. Tooling

- [ ] `.prettierrc.json` uses `prettier-plugin-tailwindcss`, which isn't installed, so Prettier fails. Install the plugin or remove it from the config.
- [ ] Move from Node 25 to Node 24 LTS. Angular 22 doesn't officially support odd-numbered Node versions.
- [ ] Optional: move tests from Karma to Vitest with `ng update @angular/cli --name migrate-karma-to-vitest`.
- [ ] Fix the Sass `@import` deprecation warning from `@import "tailwindcss"` in `styles.scss`. Switching to `@use` won't work for Tailwind v4. Move the Tailwind import into a plain `.css` file listed in `angular.json` styles.
- [ ] Install the GitHub CLI (`brew install gh`, then `gh auth login`) so PRs can be raised from the terminal.

## 3. Documentation

- [ ] **Bring `README.md` up to date.** It still describes the original plan rather than the app as built:
  - It says the project was generated with Angular CLI 19.1.4; the app is now on Angular 22.
  - It describes features that don't exist yet: multiple intervals per timer, infinite loops, per-interval alarm sounds and vibration, pause/resume/stop, a save modal, settings and history screens. Mark these as planned, separate from what works today.
  - Describe what the app does now: create, edit and delete timers in the library; work/rest/repeat countdown; timers saved in `localStorage`; the countdown keeps accurate time in background tabs and resumes where it left off after a refresh.
  - Add setup notes: supported Node version, `npm ci`, `npm start`, and `npm test` (headless: `ng test --watch=false --browsers=ChromeHeadless`).
  - Remove the generic Angular CLI boilerplate (code scaffolding, e2e) that doesn't apply, and link to `TODO.md`.
