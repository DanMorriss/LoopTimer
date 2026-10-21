import { TestBed } from '@angular/core/testing';
import { HistoryEntry } from '../../models/history';
import { Timer } from '../../models/timer';
import { HistoryStore } from '../state/history-store.service';
import { SettingsStore } from '../state/settings-store.service';
import { TimerStore } from '../state/timer-store.service';
import { makeTimer } from '../testing/make-timer';
import { BackupFile, MAX_BACKUP_BYTES } from './backup-file';
import { BackupService } from './backup.service';

function makeEntry(startedAt: number, overrides: Partial<HistoryEntry> = {}): HistoryEntry {
    return {
        id: `${startedAt}-1`,
        timerId: 1,
        title: 'Sprints',
        startedAt,
        endedAt: startedAt + 60_000,
        activeSeconds: 60,
        roundsCompleted: 3,
        totalRounds: 3,
        outcome: 'finished',
        ...overrides,
    };
}

const backupOf = (timers: Timer[], history: HistoryEntry[]) =>
    new Blob([JSON.stringify({ app: 'LoopTimer', version: 1, exportedAt: 1, timers, history })]);

describe('BackupService', () => {
    let backup: BackupService;
    let timers: TimerStore;
    let history: HistoryStore;

    beforeEach(() => {
        localStorage.clear();
        backup = TestBed.inject(BackupService);
        timers = TestBed.inject(TimerStore);
        history = TestBed.inject(HistoryStore);
    });
    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    describe('export', () => {
        it('downloads everything as a dated JSON file', async () => {
            timers.addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });
            history.record(makeEntry(1_000_000));
            TestBed.inject(SettingsStore).update({ weightUnit: 'lb' });
            let blob: Blob | undefined;
            vi.spyOn(URL, 'createObjectURL').mockImplementation((b) => {
                blob = b as Blob;
                return 'blob:backup';
            });
            const click = vi
                .spyOn(HTMLAnchorElement.prototype, 'click')
                .mockImplementation(() => {});

            const name = backup.export();

            expect(name).toMatch(/^looptimer-\d{4}-\d{2}-\d{2}\.json$/);
            expect(click).toHaveBeenCalledTimes(1);
            const link = click.mock.contexts[0] as HTMLAnchorElement;
            expect(link.download).toBe(name);
            expect(link.href).toBe('blob:backup');
            const file: BackupFile = JSON.parse(await blob!.text());
            expect(file.app).toBe('LoopTimer');
            expect(file.timers).toEqual(timers.timers());
            expect(file.history).toEqual(history.entries());
            expect(file.settings.weightUnit).toBe('lb');
        });
    });

    describe('import', () => {
        it('adds timers and workouts that are new, and saves them', async () => {
            const result = await backup.import(
                backupOf([makeTimer({ id: 7, title: 'Legs' })], [makeEntry(1_000_000)])
            );

            expect(result).toEqual({ ok: true, timersAdded: 1, workoutsAdded: 1, skipped: 0 });
            expect(timers.timers().map((t) => t.title)).toEqual(['Legs']);
            expect(history.entries()).toEqual([makeEntry(1_000_000)]);
            expect(JSON.parse(localStorage.getItem('timers')!)).toHaveLength(1);
            expect(JSON.parse(localStorage.getItem('history')!)).toHaveLength(1);
        });

        it('skips timers that are the same as one already here, whatever their id', async () => {
            const here = timers.addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });

            const result = await backup.import(
                backupOf(
                    [makeTimer({ id: 9, title: 'Legs' }), makeTimer({ id: 1, title: 'Arms' })],
                    []
                )
            );

            expect(result).toEqual({ ok: true, timersAdded: 1, workoutsAdded: 0, skipped: 0 });
            // "Arms" had the same id as "Legs" here, so it gets a new one
            expect(timers.timers()).toEqual([here, makeTimer({ id: 2, title: 'Arms' })]);
        });

        it('keeps a timer changed since the backup, and adds the backup one alongside', async () => {
            timers.addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 5 });

            await backup.import(backupOf([makeTimer({ id: 1, title: 'Legs', repeats: 3 })], []));

            expect(timers.timers().map((t) => t.repeats)).toEqual([5, 3]);
        });

        it('leaves workouts already here as they are, notes and all', async () => {
            history.record(makeEntry(1_000_000, { note: 'felt strong' }));

            const result = await backup.import(
                backupOf([], [makeEntry(1_000_000), makeEntry(2_000_000)])
            );

            expect(result).toEqual({ ok: true, timersAdded: 0, workoutsAdded: 1, skipped: 0 });
            expect(history.entries()).toEqual([
                makeEntry(2_000_000),
                makeEntry(1_000_000, { note: 'felt strong' }),
            ]);
        });

        it('brings back a deleted workout, which then stays', async () => {
            history.record(makeEntry(1_000_000));
            history.delete('1000000-1');

            await backup.import(backupOf([], [makeEntry(1_000_000)]));
            // The run logging itself again now updates it, rather than being ignored
            history.record(makeEntry(1_000_000, { roundsCompleted: 2 }));

            expect(history.entries()).toEqual([makeEntry(1_000_000, { roundsCompleted: 2 })]);
        });

        it('adds nothing when everything is already here', async () => {
            timers.addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });
            history.record(makeEntry(1_000_000));

            const result = await backup.import(
                backupOf([makeTimer({ title: 'Legs' })], [makeEntry(1_000_000)])
            );

            expect(result).toEqual({ ok: true, timersAdded: 0, workoutsAdded: 0, skipped: 0 });
        });

        it("leaves this device's settings as they are", async () => {
            const settings = TestBed.inject(SettingsStore);
            const file = new Blob([
                JSON.stringify({
                    app: 'LoopTimer',
                    version: 1,
                    exportedAt: 1,
                    timers: [],
                    history: [],
                    settings: { theme: 'light', weightUnit: 'lb' },
                }),
            ]);

            await backup.import(file);

            expect(settings.theme()).toBe('dark');
            expect(settings.weightUnit()).toBe('kg');
        });

        it('changes nothing when the file is no good', async () => {
            timers.addTimer({ title: 'Legs', steps: makeTimer().steps, repeats: 3 });

            expect(await backup.import(new Blob(['{"app":"Other"}']))).toEqual({
                ok: false,
                problem: 'not-a-backup',
            });
            expect(timers.timers()).toHaveLength(1);
        });

        it('turns down a file far too big to be a backup, without reading it', async () => {
            const file = new Blob(['x']);
            Object.defineProperty(file, 'size', { value: MAX_BACKUP_BYTES + 1 });
            const text = vi.spyOn(file, 'text');

            expect(await backup.import(file)).toEqual({ ok: false, problem: 'too-big' });
            expect(text).not.toHaveBeenCalled();
        });
    });
});
