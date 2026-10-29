import { clearDatabase } from './app/shared/testing/history-database';

// The history is saved in IndexedDB, which (unlike localStorage) each spec doesn't clear itself
beforeEach(() => clearDatabase());

// `restoreMocks` only undoes spies before the next test, and spec files share a page, so one
// made in a file's last test (e.g. on Date.now) would still be in place as the next file loads
afterEach(() => vi.restoreAllMocks());
