import { clearDatabase } from './app/shared/testing/history-database';

// The history is saved in IndexedDB, which (unlike localStorage) each spec doesn't clear itself
beforeEach(() => clearDatabase());
