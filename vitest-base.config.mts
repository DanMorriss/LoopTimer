import { defineConfig } from 'vitest/config';

// Extra Vitest settings on top of what `ng test` configures.
export default defineConfig({
    test: {
        // Undo vi.spyOn() spies (e.g. on Date.now) after each test, as Jasmine did
        restoreMocks: true,
    },
});
