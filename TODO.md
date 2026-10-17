# LoopTimer to-do

Open technical work, highest priority first. Tick items off (or delete them) as they're done. Planned features are in the README's Roadmap.

## 1. Tooling

- [ ] Decide whether to keep `"htmlWhitespaceSensitivity": "ignore"` in `.prettierrc.json`. It lets Prettier strip spaces at the edges of inline text, which broke the timer's "remaining repeats" line until that block was marked `prettier-ignore`. Prettier's default, `"css"`, is safe, but would reformat the templates again.
- [ ] Later: move the tests from Karma to Vitest (`ng update @angular/cli --name migrate-karma-to-vitest`). Saved for another session: it touches every spec (Jasmine spies, `fakeAsync`, matchers), and the axe checks need a real browser for colour contrast, so use Vitest's browser mode rather than jsdom.
