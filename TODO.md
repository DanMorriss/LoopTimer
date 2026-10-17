# LoopTimer to-do

Open work from the October 2026 review. Highest priority first. Tick items off (or delete them) as they're done.

## 1. Tooling

- [ ] Optional: format the codebase with Prettier. It runs now (`npm run format:check`), and 46 files don't match `.prettierrc.json`. Run `npm run format` in a PR of its own, so the formatting churn doesn't hide real changes.
- [ ] Later: move the tests from Karma to Vitest (`ng update @angular/cli --name migrate-karma-to-vitest`). Saved for another session: it touches every spec (Jasmine spies, `fakeAsync`, matchers), and the axe checks need a real browser for colour contrast, so use Vitest's browser mode rather than jsdom.
- [ ] Run `gh auth login` once, so PRs can be raised from the terminal. (The GitHub CLI is installed in `/usr/local/bin`; Homebrew no longer supports Intel Macs, so it came from the official GitHub release.)

