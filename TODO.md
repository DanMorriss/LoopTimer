# LoopTimer to-do

Open work from the October 2026 review. Highest priority first. Tick items off (or delete them) as they're done.

## 1. Tooling

- [ ] Optional: format the codebase with Prettier. It runs now (`npm run format:check`), and 46 files don't match `.prettierrc.json`. Run `npm run format` in a PR of its own, so the formatting churn doesn't hide real changes.
- [ ] Later: move the tests from Karma to Vitest (`ng update @angular/cli --name migrate-karma-to-vitest`). Saved for another session: it touches every spec (Jasmine spies, `fakeAsync`, matchers), and the axe checks need a real browser for colour contrast, so use Vitest's browser mode rather than jsdom.
- [ ] Run `gh auth login` once, so PRs can be raised from the terminal. (The GitHub CLI is installed in `/usr/local/bin`; Homebrew no longer supports Intel Macs, so it came from the official GitHub release.)

## 2. Documentation

- [ ] **Bring `README.md` up to date.** It still describes the original plan rather than the app as built:
  - It says the project was generated with Angular CLI 19.1.4; the app is now on Angular 22.
  - It describes features that don't exist yet: multiple intervals per timer, infinite loops, per-interval alarm sounds and vibration, pause/resume/stop, a save modal, settings and history screens. Mark these as planned, separate from what works today.
  - Describe what the app does now: create, edit and delete timers in the library; work/rest/repeat countdown; timers saved in `localStorage`; the countdown keeps accurate time in background tabs and resumes where it left off after a refresh.
  - Add setup notes: Node 24 (`nvm use` reads `.nvmrc`), `npm ci`, `npm start`, and `npm test` (headless: `ng test --watch=false --browsers=ChromeHeadless`).
  - Remove the generic Angular CLI boilerplate (code scaffolding, e2e) that doesn't apply, and link to `TODO.md`.
