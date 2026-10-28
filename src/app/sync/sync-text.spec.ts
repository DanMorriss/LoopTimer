import { syncText } from './sync-text';

describe('syncText', () => {
    const status = { syncing: false, lastSyncedAt: null, problem: null };
    const today = new Date(2026, 9, 28, 12, 30).getTime();

    it('says when it last synced: the time today, or the date before', () => {
        expect(syncText(status, today)).toBe('Not synced yet.');
        expect(syncText({ ...status, lastSyncedAt: today - 60_000 }, today)).toMatch(
            /^Synced at .*29.*\.$/
        );
        expect(
            syncText({ ...status, lastSyncedAt: new Date(2026, 9, 27, 9).getTime() }, today)
        ).toMatch(/^Last synced on .*27.*\.$/);
    });

    it("says when it's syncing, or why it couldn't", () => {
        expect(syncText({ ...status, syncing: true }, today)).toBe('Syncing…');
        expect(syncText({ ...status, problem: 'offline' }, today)).toBe(
            "You're offline: it'll sync when you're back online."
        );
        expect(syncText({ ...status, problem: 'failed' }, today)).toBe(
            "It couldn't sync just now, and will try again in a minute."
        );
        expect(syncText({ ...status, problem: 'update' }, today)).toContain('Reload the app');
    });
});
